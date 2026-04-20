"""Travian 執行引擎測試腳本.

互動式測試各個瀏覽器自動化功能。
執行方式：python scripts/test_execution_engines.py
"""

import asyncio
import os
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

# 不需要 backend 環境，直接使用 nodriver
import nodriver as uc


# ============ 設定 ============
# 請修改為你的伺服器 URL
SERVER_URL = "https://nys.x1.asia.travian.com"

# 村莊 ID（可選，從遊戲 URL 取得，例如 newdid=12345）
VILLAGE_ID = None  # 或填入如 "12345"

# 登入憑證（留空則在需要時提示輸入）
LOGIN_EMAIL = ""  # 你的 email
LOGIN_PASSWORD = ""  # 你的密碼

# Chrome profile 目錄（與 collect_travian_info.py 相同）
CHROME_PROFILE_DIR = os.path.expanduser("~/.travian_chrome_profile")

# 截圖目錄
SCREENSHOT_DIR = Path(__file__).parent / "test_screenshots"


# ============ 基礎類別 ============
@dataclass
class ExecutionResult:
    """執行結果."""
    success: bool
    message: str | None = None
    error: str | None = None
    screenshot_path: str | None = None
    duration_ms: int | None = None
    details: dict[str, Any] | None = None


class HumanBehavior:
    """模擬人類行為."""

    @staticmethod
    def get_random_delay() -> float:
        """產生隨機延遲 (1-3秒)."""
        return random.gauss(2.0, 0.5)

    @staticmethod
    def get_typing_delay() -> float:
        """產生打字間隔."""
        return random.uniform(0.05, 0.15)


