"""村莊資料抓取服務.

負責從 Travian 頁面抓取村莊相關資訊：
- 資源狀態（木/磚/鐵/糧）
- 倉庫/穀倉容量
- 建築佇列
- 部隊狀態
- 攻擊警報

採用 travian-bot 專案的策略：
- 使用 Playwright 搭配 persistent context 保留 cookies
- 使用 domcontentloaded 等待策略加快頁面載入
- 使用 BeautifulSoup 進行 HTML 解析
"""

import asyncio
import logging
import os
import re
from dataclasses import dataclass
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from app.services.travian_parser import TravianParser

logger = logging.getLogger(__name__)


def _clean_text(text: str) -> str:
    """清理文字中的 Unicode RTL 標記和其他特殊字元."""
    if not text:
        return ""
    import unicodedata

    cleaned = "".join(c for c in text if unicodedata.category(c) not in ("Cf", "Cc"))
    cleaned = cleaned.replace("\u202d", "").replace("\u202c", "")
    cleaned = cleaned.replace("\u200e", "").replace("\u200f", "")
    cleaned = cleaned.replace("\u2066", "").replace("\u2069", "")
    return cleaned.strip()


def _parse_number(text: str) -> int:
    """解析數字，處理逗號和 Unicode 標記."""
    cleaned = _clean_text(text)
    cleaned = cleaned.replace(",", "").replace(" ", "").replace("\u00a0", "")
    cleaned = cleaned.replace("−", "-")
    try:
        return int(cleaned)
    except ValueError:
        match = re.search(r"-?\d+", cleaned)
        if match:
            return int(match.group())
        return 0


@dataclass
class ResourceInfo:
    """資源資訊."""

    wood: int
    clay: int
    iron: int
    crop: int
    free_crop: int
    warehouse_capacity: int
    granary_capacity: int
    wood_production: int
    clay_production: int
    iron_production: int
    crop_production: int


@dataclass
class BuildingQueueItem:
    """建築佇列項目."""

    name: str
    level: int
    finish_time: str
    countdown_seconds: int


@dataclass
class TroopInfo:
    """部隊資訊."""

    unit_id: int
    name: str
    count: int


@dataclass
class TroopMovement:
    """部隊移動."""

    movement_type: str
    description: str
    arrival_time: str
    countdown_seconds: int
    troops: list[TroopInfo]


@dataclass
class VillageInfo:
    """村莊資訊."""

    village_id: str
    name: str
    coordinates: tuple[int, int]
    is_capital: bool
    has_attack: bool


@dataclass
class VillageDetail:
    """村莊詳細資訊."""

    village_id: str
    name: str
    coordinates: tuple[int, int]
    is_capital: bool
    resources: ResourceInfo
    building_queue: list[BuildingQueueItem]
    troops_home: list[TroopInfo]
    troop_movements: list[TroopMovement]
    has_incoming_attack: bool
    attack_count: int


# Stealth script to hide automation detection
STEALTH_SCRIPT = """
() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });

    // Override chrome runtime
    window.chrome = {
        runtime: {}
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );

    // Override plugins to look more real
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-TW', 'zh', 'en-US', 'en']
    });
}
"""