class BaseEngine:
    """基礎引擎."""

    # 登入頁面元素選擇器
    LOGIN_SELECTORS = {
        "email": 'input[name="name"]',
        "password": 'input[type="password"]',
        "submit": 'button[type="submit"]',
    }

    # 已登入的頁面特徵（村莊資訊框）
    LOGGED_IN_INDICATORS = [
        "#sidebarBoxActiveVillage",
        ".villageInfobox",
        "#resourceFieldContainer",
    ]

    def __init__(self):
        self.human = HumanBehavior()
        self._browser = None
        self._page = None
        self._credentials = None

    async def _start_browser(self):
        """啟動瀏覽器."""
        self._browser = await uc.start(
            headless=False,
            user_data_dir=CHROME_PROFILE_DIR,
        )
        return self._browser

    async def _stop_browser(self):
        """停止瀏覽器."""
        if self._browser:
            try:
                self._browser.stop()
            except Exception:
                pass
            self._browser = None
            self._page = None

    async def _is_login_page(self) -> bool:
        """檢查是否在登入頁面（透過偵測登入表單元素）."""
        if not self._page:
            return False

        try:
            # 檢查是否有登入表單的密碼輸入框
            password_input = await self._page.select(self.LOGIN_SELECTORS["password"])
            if password_input:
                return True
        except Exception:
            pass

        return False

    async def _is_logged_in(self) -> bool:
        """檢查是否已登入（透過偵測遊戲 UI 元素）."""
        if not self._page:
            return False

        for selector in self.LOGGED_IN_INDICATORS:
            try:
                element = await self._page.select(selector)
                if element:
                    return True
            except Exception:
                pass

        return False

    async def _get_credentials(self) -> tuple[str, str]:
        """取得登入憑證（從設定或提示輸入）."""
        if self._credentials:
            return self._credentials

        email = LOGIN_EMAIL
        password = LOGIN_PASSWORD

        if not email or not password:
            print("\n需要登入 Travian")
            if not email:
                email = input("Email: ")
            if not password:
                import getpass
                password = getpass.getpass("密碼: ")

        self._credentials = (email, password)
        return self._credentials

    async def _login(self) -> bool:
        """執行登入流程."""
        if not self._page:
            return False

        print("正在登入...")

        try:
            email, password = await self._get_credentials()

            # 等待頁面載入
            await asyncio.sleep(2)

            # 輸入 email
            email_input = await self._page.select(self.LOGIN_SELECTORS["email"])
            if email_input:
                await email_input.clear_input()
                await asyncio.sleep(0.3)
                for char in email:
                    await email_input.send_keys(char)
                    await asyncio.sleep(self.human.get_typing_delay())
                print("  已輸入 Email")

            await asyncio.sleep(0.5)

            # 輸入密碼
            password_input = await self._page.select(self.LOGIN_SELECTORS["password"])
            if password_input:
                await password_input.clear_input()
                await asyncio.sleep(0.3)
                for char in password:
                    await password_input.send_keys(char)
                    await asyncio.sleep(self.human.get_typing_delay())
                print("  已輸入密碼")

            await asyncio.sleep(0.5)

            # 點擊登入按鈕
            submit_btn = await self._page.select(self.LOGIN_SELECTORS["submit"])
            if submit_btn:
                await submit_btn.click()
                print("  點擊登入按鈕")

            # 等待登入完成
            await asyncio.sleep(5)

            # 檢查是否登入成功
            if await self._is_logged_in():
                print("  登入成功！")
                return True
            else:
                current_url = str(self._page.url) if hasattr(self._page, "url") else ""
                print(f"  登入後 URL: {current_url}")
                # 可能需要手動處理驗證碼
                if await self._is_login_page():
                    print("  登入失敗，請手動登入後按 Enter...")
                    input()
                return True

        except Exception as e:
            print(f"  登入失敗: {e}")
            print("  請手動登入後按 Enter...")
            input()
            return True

    async def _navigate(self, url: str):
        """導航到 URL，自動處理登入."""
        if not self._browser:
            await self._start_browser()
        self._page = await self._browser.get(url)
        await asyncio.sleep(self.human.get_random_delay())

        # 檢查是否在登入頁面（透過偵測登入表單）
        if await self._is_login_page():
            print("偵測到登入頁面，正在自動登入...")
            await self._login()
            # 重新導航到目標頁面
            self._page = await self._browser.get(url)
            await asyncio.sleep(self.human.get_random_delay())

        return self._page

    async def _click(self, element):
        """點擊元素."""
        await asyncio.sleep(self.human.get_random_delay() * 0.5)
        await element.click()

    async def _type_text(self, element, text: str):
        """輸入文字."""
        await element.clear_input()
        await asyncio.sleep(0.3)
        for char in text:
            await element.send_keys(char)
            await asyncio.sleep(self.human.get_typing_delay())

    async def _wait_for_element(self, selector: str, timeout: int = 10):
        """等待元素出現."""
        if not self._page:
            return None
        start = datetime.now()
        while (datetime.now() - start).total_seconds() < timeout:
            try:
                element = await self._page.select(selector)
                if element:
                    return element
            except Exception:
                pass
            await asyncio.sleep(0.5)
        return None

    async def _take_screenshot(self, name: str) -> str | None:
        """截圖."""
        if not self._page:
            return None
        try:
            SCREENSHOT_DIR.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = SCREENSHOT_DIR / f"{name}_{timestamp}.png"
            await self._page.save_screenshot(str(filepath))
            return str(filepath)
        except Exception as e:
            print(f"截圖失敗: {e}")
            return None


# ============ Keep-alive 引擎 ============
class KeepAliveEngine(BaseEngine):
    """Keep-alive 測試."""

    async def execute(self, server_url: str) -> ExecutionResult:
        start_time = datetime.now()
        try:
            # _navigate 會自動處理登出並重新登入
            await self._navigate(f"{server_url}/dorf1.php")

            # 檢查村莊元素（確認已登入）
            village = await self._wait_for_element("#sidebarBoxActiveVillage", timeout=5)
            if not village:
                village = await self._wait_for_element(".villageInfobox", timeout=3)

            if not village:
                return ExecutionResult(
                    success=False,
                    error="找不到村莊資訊，可能未登入",
                    details={"session_expired": True},
                )

            screenshot = await self._take_screenshot("keepalive_success")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message="Keep-alive 成功",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={"session_expired": False},
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 攻擊偵測引擎 ============
class AttackCheckEngine(BaseEngine):
    """攻擊偵測測試."""

    # 種族判定 (根據兵種 ID)
    TRIBE_MAP = {
        range(1, 11): "羅馬",
        range(11, 21): "條頓",
        range(21, 31): "高盧",
        range(31, 41): "自然界",
        range(41, 51): "納塔人",
        range(51, 61): "埃及",
        range(61, 71): "匈奴",
    }

    async def execute(self, server_url: str) -> ExecutionResult:
        """偵測是否有村莊被攻擊."""
        start_time = datetime.now()
        try:
            await self._navigate(f"{server_url}/dorf1.php")
            await asyncio.sleep(2)

            attacked_villages = []
            attack_count = 0

            # 檢查村莊列表 sidebar 中的攻擊標記
            try:
                incoming_troops = await self._page.select_all("span.incomingTroops")
                if incoming_troops:
                    for elem in incoming_troops:
                        attack_svg = await elem.query_selector("svg.attack")
                        if attack_svg:
                            attack_count += 1
                            village_id = await elem.get_attribute("data-id")
                            if village_id:
                                attacked_villages.append(village_id)
                                print(f"    偵測到攻擊: 村莊 ID {village_id}")
            except Exception as e:
                print(f"    檢查村莊列表攻擊標記失敗: {e}")

            screenshot = await self._take_screenshot("attack_check")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"偵測到 {attack_count} 個村莊被攻擊" if attack_count > 0 else "沒有偵測到攻擊",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={
                    "has_attacks": attack_count > 0,
                    "attack_count": attack_count,
                    "attacked_village_ids": attacked_villages,
                },
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()

    async def get_attack_details(self, server_url: str, village_id: str) -> ExecutionResult:
        """獲取被攻擊村莊的詳細攻擊資訊."""
        start_time = datetime.now()
        try:
            # 導航到村莊的集結點概覽頁面
            rally_url = f"{server_url}/build.php?gid=16&tt=1&newdid={village_id}"
            await self._navigate(rally_url)
            await asyncio.sleep(2)

            incoming_attacks = []

            # 查找所有攻擊的 table.troop_details
            troop_tables = await self._page.select_all("table.troop_details")

            for table in troop_tables:
                try:
                    # 檢查是否是進攻（有 markAttack 連結）
                    mark_attack = await table.query_selector("a.markAttack")
                    if not mark_attack:
                        continue

                    attack_info = {}

                    # 取得攻擊 ID
                    onclick = await mark_attack.get_attribute("onclick")
                    if onclick and "markAttackSymbol" in onclick:
                        import re
                        match = re.search(r"markAttackSymbol\((\d+)\)", onclick)
                        if match:
                            attack_info["attack_id"] = match.group(1)

                    # 取得攻擊描述
                    headline = await table.query_selector("td.troopHeadline a:not(.markAttack)")
                    if headline:
                        attack_info["description"] = await headline.text()

                    # 取得攻擊者座標
                    coords = await table.query_selector("th.coords .coordinates")
                    if coords:
                        coord_x = await coords.query_selector(".coordinateX")
                        coord_y = await coords.query_selector(".coordinateY")
                        if coord_x and coord_y:
                            x_text = await coord_x.text()
                            y_text = await coord_y.text()
                            import re
                            x_match = re.search(r"[−-]?\d+", x_text)
                            y_match = re.search(r"[−-]?\d+", y_text)
                            if x_match and y_match:
                                attack_info["attacker_x"] = int(x_match.group().replace("−", "-"))
                                attack_info["attacker_y"] = int(y_match.group().replace("−", "-"))

                    # 取得兵種資訊
                    unit_icons = await table.query_selector_all("td.uniticon img.unit")
                    troops = []
                    tribe = None

                    for icon in unit_icons:
                        class_attr = await icon.get_attribute("class")
                        alt_text = await icon.get_attribute("alt")
                        if class_attr:
                            import re
                            match = re.search(r"u(\d+)", class_attr)
                            if match:
                                unit_id = int(match.group(1))
                                troops.append({"unit_id": unit_id, "name": alt_text or f"u{unit_id}"})
                                if tribe is None:
                                    for id_range, tribe_name in self.TRIBE_MAP.items():
                                        if unit_id in id_range:
                                            tribe = tribe_name
                                            break

                    attack_info["troops"] = troops
                    attack_info["tribe"] = tribe

                    # 取得兵種數量
                    unit_counts = await table.query_selector_all("tbody.units.last td.unit")
                    troop_counts = []
                    for i, count_td in enumerate(unit_counts):
                        count_text = await count_td.text()
                        try:
                            count = int(count_text.strip())
                            if count > 0 and i < len(troops):
                                troops[i]["count"] = count
                                troop_counts.append({"name": troops[i]["name"], "count": count})
                        except ValueError:
                            pass

                    attack_info["troop_counts"] = troop_counts

                    # 取得到達時間
                    infos_tbody = await table.query_selector("tbody.infos")
                    if infos_tbody:
                        timer = await infos_tbody.query_selector('span.timer[counting="down"]')
                        if timer:
                            countdown_text = await timer.text()
                            countdown_value = await timer.get_attribute("value")
                            attack_info["countdown_text"] = countdown_text
                            attack_info["countdown_seconds"] = int(countdown_value) if countdown_value else None

                        at_div = await infos_tbody.query_selector("div.at span")
                        if at_div:
                            arrival_time = await at_div.text()
                            attack_info["arrival_time"] = arrival_time.strip()

                    incoming_attacks.append(attack_info)
                    print(f"    攻擊波次: {attack_info.get('description', '未知')}")
                    print(f"      種族: {tribe}")
                    print(f"      兵力: {troop_counts}")
                    print(f"      到達: {attack_info.get('arrival_time', '未知')} ({attack_info.get('countdown_text', '?')})")

                except Exception as e:
                    print(f"    解析攻擊詳情失敗: {e}")
                    continue

            screenshot = await self._take_screenshot(f"attack_details_{village_id}")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"解析到 {len(incoming_attacks)} 波攻擊",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={
                    "village_id": village_id,
                    "attack_waves": len(incoming_attacks),
                    "attacks": incoming_attacks,
                },
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 資源運送引擎 ============
class TransportEngine(BaseEngine):
    """資源運送測試."""

    async def execute(
        self, server_url: str, village_id: str | None,
        target_x: int, target_y: int,
        wood: int, clay: int, iron: int, crop: int
    ) -> ExecutionResult:
        start_time = datetime.now()
        try:
            # 導航到市場運送頁面
            url = f"{server_url}/build.php?gid=17&t=5"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            # 輸入座標
            x_input = await self._wait_for_element("input[name='x']", timeout=5)
            y_input = await self._wait_for_element("input[name='y']", timeout=5)
            if not x_input or not y_input:
                return ExecutionResult(success=False, error="找不到座標輸入框")

            await self._type_text(x_input, str(target_x))
            await self._type_text(y_input, str(target_y))

            # 輸入資源
            resources = {"lumber": wood, "clay": clay, "iron": iron, "crop": crop}
            for name, amount in resources.items():
                if amount > 0:
                    res_input = await self._wait_for_element(f"input[name='{name}']", timeout=3)
                    if res_input:
                        await self._type_text(res_input, str(amount))

            await asyncio.sleep(1)

            # 點擊送出
            submit_btn = await self._wait_for_element("button[type='submit']", timeout=5)
            if not submit_btn:
                return ExecutionResult(success=False, error="找不到送出按鈕")

            await self._click(submit_btn)
            await asyncio.sleep(2)

            # 確認頁面
            confirm_btn = await self._wait_for_element("button[type='submit']", timeout=3)
            if confirm_btn:
                await self._click(confirm_btn)
                await asyncio.sleep(2)

            screenshot = await self._take_screenshot(f"transport_{target_x}_{target_y}")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"運送到 ({target_x}, {target_y}) 完成",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 資源田升級引擎 ============