class VillageScraperService:
    """村莊資料抓取服務.

    使用 Playwright 搭配 persistent context 保留登入狀態。
    """

    # 持久化 profile 目錄
    CHROME_PROFILE_DIR = os.path.expanduser("~/.travian_chrome_profile")

    # 登入頁面元素選擇器
    LOGIN_SELECTORS = {
        "email": 'input[name="name"]',
        "password": 'input[type="password"]',
        "submit": 'button[type="submit"]',
    }

    # 已登入的頁面特徵
    LOGGED_IN_INDICATORS = [
        "#sidebarBoxActiveVillage",
        ".villageInfobox",
        "#resourceFieldContainer",
    ]

    def __init__(
        self, login_email: str | None = None, login_password: str | None = None
    ):
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._login_email = login_email
        self._login_password = login_password

    async def _start_browser(self):
        """啟動瀏覽器，使用 persistent context 保留 cookies."""
        if self._context:
            return self._context

        is_headless = os.environ.get("CHROME_HEADLESS", "false").lower() == "true"
        chrome_path = os.environ.get("CHROME_PATH")

        logger.info(
            f"Starting Playwright browser in {'headless' if is_headless else 'normal'} mode"
            + (f" with path: {chrome_path}" if chrome_path else "")
        )

        self._playwright = await async_playwright().start()

        # 確保 profile 目錄存在
        os.makedirs(self.CHROME_PROFILE_DIR, exist_ok=True)

        # 使用 launch_persistent_context 保留 cookies（類似 travian-bot）
        launch_options = {
            "user_data_dir": self.CHROME_PROFILE_DIR,
            "headless": is_headless,
            "viewport": {"width": 1280, "height": 800},
            "locale": "zh-TW",
            "timezone_id": "Asia/Taipei",
        }

        # Docker 環境中需要額外的參數
        if is_headless:
            launch_options["args"] = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-software-rasterizer",
            ]

        # 使用自訂 Chrome 路徑（Docker 環境）
        if chrome_path:
            launch_options["executable_path"] = chrome_path

        self._context = await self._playwright.chromium.launch_persistent_context(
            **launch_options
        )

        # 注入 stealth script 到所有新頁面
        await self._context.add_init_script(STEALTH_SCRIPT)

        # 取得或建立頁面
        pages = self._context.pages
        if pages:
            self._page = pages[0]
        else:
            self._page = await self._context.new_page()

        logger.info("Playwright browser started with persistent context")
        return self._context

    async def _stop_browser(self):
        """停止瀏覽器."""
        if self._context:
            try:
                await self._context.close()
            except Exception as e:
                logger.warning(f"Error closing context: {e}")
            finally:
                self._context = None
                self._page = None

        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception as e:
                logger.warning(f"Error stopping playwright: {e}")
            finally:
                self._playwright = None

    async def _is_login_page(self) -> bool:
        """檢查是否在登入頁面."""
        if not self._page:
            return False
        try:
            password_input = await self._page.query_selector(
                self.LOGIN_SELECTORS["password"]
            )
            return password_input is not None
        except Exception:
            return False

    async def _is_logged_in(self) -> bool:
        """檢查是否已登入."""
        if not self._page:
            return False
        for selector in self.LOGGED_IN_INDICATORS:
            try:
                element = await self._page.query_selector(selector)
                if element:
                    return True
            except Exception:
                pass
        return False

    async def _login(self) -> bool:
        """執行登入流程."""
        if not self._page or not self._login_email or not self._login_password:
            logger.warning("無法登入：缺少憑證")
            return False

        logger.info("正在自動登入...")

        try:
            await asyncio.sleep(2)

            # 輸入 email（模擬人類輸入）
            email_input = await self._page.query_selector(self.LOGIN_SELECTORS["email"])
            if email_input:
                await email_input.click()
                await email_input.fill("")
                for char in self._login_email:
                    await email_input.type(char, delay=80)
                logger.info("已輸入 Email")

            await asyncio.sleep(0.5)

            # 輸入密碼
            password_input = await self._page.query_selector(
                self.LOGIN_SELECTORS["password"]
            )
            if password_input:
                await password_input.click()
                await password_input.fill("")
                for char in self._login_password:
                    await password_input.type(char, delay=80)
                logger.info("已輸入密碼")

            await asyncio.sleep(0.5)

            # 點擊登入按鈕
            submit_btn = await self._page.query_selector(self.LOGIN_SELECTORS["submit"])
            if submit_btn:
                await submit_btn.click()
                logger.info("點擊登入按鈕")

            # 等待登入完成
            await asyncio.sleep(5)

            if await self._is_logged_in():
                logger.info("登入成功！")
                return True
            else:
                logger.warning("登入可能失敗，繼續嘗試抓取")
                return False

        except Exception as e:
            logger.error(f"登入失敗: {e}")
            return False

    async def _navigate_fast(
        self, url: str, wait_for_element: str | None = None
    ) -> str:
        """快速導航並返回 HTML.

        採用 travian-bot 的策略：
        - 使用 domcontentloaded 等待（比 networkidle 更快）
        - 輪詢檢查特定元素是否存在

        Args:
            url: 目標 URL
            wait_for_element: 等待特定元素出現的 CSS 選擇器

        Returns:
            頁面 HTML 內容
        """
        print(f"[SCRAPER] _navigate_fast: url={url}", flush=True)

        if not self._context:
            await self._start_browser()

        if not self._page:
            self._page = await self._context.new_page()

        # 使用 domcontentloaded 等待（類似 travian-bot）
        await self._page.goto(url, wait_until="domcontentloaded")

        # 如果需要，等待特定元素出現
        if wait_for_element:
            try:
                await self._page.wait_for_selector(wait_for_element, timeout=10000)
                print(f"[SCRAPER] Element {wait_for_element} found", flush=True)
            except Exception:
                print(
                    f"[SCRAPER] Element {wait_for_element} not found within timeout",
                    flush=True,
                )

        # 處理登入（如果需要）
        is_login = await self._is_login_page()
        if is_login:
            logger.info("偵測到登入頁面，正在自動登入...")
            await self._login()
            await self._page.goto(url, wait_until="domcontentloaded")
            if wait_for_element:
                try:
                    await self._page.wait_for_selector(wait_for_element, timeout=10000)
                except Exception:
                    pass

        return await self._page.content()

    async def _navigate(self, url: str, wait_for_sidebar: bool = True):
        """導航到 URL，自動處理登入.

        Args:
            url: 目標 URL
            wait_for_sidebar: 是否等待 sidebar 村莊列表載入完成
        """
        print(f"[SCRAPER] _navigate: url={url}", flush=True)

        if not self._context:
            await self._start_browser()

        if not self._page:
            self._page = await self._context.new_page()

        await self._page.goto(url, wait_until="domcontentloaded")
        print("[SCRAPER] _navigate: page loaded (domcontentloaded)", flush=True)

        # 嘗試處理 GDPR consent 彈窗
        try:
            consent_buttons = [
                'button[aria-label*="accept"]',
                'button[aria-label*="Accept"]',
                "button.cmptxt_btn_yes",
                "#cmpwelcomebtnyes",
                "a.cmpboxbtnyes",
            ]
            for selector in consent_buttons:
                btn = await self._page.query_selector(selector)
                if btn:
                    print(f"[SCRAPER] Found consent button: {selector}", flush=True)
                    await btn.click()
                    await asyncio.sleep(1)
                    break
        except Exception as e:
            print(f"[SCRAPER] Consent handling error: {e}", flush=True)

        # 檢查是否在登入頁面
        is_login = await self._is_login_page()
        print(f"[SCRAPER] _navigate: is_login_page={is_login}", flush=True)
        if is_login:
            logger.info("偵測到登入頁面，正在自動登入...")
            print("[SCRAPER] _navigate: Starting login...", flush=True)
            login_success = await self._login()
            print(f"[SCRAPER] _navigate: login_success={login_success}", flush=True)
            # 重新導航到目標頁面
            print("[SCRAPER] _navigate: Re-navigating after login...", flush=True)
            await self._page.goto(url, wait_until="domcontentloaded")

        # 等待 sidebar 載入完成
        if wait_for_sidebar:
            try:
                await self._page.wait_for_selector(
                    "#sidebarBoxVillageList .listEntry", timeout=15000
                )
                print("[SCRAPER] Sidebar loaded", flush=True)
            except Exception:
                print("[SCRAPER] WARNING: Sidebar not found within timeout", flush=True)

        # 檢查是否已登入
        is_logged_in = await self._is_logged_in()
        print(f"[SCRAPER] _navigate: is_logged_in={is_logged_in}", flush=True)

        return self._page

    async def _get_page_html(self) -> str:
        """取得當前頁面的完整 HTML 內容."""
        if not self._page:
            return ""
        try:
            return await self._page.content()
        except Exception as e:
            logger.warning(f"Failed to get page content: {e}")
            return ""

    async def get_village_list(self, server_url: str) -> list[VillageInfo]:
        """取得村莊列表.

        使用 TravianParser 從 HTML 解析村莊列表。

        Args:
            server_url: 伺服器 URL

        Returns:
            村莊列表
        """
        try:
            # 導航並等待 sidebar 出現
            await self._navigate(f"{server_url}/dorf1.php")
            html = await self._get_page_html()

            # 使用 TravianParser 解析
            parsed_villages = TravianParser.parse_village_list(html)
            print(
                f"[SCRAPER] TravianParser found {len(parsed_villages)} villages",
                flush=True,
            )

            # 轉換為 VillageInfo
            villages = []
            for pv in parsed_villages:
                villages.append(
                    VillageInfo(
                        village_id=pv.village_id,
                        name=pv.name,
                        coordinates=(pv.x, pv.y),
                        is_capital=pv.is_capital,
                        has_attack=pv.has_attack,
                    )
                )
                logger.info(
                    f"Added village: {pv.name} ({pv.x}|{pv.y}), attack={pv.has_attack}"
                )

            print(f"[SCRAPER] Total villages found: {len(villages)}", flush=True)
            return villages

        except Exception as e:
            logger.error(f"取得村莊列表失敗: {e}")
            print(f"[SCRAPER] get_village_list error: {e}", flush=True)
            import traceback

            traceback.print_exc()
            return []

    async def get_village_detail(
        self, server_url: str, village_id: str
    ) -> VillageDetail | None:
        """取得村莊詳細資訊.

        採用 travian-bot 的多頁面收集策略：
        1. dorf1.php - 資源、建築佇列、村莊基本資訊
        2. build.php?gid=16&tt=1 - 本村部隊
        3. build.php?gid=16&tt=3 - 來襲部隊

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID

        Returns:
            村莊詳細資訊
        """
        try:
            print(
                f"[SCRAPER] get_village_detail: Starting for village {village_id}",
                flush=True,
            )

            # Step 1: 導航到 dorf1 取得資源和建築佇列
            dorf1_html = await self._navigate_fast(
                f"{server_url}/dorf1.php?newdid={village_id}", wait_for_element="#l1"
            )

            # 使用 TravianParser 解析資源
            parsed_resources = TravianParser.parse_resources(dorf1_html)
            resources = ResourceInfo(
                wood=parsed_resources.wood,
                clay=parsed_resources.clay,
                iron=parsed_resources.iron,
                crop=parsed_resources.crop,
                free_crop=parsed_resources.free_crop,
                warehouse_capacity=parsed_resources.warehouse_capacity,
                granary_capacity=parsed_resources.granary_capacity,
                wood_production=parsed_resources.wood_production,
                clay_production=parsed_resources.clay_production,
                iron_production=parsed_resources.iron_production,
                crop_production=parsed_resources.crop_production,
            )
            print(
                f"[SCRAPER] Resources: wood={resources.wood}, production=({resources.wood_production}/h)",
                flush=True,
            )

            # 解析建築佇列
            parsed_queue = TravianParser.parse_building_queue(dorf1_html)
            building_queue = [
                BuildingQueueItem(
                    name=pq.name,
                    level=pq.level,
                    finish_time=pq.finish_time,
                    countdown_seconds=pq.countdown_seconds,
                )
                for pq in parsed_queue
            ]
            print(f"[SCRAPER] Building queue: {len(building_queue)} items", flush=True)

            # 解析村莊資訊
            parsed_villages = TravianParser.parse_village_list(dorf1_html)
            name = "未知村莊"
            coordinates = (0, 0)
            is_capital = False

            # 找到當前村莊（active）
            for pv in parsed_villages:
                if pv.village_id == village_id:
                    name = pv.name
                    coordinates = (pv.x, pv.y)
                    is_capital = pv.is_capital
                    break

            # Step 2: 導航到集結點 tt=1 取得本村部隊
            rally_html = await self._navigate_fast(
                f"{server_url}/build.php?gid=16&tt=1&newdid={village_id}",
                wait_for_element="table.troop_details",
            )
            parsed_troops = TravianParser.parse_own_troops(rally_html)
            troops_home = [
                TroopInfo(unit_id=pt.unit_id, name=pt.name, count=pt.count)
                for pt in parsed_troops.own_troops
            ]
            print(f"[SCRAPER] Troops home: {len(troops_home)}", flush=True)

            # 收集所有部隊移動
            troop_movements: list[TroopMovement] = []

            # Step 3: 導航到集結點 tt=2 取得外出部隊
            outgoing_html = await self._navigate_fast(
                f"{server_url}/build.php?gid=16&tt=2&newdid={village_id}",
                wait_for_element=None,
            )
            parsed_outgoing = TravianParser.parse_troops_out(outgoing_html)
            for pm in parsed_outgoing:
                troop_movements.append(
                    TroopMovement(
                        movement_type="outgoing",
                        description=f"{pm.origin} → {pm.destination}",
                        arrival_time=pm.arrival_time,
                        countdown_seconds=pm.countdown_seconds,
                        troops=[
                            TroopInfo(unit_id=t.unit_id, name=t.name, count=t.count)
                            for t in pm.troops
                        ],
                    )
                )
            print(f"[SCRAPER] Troops out: {len(parsed_outgoing)}", flush=True)

            # Step 4: 導航到集結點 tt=3 取得來襲部隊
            incoming_html = await self._navigate_fast(
                f"{server_url}/build.php?gid=16&tt=3&newdid={village_id}",
                wait_for_element=None,
            )
            parsed_incoming = TravianParser.parse_incoming(incoming_html)
            for pm in parsed_incoming:
                troop_movements.append(
                    TroopMovement(
                        movement_type=pm.movement_type,
                        description=f"{pm.origin} → {pm.destination}",
                        arrival_time=pm.arrival_time,
                        countdown_seconds=pm.countdown_seconds,
                        troops=[
                            TroopInfo(unit_id=t.unit_id, name=t.name, count=t.count)
                            for t in pm.troops
                        ],
                    )
                )
            print(f"[SCRAPER] Incoming: {len(parsed_incoming)}", flush=True)

            # Step 5: 從 tt=1 頁面的解析結果中取得增援他村和綠洲的部隊
            # TravianParser.parse_own_troops 已經解析了這些資訊
            for pm in parsed_troops.reinforcing_others:
                troop_movements.append(
                    TroopMovement(
                        movement_type="reinforcing_others",
                        description=f"增援: {pm.origin} → {pm.destination}",
                        arrival_time="",
                        countdown_seconds=0,
                        troops=[
                            TroopInfo(unit_id=t.unit_id, name=t.name, count=t.count)
                            for t in pm.troops
                        ],
                    )
                )

            for oasis_data in parsed_troops.in_oases:
                for pm in oasis_data.troops:
                    troop_movements.append(
                        TroopMovement(
                            movement_type="in_oasis",
                            description=f"綠洲: {oasis_data.oasis}",
                            arrival_time="",
                            countdown_seconds=0,
                            troops=[
                                TroopInfo(unit_id=t.unit_id, name=t.name, count=t.count)
                                for t in pm.troops
                            ],
                        )
                    )

            print(
                f"[SCRAPER] Total troop movements: {len(troop_movements)}", flush=True
            )

            # 計算攻擊數量
            incoming_attacks = [
                m for m in troop_movements if m.movement_type == "incoming_attack"
            ]

            return VillageDetail(
                village_id=village_id,
                name=name,
                coordinates=coordinates,
                is_capital=is_capital,
                resources=resources,
                building_queue=building_queue,
                troops_home=troops_home,
                troop_movements=troop_movements,
                has_incoming_attack=len(incoming_attacks) > 0,
                attack_count=len(incoming_attacks),
            )

        except Exception as e:
            logger.error(f"取得村莊詳細資訊失敗: {e}")
            import traceback

            traceback.print_exc()
            return None

    async def get_all_villages_summary(self, server_url: str) -> dict[str, Any]:
        """取得所有村莊摘要.

        Args:
            server_url: 伺服器 URL

        Returns:
            所有村莊的摘要資訊
        """
        try:
            await self._start_browser()

            # 取得村莊列表
            villages = await self.get_village_list(server_url)

            # 計算被攻擊的村莊數量
            attacked_villages = [v for v in villages if v.has_attack]

            # 取得第一個村莊的詳細資訊作為範例
            first_village_detail = None
            if villages:
                first_village_detail = await self.get_village_detail(
                    server_url, villages[0].village_id
                )

            return {
                "total_villages": len(villages),
                "attacked_villages": len(attacked_villages),
                "villages": [
                    {
                        "village_id": v.village_id,
                        "name": v.name,
                        "coordinates": v.coordinates,
                        "is_capital": v.is_capital,
                        "has_attack": v.has_attack,
                    }
                    for v in villages
                ],
                "first_village_detail": (
                    {
                        "village_id": first_village_detail.village_id,
                        "name": first_village_detail.name,
                        "resources": {
                            "wood": first_village_detail.resources.wood,
                            "clay": first_village_detail.resources.clay,
                            "iron": first_village_detail.resources.iron,
                            "crop": first_village_detail.resources.crop,
                            "warehouse_capacity": first_village_detail.resources.warehouse_capacity,
                            "granary_capacity": first_village_detail.resources.granary_capacity,
                        },
                        "building_queue": [
                            {
                                "name": b.name,
                                "level": b.level,
                                "countdown_seconds": b.countdown_seconds,
                            }
                            for b in first_village_detail.building_queue
                        ],
                        "troops_home_count": sum(
                            t.count for t in first_village_detail.troops_home
                        ),
                        "troop_movements_count": len(
                            first_village_detail.troop_movements
                        ),
                        "attack_count": first_village_detail.attack_count,
                    }
                    if first_village_detail
                    else None
                ),
            }

        except Exception as e:
            logger.error(f"取得所有村莊摘要失敗: {e}")
            return {"error": str(e)}

        finally:
            await self._stop_browser()