class ResourceFieldEngine(BaseEngine):
    """資源田升級測試."""

    async def execute(self, server_url: str, village_id: str | None, position: int) -> ExecutionResult:
        start_time = datetime.now()
        try:
            # 導航到資源田頁面
            url = f"{server_url}/build.php?id={position}"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            # 找升級按鈕
            upgrade_selectors = [
                ".upgradeButtonsContainer .section1 button.textButtonV1:not(.gold)",
                "button.textButtonV1.green:not(.gold)",
                ".build:not(.gold)",
            ]

            upgrade_btn = None
            for selector in upgrade_selectors:
                upgrade_btn = await self._wait_for_element(selector, timeout=3)
                if upgrade_btn:
                    break

            if not upgrade_btn:
                screenshot = await self._take_screenshot("resource_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到升級按鈕（可能資源不足或已達上限）",
                    screenshot_path=screenshot,
                )

            await self._click(upgrade_btn)
            await asyncio.sleep(2)

            screenshot = await self._take_screenshot(f"resource_pos{position}")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"資源田位置 {position} 升級成功",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 建築升級引擎 ============
class BuildEngine(BaseEngine):
    """建築升級測試."""

    async def execute(self, server_url: str, village_id: str | None, position: int) -> ExecutionResult:
        start_time = datetime.now()
        try:
            # 導航到建築頁面
            url = f"{server_url}/build.php?id={position}"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            # 找升級按鈕
            upgrade_selectors = [
                ".upgradeButtonsContainer .section1 button.textButtonV1:not(.gold)",
                "button.textButtonV1.green:not(.gold)",
                ".build:not(.gold)",
            ]

            upgrade_btn = None
            for selector in upgrade_selectors:
                upgrade_btn = await self._wait_for_element(selector, timeout=3)
                if upgrade_btn:
                    break

            if not upgrade_btn:
                screenshot = await self._take_screenshot("build_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到升級按鈕（可能資源不足或已達上限）",
                    screenshot_path=screenshot,
                )

            await self._click(upgrade_btn)
            await asyncio.sleep(2)

            screenshot = await self._take_screenshot(f"build_pos{position}")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"建築位置 {position} 升級成功",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 農場清單引擎 ============
class FarmListEngine(BaseEngine):
    """農場清單測試."""

    async def execute_single(self, server_url: str, village_id: str | None, list_id: str | None = None) -> ExecutionResult:
        start_time = datetime.now()
        try:
            url = f"{server_url}/build.php?gid=16&tt=99"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            # 找啟動按鈕
            if list_id:
                btn = await self._wait_for_element(f"[data-list='{list_id}'] button.startFarmList", timeout=5)
            else:
                btn = await self._wait_for_element("button.startFarmList", timeout=5)

            if not btn:
                screenshot = await self._take_screenshot("farmlist_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到農場清單啟動按鈕",
                    screenshot_path=screenshot,
                )

            await self._click(btn)
            await asyncio.sleep(2)

            screenshot = await self._take_screenshot("farmlist_single")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"農場清單 {list_id or '(第一個)'} 啟動成功",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()

    async def execute_all(self, server_url: str, village_id: str | None) -> ExecutionResult:
        start_time = datetime.now()
        try:
            url = f"{server_url}/build.php?gid=16&tt=99"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            btn = await self._wait_for_element("button.startAllFarmLists", timeout=5)
            if not btn:
                screenshot = await self._take_screenshot("farmlist_no_startall")
                return ExecutionResult(
                    success=False,
                    error="找不到「啟動全部」按鈕",
                    screenshot_path=screenshot,
                )

            await self._click(btn)
            await asyncio.sleep(2)

            screenshot = await self._take_screenshot("farmlist_all")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message="所有農場清單啟動成功",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 發兵引擎 ============
class SendTroopsEngine(BaseEngine):
    """發兵測試."""

    async def execute(
        self, server_url: str, village_id: str | None,
        target_x: int, target_y: int,
        troops: dict[str, int],
        event_type: str = "4",  # 4=搶奪, 3=攻擊
    ) -> ExecutionResult:
        start_time = datetime.now()
        try:
            url = f"{server_url}/build.php?gid=16&tt=2"
            if village_id:
                url += f"&newdid={village_id}"
            await self._navigate(url)

            # 輸入座標
            x_input = await self._wait_for_element("#xCoordInput", timeout=5)
            y_input = await self._wait_for_element("#yCoordInput", timeout=5)
            if not x_input or not y_input:
                return ExecutionResult(success=False, error="找不到座標輸入框")

            await self._type_text(x_input, str(target_x))
            await self._type_text(y_input, str(target_y))

            # 輸入部隊
            for troop_key, count in troops.items():
                if count > 0:
                    input_name = f"troop[{troop_key}]"
                    troop_input = await self._wait_for_element(f"input[name='{input_name}']", timeout=2)
                    if troop_input:
                        await self._type_text(troop_input, str(count))

            # 選擇任務類型
            event_radio = await self._wait_for_element(f"input[name='eventType'][value='{event_type}']", timeout=3)
            if event_radio:
                await self._click(event_radio)

            await asyncio.sleep(1)

            # 送出
            submit_btn = await self._wait_for_element("button[type='submit']", timeout=5)
            if not submit_btn:
                return ExecutionResult(success=False, error="找不到送出按鈕")

            await self._click(submit_btn)
            await asyncio.sleep(2)

            # 確認
            confirm_btn = await self._wait_for_element("button[type='submit']", timeout=3)
            if confirm_btn:
                await self._click(confirm_btn)
                await asyncio.sleep(2)

            screenshot = await self._take_screenshot(f"troops_{target_x}_{target_y}")
            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"發兵到 ({target_x}, {target_y}) 完成",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            return ExecutionResult(success=False, error=str(e))
        finally:
            await self._stop_browser()


# ============ 測試函數 ============
def print_menu():
    """顯示選單."""
    print("\n" + "=" * 60)
    print("Travian 執行引擎測試")
    print("=" * 60)
    print(f"伺服器: {SERVER_URL}")
    print(f"村莊 ID: {VILLAGE_ID or '(使用目前村莊)'}")
    print("-" * 60)
    print("1. Keep-alive 測試 (保持登入)")
    print("2. 攻擊偵測測試 (自動查詢詳情)")
    print("3. 資源運送測試")
    print("4. 建築升級測試")
    print("5. 資源田升級測試")
    print("6. 農場清單測試 (單一清單)")
    print("7. 農場清單測試 (全部清單)")
    print("8. 發兵測試 (搶奪)")
    print("9. 發兵測試 (攻擊)")
    print("0. 離開")
    print("-" * 60)


async def test_keepalive():
    print("\n[Keep-alive 測試]")
    input("按 Enter 開始...")
    engine = KeepAliveEngine()
    result = await engine.execute(SERVER_URL)
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")
    if result.screenshot_path:
        print(f"截圖: {result.screenshot_path}")


async def test_attack_check():
    """偵測攻擊並自動查詢詳情."""
    print("\n[攻擊偵測測試]")
    input("按 Enter 開始...")

    # Step 1: 偵測被攻擊的村莊
    engine = AttackCheckEngine()
    result = await engine.execute(SERVER_URL)
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")

    if not result.details:
        return

    has_attacks = result.details.get('has_attacks', False)
    attacked_villages = result.details.get('attacked_village_ids', [])

    if not has_attacks:
        print("沒有偵測到攻擊")
        return

    print(f"\n偵測到 {len(attacked_villages)} 個村莊被攻擊: {attacked_villages}")

    # Step 2: 自動查詢每個被攻擊村莊的詳情
    if input("\n是否查詢攻擊詳情? (Y/n): ").lower() != "n":
        for village_id in attacked_villages:
            print(f"\n{'='*50}")
            print(f"查詢村莊 {village_id} 的攻擊詳情...")
            print("="*50)

            detail_engine = AttackCheckEngine()
            detail_result = await detail_engine.get_attack_details(SERVER_URL, village_id)

            if detail_result.success and detail_result.details:
                attacks = detail_result.details.get('attacks', [])
                print(f"共 {len(attacks)} 波攻擊:")

                for i, attack in enumerate(attacks, 1):
                    print(f"\n--- 第 {i} 波 ---")
                    print(f"  描述: {attack.get('description', '未知')}")
                    print(f"  種族: {attack.get('tribe', '未知')}")
                    print(f"  座標: ({attack.get('attacker_x', '?')}, {attack.get('attacker_y', '?')})")
                    print(f"  兵力: {attack.get('troop_counts', [])}")
                    print(f"  到達: {attack.get('arrival_time', '?')} (倒數 {attack.get('countdown_text', '?')})")
            else:
                print(f"查詢失敗: {detail_result.error}")


async def test_transport():
    print("\n[資源運送測試]")
    target_x = input("目標 X 座標: ")
    target_y = input("目標 Y 座標: ")
    wood = input("木材 (預設 100): ") or "100"
    clay = input("磚塊 (預設 100): ") or "100"
    iron = input("鐵礦 (預設 100): ") or "100"
    crop = input("糧食 (預設 100): ") or "100"

    print(f"\n目標: ({target_x}, {target_y}), 資源: 木{wood} 磚{clay} 鐵{iron} 糧{crop}")
    if input("確認? (y/N): ").lower() != "y":
        return

    engine = TransportEngine()
    result = await engine.execute(
        SERVER_URL, VILLAGE_ID,
        int(target_x), int(target_y),
        int(wood), int(clay), int(iron), int(crop)
    )
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def test_build():
    print("\n[建築升級測試]")
    print("建築位置: 19-40 (19=本部)")
    position = input("建築位置: ")
    if input(f"確認升級位置 {position}? (y/N): ").lower() != "y":
        return

    engine = BuildEngine()
    result = await engine.execute(SERVER_URL, VILLAGE_ID, int(position))
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def test_resource_field():
    print("\n[資源田升級測試]")
    print("資源田位置: 1-18")
    position = input("資源田位置: ")
    if input(f"確認升級位置 {position}? (y/N): ").lower() != "y":
        return

    engine = ResourceFieldEngine()
    result = await engine.execute(SERVER_URL, VILLAGE_ID, int(position))
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def test_farmlist_single():
    print("\n[農場清單測試 - 單一]")
    list_id = input("清單 ID (留空=第一個): ") or None
    if input("確認? (y/N): ").lower() != "y":
        return

    engine = FarmListEngine()
    result = await engine.execute_single(SERVER_URL, VILLAGE_ID, list_id)
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def test_farmlist_all():
    print("\n[農場清單測試 - 全部]")
    if input("確認啟動所有農場清單? (y/N): ").lower() != "y":
        return

    engine = FarmListEngine()
    result = await engine.execute_all(SERVER_URL, VILLAGE_ID)
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def test_send_troops(event_type: str):
    mode = "搶奪" if event_type == "4" else "攻擊"
    print(f"\n[發兵測試 - {mode}]")
    if event_type == "3":
        print("⚠️  攻擊模式會造成傷亡！")

    target_x = input("目標 X: ")
    target_y = input("目標 Y: ")

    print("輸入部隊 (留空=0):")
    print("高盧: t1=方陣兵, t2=劍士, t3=探路者, t4=雷法師, t5=德魯伊, t6=海頓聖騎")
    troops = {}
    for i in range(1, 7):
        count = input(f"  t{i}: ") or "0"
        if int(count) > 0:
            troops[f"t{i}"] = int(count)

    if not troops:
        print("沒有部隊")
        return

    print(f"\n目標: ({target_x}, {target_y}), 部隊: {troops}, 模式: {mode}")
    if input("確認? (y/N): ").lower() != "y":
        return

    engine = SendTroopsEngine()
    result = await engine.execute(
        SERVER_URL, VILLAGE_ID,
        int(target_x), int(target_y),
        troops, event_type
    )
    print(f"\n結果: {'✓ 成功' if result.success else '✗ 失敗'}")
    print(f"訊息: {result.message or result.error}")


async def main():
    print("\n" + "=" * 60)
    print("Travian 執行引擎測試工具")
    print("=" * 60)
    print("請確認已使用 collect_travian_info.py 登入過遊戲")

    while True:
        print_menu()
        choice = input("選擇 (0-9): ")

        try:
            if choice == "0":
                break
            elif choice == "1":
                await test_keepalive()
            elif choice == "2":
                await test_attack_check()
            elif choice == "3":
                await test_transport()
            elif choice == "4":
                await test_build()
            elif choice == "5":
                await test_resource_field()
            elif choice == "6":
                await test_farmlist_single()
            elif choice == "7":
                await test_farmlist_all()
            elif choice == "8":
                await test_send_troops("4")
            elif choice == "9":
                await test_send_troops("3")
            else:
                print("無效選項")
        except KeyboardInterrupt:
            print("\n中斷")
        except Exception as e:
            print(f"\n錯誤: {e}")
            import traceback
            traceback.print_exc()

        input("\n按 Enter 繼續...")


if __name__ == "__main__":
    asyncio.run(main())
