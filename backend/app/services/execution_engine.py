"""執行引擎 - 瀏覽器自動化核心."""

import asyncio
import logging
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.automation_config import automation_config
from app.infrastructure.database.models.execution_task import (
    ExecutionTask,
    ExecutionType,
)

logger = logging.getLogger(__name__)


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
    """模擬人類行為的輔助類."""

    @staticmethod
    def get_random_delay() -> float:
        """產生隨機延遲（正態分佈）.

        Returns:
            延遲秒數，範圍在 MIN_DELAY_SECONDS 到 MAX_DELAY_SECONDS 之間
        """
        delay = random.gauss(
            automation_config.DELAY_MEAN,
            automation_config.DELAY_STD_DEV,
        )
        return max(
            automation_config.MIN_DELAY_SECONDS,
            min(automation_config.MAX_DELAY_SECONDS, delay),
        )

    @staticmethod
    def get_mouse_offset() -> tuple[int, int]:
        """產生隨機滑鼠偏移.

        Returns:
            (offset_x, offset_y) 偏移值
        """
        offset_range = automation_config.MOUSE_OFFSET_RANGE
        return (
            random.randint(-offset_range, offset_range),
            random.randint(-offset_range, offset_range),
        )

    @staticmethod
    def get_typing_delay() -> float:
        """產生打字間隔延遲.

        Returns:
            延遲秒數
        """
        return random.uniform(
            automation_config.TYPING_DELAY_MIN,
            automation_config.TYPING_DELAY_MAX,
        )


class BaseExecutionEngine:
    """執行引擎基類.

    提供瀏覽器自動化的基礎功能，包括：
    - 隨機延遲
    - 人類化點擊
    - 截圖
    - 錯誤處理
    """

    def __init__(self) -> None:
        """初始化執行引擎."""
        self.config = automation_config
        self.human = HumanBehavior()
        self._browser = None
        self._page = None

    async def _start_browser(self) -> Any:
        """啟動瀏覽器.

        Returns:
            瀏覽器實例

        Note:
            使用 nodriver 來繞過 CDP 偵測
        """
        try:
            import nodriver as uc

            browser = await uc.start(
                headless=self.config.CHROME_HEADLESS,
                user_data_dir=self.config.CHROME_USER_DATA_DIR,
            )
            self._browser = browser
            return browser
        except ImportError:
            logger.error("nodriver 未安裝，請執行 pip install nodriver")
            raise
        except Exception as e:
            logger.error(f"啟動瀏覽器失敗: {e}")
            raise

    async def _stop_browser(self) -> None:
        """停止瀏覽器."""
        if self._browser:
            try:
                await self._browser.stop()
            except Exception as e:
                logger.warning(f"停止瀏覽器時發生錯誤: {e}")
            finally:
                self._browser = None
                self._page = None

    async def _navigate(self, url: str) -> Any:
        """導航到指定 URL.

        Args:
            url: 目標 URL

        Returns:
            頁面實例
        """
        if not self._browser:
            await self._start_browser()

        page = await self._browser.get(url)
        self._page = page

        # 等待頁面載入
        await asyncio.sleep(self.human.get_random_delay())

        return page

    async def _click(self, element: Any) -> None:
        """人類化點擊元素.

        Args:
            element: 要點擊的元素
        """
        # 加入隨機延遲
        await asyncio.sleep(self.human.get_random_delay())

        # 取得隨機偏移
        offset_x, offset_y = self.human.get_mouse_offset()

        # 執行點擊
        try:
            await element.click(offset=(offset_x, offset_y))
        except Exception:
            # 如果 offset 不支援，嘗試普通點擊
            await element.click()

    async def _type_text(self, element: Any, text: str) -> None:
        """人類化輸入文字.

        Args:
            element: 輸入框元素
            text: 要輸入的文字
        """
        # 先清空輸入框
        await element.clear()
        await asyncio.sleep(self.human.get_random_delay() * 0.5)

        # 逐字輸入
        for char in text:
            await element.send_keys(char)
            await asyncio.sleep(self.human.get_typing_delay())

    async def _take_screenshot(self, name: str) -> str | None:
        """截取螢幕截圖.

        Args:
            name: 截圖名稱（不含副檔名）

        Returns:
            截圖路徑，如果截圖失敗則返回 None
        """
        if not self.config.ENABLE_SCREENSHOTS or not self._page:
            return None

        try:
            screenshot_dir = Path(self.config.SCREENSHOT_DIR)
            screenshot_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{name}_{timestamp}.png"
            filepath = screenshot_dir / filename

            await self._page.save_screenshot(str(filepath))
            logger.info(f"截圖已保存: {filepath}")
            return str(filepath)
        except Exception as e:
            logger.warning(f"截圖失敗: {e}")
            return None

    async def _wait_for_element(
        self, selector: str, timeout: int | None = None
    ) -> Any | None:
        """等待元素出現.

        Args:
            selector: CSS 選擇器
            timeout: 超時時間（秒），預設使用配置值

        Returns:
            元素，如果超時則返回 None
        """
        if not self._page:
            return None

        timeout = timeout or self.config.ELEMENT_WAIT_TIMEOUT
        start_time = datetime.now()

        while (datetime.now() - start_time).total_seconds() < timeout:
            try:
                element = await self._page.select(selector)
                if element:
                    return element
            except Exception:
                pass
            await asyncio.sleep(0.5)

        return None


class BuildExecutionEngine(BaseExecutionEngine):
    """建造執行引擎.

    負責執行建築升級操作。

    建築頁面結構 (基於收集到的 HTML):
    - 主建築頁面: /build.php?id=19 (id 是建築位置)
    - 升級按鈕容器: .upgradeButtonsContainer
    - 普通升級按鈕: .section1 button (不花金幣)
    - 高級建築師按鈕: .section1 button.gold.builder
    - 建築等級: .upgradeHeader 或 .titleInHeader
    """

    async def execute(self, task: ExecutionTask, server_url: str) -> ExecutionResult:
        """執行建造任務.

        Args:
            task: 執行任務
            server_url: 伺服器 URL

        Returns:
            執行結果
        """
        if not self.config.ENABLE_BUILD_EXECUTION:
            return ExecutionResult(
                success=False,
                error="建造執行功能已停用",
            )

        start_time = datetime.now()

        try:
            # 1. 導航到建築頁面
            # 如果有建築位置 ID，直接導航到 build.php?id=XX
            if task.position:
                building_url = f"{server_url}/build.php?id={task.position}"
            else:
                # 否則先導航到村莊頁面
                building_url = f"{server_url}/dorf2.php"

            if task.village_id:
                building_url += f"&newdid={task.village_id}"

            await self._navigate(building_url)
            logger.info(f"導航到建築頁面: {building_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 如果在村莊頁面，需要點擊建築位置
            if not task.position or "/dorf2.php" in building_url:
                # 找到建築位置並點擊
                building_selector = f".buildingSlot.a{task.position}"
                building = await self._wait_for_element(building_selector)

                if not building:
                    # 嘗試其他選擇器
                    building_selector = (
                        f"#villageContent area[data-aid='{task.position}']"
                    )
                    building = await self._wait_for_element(building_selector)

                if not building:
                    screenshot = await self._take_screenshot("build_error_no_building")
                    return ExecutionResult(
                        success=False,
                        error=f"找不到建築位置 {task.position}",
                        screenshot_path=screenshot,
                    )

                await self._click(building)
                logger.info(f"點擊建築位置 {task.position}")
                await asyncio.sleep(self.human.get_random_delay())

            # 4. 找到升級按鈕並點擊
            # 根據 HTML 分析，升級按鈕在 .upgradeButtonsContainer .section1
            upgrade_selectors = [
                # 普通升級按鈕 (不花金幣)
                ".upgradeButtonsContainer .section1 button.textButtonV1:not(.gold)",
                ".section1 button[onclick*='action=build']:not(.gold)",
                # 通用按鈕
                ".upgradeButtonsContainer button.green:not(.gold)",
                "button.textButtonV1.green:not(.gold)",
                # 備選
                ".build:not(.gold)",
            ]

            upgrade_btn = None
            for selector in upgrade_selectors:
                upgrade_btn = await self._wait_for_element(selector, timeout=5)
                if upgrade_btn:
                    break

            if not upgrade_btn:
                # 檢查是否有錯誤訊息（資源不足等）
                error_msg = await self._wait_for_element(
                    ".buildingCondition.error, .notEnoughResources", timeout=2
                )
                if error_msg:
                    screenshot = await self._take_screenshot("build_error_insufficient")
                    return ExecutionResult(
                        success=False,
                        error="資源不足或不符合升級條件",
                        screenshot_path=screenshot,
                    )

                screenshot = await self._take_screenshot("build_error_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到升級按鈕（可能資源不足或已達等級上限）",
                    screenshot_path=screenshot,
                )

            # 5. 執行點擊
            await self._click(upgrade_btn)
            logger.info(f"點擊升級按鈕: {task.target_name}")

            # 6. 等待並驗證
            await asyncio.sleep(self.human.get_random_delay())

            # 7. 截圖記錄
            screenshot = await self._take_screenshot(f"build_success_{task.target_id}")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功升級 {task.target_name} 到 {task.target_level} 級",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            logger.error(f"執行建造任務失敗: {e}")
            screenshot = await self._take_screenshot("build_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()


class TrainExecutionEngine(BaseExecutionEngine):
    """訓練執行引擎.

    負責執行部隊訓練操作。
    """

    # 訓練建築對應
    TRAINING_BUILDINGS = {
        "barracks": "兵營",
        "stable": "馬廄",
        "workshop": "工坊",
        "great_barracks": "大兵營",
        "great_stable": "大馬廄",
    }

    async def execute(self, task: ExecutionTask, server_url: str) -> ExecutionResult:
        """執行訓練任務.

        Args:
            task: 執行任務
            server_url: 伺服器 URL

        Returns:
            執行結果
        """
        if not self.config.ENABLE_TRAIN_EXECUTION:
            return ExecutionResult(
                success=False,
                error="訓練執行功能已停用",
            )

        start_time = datetime.now()

        try:
            # 1. 確定訓練建築
            building_id = self._get_training_building(task.target_id)
            if not building_id:
                return ExecutionResult(
                    success=False,
                    error=f"無法確定 {task.target_name} 的訓練建築",
                )

            # 2. 導航到訓練建築
            building_url = f"{server_url}/build.php?gid={building_id}"
            if task.village_id:
                building_url += f"&newdid={task.village_id}"

            await self._navigate(building_url)
            logger.info(f"導航到訓練建築: {building_url}")

            # 3. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 4. 找到兵種輸入框
            input_selector = f"input[name='{task.target_id}']"
            input_field = await self._wait_for_element(input_selector)

            if not input_field:
                # 嘗試其他選擇器
                input_selector = f".troop input[name*='{task.target_id}']"
                input_field = await self._wait_for_element(input_selector)

            if not input_field:
                screenshot = await self._take_screenshot("train_error_no_input")
                return ExecutionResult(
                    success=False,
                    error=f"找不到 {task.target_name} 的輸入框",
                    screenshot_path=screenshot,
                )

            # 5. 輸入數量
            await self._type_text(input_field, str(task.quantity))
            logger.info(f"輸入訓練數量: {task.quantity}")

            # 6. 找到並點擊訓練按鈕
            train_selectors = [
                ".train",
                "button.train",
                ".trainButton button",
                "button[type='submit']",
            ]

            train_btn = None
            for selector in train_selectors:
                train_btn = await self._wait_for_element(selector, timeout=5)
                if train_btn:
                    break

            if not train_btn:
                screenshot = await self._take_screenshot("train_error_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到訓練按鈕",
                    screenshot_path=screenshot,
                )

            # 7. 執行點擊
            await self._click(train_btn)
            logger.info(f"點擊訓練按鈕: {task.target_name} x {task.quantity}")

            # 8. 等待並驗證
            await asyncio.sleep(self.human.get_random_delay())

            # 9. 截圖記錄
            screenshot = await self._take_screenshot(f"train_success_{task.target_id}")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功訓練 {task.quantity} 個 {task.target_name}",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            logger.error(f"執行訓練任務失敗: {e}")
            screenshot = await self._take_screenshot("train_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()

    def _get_training_building(self, troop_id: str) -> int | None:
        """取得訓練建築 ID.

        Args:
            troop_id: 兵種 ID

        Returns:
            建築 gid，如果找不到則返回 None
        """
        # 根據兵種類型判斷訓練建築
        # 這裡需要根據實際遊戲數據來對應
        infantry_troops = [
            "legionnaire",
            "praetorian",
            "imperian",  # 羅馬
            "phalanx",
            "swordsman",  # 高盧
            "clubswinger",
            "spearman",
            "axeman",  # 條頓
            # ... 其他種族步兵
        ]
        cavalry_troops = [
            "equites_imperatoris",
            "equites_caesaris",  # 羅馬
            "pathfinder",
            "theutates_thunder",
            "druidrider",
            "haeduan",  # 高盧
            "paladin",
            "teutonic_knight",  # 條頓
            # ... 其他種族騎兵
        ]
        siege_troops = [
            "roman_ram",
            "fire_catapult",  # 羅馬
            "ram",
            "trebuchet",  # 高盧
            "ram",
            "catapult",  # 條頓
            # ... 其他種族攻城
        ]

        if troop_id.lower() in infantry_troops:
            return 19  # 兵營
        elif troop_id.lower() in cavalry_troops:
            return 20  # 馬廄
        elif troop_id.lower() in siege_troops:
            return 21  # 工坊

        # 預設回傳兵營
        return 19


class TransportExecutionEngine(BaseExecutionEngine):
    """運送執行引擎.

    負責執行資源運送操作。
    基於 Travian Legends 實際 HTML 結構。

    市場運送頁面:
    - URL: /build.php?id=XX&gid=17&t=5 (gid=17 是市場, t=5 是運送分頁)
    - 座標欄位: name="x", name="y"
    - 資源欄位: name="lumber" (木), name="clay" (磚), name="iron" (鐵), name="crop" (糧)
    - 送出按鈕: button.send[type="submit"]
    """

    # 市場建築 gid
    MARKET_GID = 17
    # 運送分頁
    TRANSPORT_TAB = 5

    async def execute(
        self,
        server_url: str,
        source_village_id: str,
        target_x: int,
        target_y: int,
        wood: int = 0,
        clay: int = 0,
        iron: int = 0,
        crop: int = 0,
    ) -> ExecutionResult:
        """執行運送任務.

        Args:
            server_url: 伺服器 URL
            source_village_id: 來源村莊 ID
            target_x: 目標 X 座標
            target_y: 目標 Y 座標
            wood: 木材數量
            clay: 磚塊數量
            iron: 鋼鐵數量
            crop: 農作物數量

        Returns:
            執行結果
        """
        if not self.config.ENABLE_TRANSPORT_EXECUTION:
            return ExecutionResult(
                success=False,
                error="運送執行功能已停用",
            )

        start_time = datetime.now()
        total_resources = wood + clay + iron + crop

        if total_resources == 0:
            return ExecutionResult(
                success=False,
                error="運送資源量為零",
            )

        try:
            # 1. 導航到市場運送頁面
            # 需要找到市場的建築位置 ID (build.php?id=XX)
            # 先導航到村莊，然後找市場
            market_url = (
                f"{server_url}/build.php?gid={self.MARKET_GID}&t={self.TRANSPORT_TAB}"
            )
            if source_village_id:
                market_url += f"&newdid={source_village_id}"

            await self._navigate(market_url)
            logger.info(f"導航到市場運送頁面: {market_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 確認在運送頁面 (檢查 #marketplaceSendResources)
            send_form = await self._wait_for_element(
                "#marketplaceSendResources", timeout=5
            )
            if not send_form:
                # 可能需要手動找市場位置，嘗試從村莊頁面找
                screenshot = await self._take_screenshot("transport_error_no_market")
                return ExecutionResult(
                    success=False,
                    error="找不到市場運送介面，請確認村莊有市場",
                    screenshot_path=screenshot,
                )

            # 4. 輸入座標
            # 選擇器: label.coordinateX input[name='x'], label.coordinateY input[name='y']
            x_input = await self._wait_for_element("input[name='x']")
            y_input = await self._wait_for_element("input[name='y']")

            if not x_input or not y_input:
                screenshot = await self._take_screenshot("transport_error_no_coords")
                return ExecutionResult(
                    success=False,
                    error="找不到座標輸入框",
                    screenshot_path=screenshot,
                )

            await self._type_text(x_input, str(target_x))
            await asyncio.sleep(self.human.get_random_delay() * 0.5)
            await self._type_text(y_input, str(target_y))

            # 等待座標驗證完成
            await asyncio.sleep(self.human.get_random_delay())

            # 5. 輸入資源數量
            # Travian 使用: lumber (木), clay (磚), iron (鐵), crop (糧)
            resource_inputs = {
                "lumber": wood,
                "clay": clay,
                "iron": iron,
                "crop": crop,
            }

            for input_name, amount in resource_inputs.items():
                if amount > 0:
                    res_input = await self._wait_for_element(
                        f"input[name='{input_name}']", timeout=5
                    )
                    if res_input:
                        await self._type_text(res_input, str(amount))
                        await asyncio.sleep(self.human.get_random_delay() * 0.3)

            # 6. 點擊送出按鈕
            await asyncio.sleep(self.human.get_random_delay())

            # 送出按鈕: button.send[type="submit"] 或 button.textButtonV2.send
            confirm_selectors = [
                "button.send[type='submit']",
                "button.textButtonV2.send",
                ".actionButtons button.green[type='submit']",
                "button[type='submit'].green",
            ]

            confirm_btn = None
            for selector in confirm_selectors:
                confirm_btn = await self._wait_for_element(selector, timeout=5)
                if confirm_btn:
                    break

            if not confirm_btn:
                screenshot = await self._take_screenshot("transport_error_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到送出按鈕",
                    screenshot_path=screenshot,
                )

            await self._click(confirm_btn)
            logger.info(f"點擊送出按鈕，運送資源到 ({target_x}, {target_y})")

            # 7. 等待確認頁面並確認
            await asyncio.sleep(self.human.get_random_delay())

            # 可能有第二次確認
            final_confirm = await self._wait_for_element(
                "button[type='submit'].green", timeout=3
            )
            if final_confirm:
                await self._click(final_confirm)
                logger.info("點擊最終確認按鈕")
                await asyncio.sleep(self.human.get_random_delay())

            # 8. 截圖記錄
            screenshot = await self._take_screenshot(
                f"transport_success_{target_x}_{target_y}"
            )

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功運送資源到 ({target_x}, {target_y}): 木{wood} 磚{clay} 鐵{iron} 糧{crop}",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={
                    "target_x": target_x,
                    "target_y": target_y,
                    "wood": wood,
                    "clay": clay,
                    "iron": iron,
                    "crop": crop,
                },
            )

        except Exception as e:
            logger.error(f"執行運送任務失敗: {e}")
            screenshot = await self._take_screenshot("transport_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()


class PopupHandlerEngine(BaseExecutionEngine):
    """彈窗處理引擎.

    負責自動關閉遊戲中的各種彈窗，包括：
    - 廣告彈窗
    - 公告彈窗
    - MH 公告（Multihunter 公告）
    """

    # 常見的彈窗選擇器
    POPUP_SELECTORS = [
        # 通用彈窗
        ".dialog .dialogButton",
        ".popup .close",
        ".modal .closeButton",
        ".overlay .close",
        # Travian 特定彈窗
        ".iconButton.closeWindow",
        "#dialogContent .dialogButtonOk",
        ".announcement .buttonFooter button",
        # Gold 相關彈窗
        ".goldHeader .close",
        "#goldModal .close",
    ]

    # MH 公告特定選擇器
    MH_SELECTORS = [
        ".mhBroadcast .continue",
        ".mhAnnouncement .buttonContinue",
        "#mhMessage .ok",
    ]

    async def handle_popups(self, delay_seconds: int = 60) -> ExecutionResult:
        """處理彈窗.

        Args:
            delay_seconds: 關閉彈窗前的延遲秒數

        Returns:
            執行結果
        """
        closed_count = 0
        start_time = datetime.now()

        try:
            if not self._page:
                return ExecutionResult(
                    success=False,
                    error="沒有可用的頁面實例",
                )

            # 等待指定的延遲時間
            await asyncio.sleep(delay_seconds)

            # 嘗試關閉各種彈窗
            for selector in self.POPUP_SELECTORS:
                try:
                    element = await self._wait_for_element(selector, timeout=2)
                    if element:
                        await self._click(element)
                        closed_count += 1
                        logger.info(f"關閉彈窗: {selector}")
                        await asyncio.sleep(self.human.get_random_delay())
                except Exception as e:
                    logger.debug(f"嘗試關閉彈窗 {selector} 失敗: {e}")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功關閉 {closed_count} 個彈窗",
                duration_ms=duration,
                details={"closed_count": closed_count},
            )

        except Exception as e:
            logger.error(f"處理彈窗失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
            )

    async def handle_mh_announcement(self) -> ExecutionResult:
        """處理 MH 公告.

        Returns:
            執行結果
        """
        start_time = datetime.now()

        try:
            if not self._page:
                return ExecutionResult(
                    success=False,
                    error="沒有可用的頁面實例",
                )

            # 等待隨機延遲
            await asyncio.sleep(self.human.get_random_delay())

            # 嘗試點擊 MH 公告的繼續按鈕
            for selector in self.MH_SELECTORS:
                try:
                    element = await self._wait_for_element(selector, timeout=3)
                    if element:
                        await self._click(element)
                        logger.info(f"點擊 MH 公告繼續: {selector}")
                        duration = int(
                            (datetime.now() - start_time).total_seconds() * 1000
                        )
                        return ExecutionResult(
                            success=True,
                            message="成功處理 MH 公告",
                            duration_ms=duration,
                        )
                except Exception as e:
                    logger.debug(f"嘗試處理 MH 公告 {selector} 失敗: {e}")

            # 沒有找到 MH 公告
            duration = int((datetime.now() - start_time).total_seconds() * 1000)
            return ExecutionResult(
                success=True,
                message="沒有發現 MH 公告",
                duration_ms=duration,
            )

        except Exception as e:
            logger.error(f"處理 MH 公告失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
            )


class AttackWarningEngine(BaseExecutionEngine):
    """攻擊警告引擎.

    負責偵測攻擊並發出警告，以及獲取攻擊詳細資訊。
    注意：警告音效需要前端處理，後端只負責偵測。

    攻擊偵測位置:
    1. 村莊列表 sidebar 中的攻擊標記 (span.incomingTroops svg.attack)
    2. 集結點概覽頁面 (build.php?gid=16&tt=1) 的 table.troop_details

    兵種 ID 與種族對照:
    - 羅馬 (Romans): u1-u10
    - 條頓 (Teutons): u11-u20
    - 高盧 (Gauls): u21-u30
    - 自然界 (Nature): u31-u40
    - 納塔人 (Natars): u41-u50
    - 埃及 (Egyptians): u51-u60
    - 匈奴 (Huns): u61-u70
    """

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

    # 兵種速度 (格/小時) - 用於推測兵種
    TROOP_SPEEDS = {
        # 羅馬
        1: 6,  # 軍團士兵
        2: 5,  # 禁衛軍
        3: 7,  # 帝國騎兵
        4: 16,  # 精銳騎士
        5: 4,  # 衝撞車
        6: 3,  # 火焰投石機
        7: 5,  # 參議員
        8: 5,  # 移民者
        # 條頓
        11: 7,  # 狼牙棒士
        12: 7,  # 矛兵
        13: 10,  # 斥候
        14: 9,  # 聖騎士
        15: 10,  # 條頓騎士
        16: 4,  # 衝撞車
        17: 3,  # 投石機
        18: 4,  # 首領
        19: 5,  # 移民者
        # 高盧
        21: 7,  # 方陣兵
        22: 6,  # 劍士
        23: 17,  # 探路者
        24: 19,  # 雷法師
        25: 16,  # 德魯伊騎兵
        26: 13,  # 海頓聖騎
        27: 4,  # 破城槌
        28: 3,  # 投石機
        29: 5,  # 族長
        30: 5,  # 開拓者
        # 埃及
        51: 7,  # 奴隸民兵
        52: 6,  # 灰燼行者
        53: 8,  # 赫卡騎兵
        54: 16,  # 石像衛士
        55: 12,  # 安哈騎手
        56: 9,  # 重裝戰馬
        57: 4,  # 衝撞車
        58: 3,  # 火焰投石機
        59: 5,  # 高階祭司
        60: 5,  # 移民者
        # 匈奴
        61: 7,  # 傭兵
        62: 6,  # 弓箭手
        63: 9,  # 偵探騎兵
        64: 11,  # 草原騎兵
        65: 14,  # 飛馬騎手
        66: 12,  # 攻城槌
        67: 4,  # 衝撞車
        68: 3,  # 投石機
        69: 5,  # 大汗
        70: 5,  # 移民者
    }

    async def check_attacks(self) -> ExecutionResult:
        """檢查是否有攻擊.

        Returns:
            執行結果，包含被攻擊的村莊 ID 列表
        """
        start_time = datetime.now()

        try:
            if not self._page:
                return ExecutionResult(
                    success=False,
                    error="沒有可用的頁面實例",
                )

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
                                logger.info(f"偵測到攻擊: 村莊 ID {village_id}")
            except Exception as e:
                logger.debug(f"檢查村莊列表攻擊標記失敗: {e}")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)
            has_attacks = attack_count > 0

            return ExecutionResult(
                success=True,
                message=f"偵測到 {attack_count} 個村莊被攻擊"
                if has_attacks
                else "沒有偵測到攻擊",
                duration_ms=duration,
                details={
                    "has_attacks": has_attacks,
                    "attack_count": attack_count,
                    "attacked_village_ids": attacked_villages,
                },
            )

        except Exception as e:
            logger.error(f"檢查攻擊失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
            )

    async def get_attack_details(
        self, server_url: str, village_id: str
    ) -> ExecutionResult:
        """獲取被攻擊村莊的詳細攻擊資訊.

        會導航到該村莊的集結點概覽頁面，解析攻擊波次詳情。

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID

        Returns:
            執行結果，包含攻擊波次詳情
        """
        start_time = datetime.now()

        try:
            if not self._page:
                return ExecutionResult(
                    success=False,
                    error="沒有可用的頁面實例",
                )

            # 導航到村莊的集結點概覽頁面
            rally_url = f"{server_url}/build.php?gid=16&tt=1&newdid={village_id}"
            await self._navigate(rally_url)
            await asyncio.sleep(2)

            incoming_attacks = []

            # 查找所有攻擊的 table.troop_details
            # 攻擊的特徵是有 a.markAttack 元素
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

                    # 取得攻擊描述（標題）
                    headline = await table.query_selector(
                        "td.troopHeadline a:not(.markAttack)"
                    )
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
                            # 清理座標文字（移除括號和特殊字符）
                            import re

                            x_match = re.search(r"[−-]?\d+", x_text)
                            y_match = re.search(r"[−-]?\d+", y_text)
                            if x_match and y_match:
                                attack_info["attacker_x"] = int(
                                    x_match.group().replace("−", "-")
                                )
                                attack_info["attacker_y"] = int(
                                    y_match.group().replace("−", "-")
                                )

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
                                troops.append(
                                    {
                                        "unit_id": unit_id,
                                        "name": alt_text or f"u{unit_id}",
                                    }
                                )
                                # 判定種族
                                if tribe is None:
                                    for id_range, tribe_name in self.TRIBE_MAP.items():
                                        if unit_id in id_range:
                                            tribe = tribe_name
                                            break

                    attack_info["troops"] = troops
                    attack_info["tribe"] = tribe

                    # 取得兵種數量
                    unit_counts = await table.query_selector_all(
                        "tbody.units.last td.unit"
                    )
                    troop_counts = []
                    for i, count_td in enumerate(unit_counts):
                        count_text = await count_td.text()
                        try:
                            count = int(count_text.strip())
                            if count > 0 and i < len(troops):
                                troops[i]["count"] = count
                                troop_counts.append(
                                    {"name": troops[i]["name"], "count": count}
                                )
                        except ValueError:
                            pass

                    attack_info["troop_counts"] = troop_counts

                    # 取得到達時間
                    infos_tbody = await table.query_selector("tbody.infos")
                    if infos_tbody:
                        timer = await infos_tbody.query_selector(
                            'span.timer[counting="down"]'
                        )
                        if timer:
                            countdown_text = await timer.text()
                            countdown_value = await timer.get_attribute("value")
                            attack_info["countdown_text"] = countdown_text
                            attack_info["countdown_seconds"] = (
                                int(countdown_value) if countdown_value else None
                            )

                        # 取得確切到達時間
                        at_div = await infos_tbody.query_selector("div.at span")
                        if at_div:
                            arrival_time = await at_div.text()
                            attack_info["arrival_time"] = arrival_time.strip()

                    # 推測可能的兵種（根據移動速度）
                    attack_info["possible_troops"] = self._estimate_troops(
                        attack_info.get("attacker_x"),
                        attack_info.get("attacker_y"),
                        attack_info.get("countdown_seconds"),
                        tribe,
                    )

                    incoming_attacks.append(attack_info)

                except Exception as e:
                    logger.warning(f"解析攻擊詳情失敗: {e}")
                    continue

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            screenshot = await self._take_screenshot(f"attack_details_{village_id}")

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
            logger.error(f"獲取攻擊詳情失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
            )

    def _estimate_troops(
        self,
        attacker_x: int | None,
        attacker_y: int | None,
        countdown_seconds: int | None,
        tribe: str | None,
    ) -> list[dict]:
        """根據距離和時間推測可能的兵種.

        Args:
            attacker_x: 攻擊者 X 座標
            attacker_y: 攻擊者 Y 座標
            countdown_seconds: 到達倒數秒數
            tribe: 攻擊者種族

        Returns:
            可能的兵種列表
        """
        if not all([attacker_x is not None, attacker_y is not None, countdown_seconds]):
            return []

        # 計算距離（假設被攻擊村莊在原點，這只是估算）
        # 實際上需要知道被攻擊村莊的座標
        # 這裡我們只計算從座標到原點的距離作為參考
        import math

        distance = math.sqrt(attacker_x**2 + attacker_y**2)

        if distance == 0 or countdown_seconds == 0:
            return []

        # 計算速度 (格/小時)
        hours = countdown_seconds / 3600
        speed = distance / hours

        # 找出可能的兵種
        possible = []
        tribe_ranges = {
            "羅馬": range(1, 11),
            "條頓": range(11, 21),
            "高盧": range(21, 31),
            "埃及": range(51, 61),
            "匈奴": range(61, 71),
        }

        # 如果知道種族，只檢查該種族的兵種
        if tribe and tribe in tribe_ranges:
            check_ranges = [tribe_ranges[tribe]]
        else:
            check_ranges = tribe_ranges.values()

        for unit_range in check_ranges:
            for unit_id in unit_range:
                if unit_id in self.TROOP_SPEEDS:
                    unit_speed = self.TROOP_SPEEDS[unit_id]
                    # 允許 10% 的誤差
                    if abs(unit_speed - speed) / speed < 0.1:
                        possible.append(
                            {
                                "unit_id": unit_id,
                                "speed": unit_speed,
                                "match_score": 1.0,
                            }
                        )
                    elif abs(unit_speed - speed) / speed < 0.2:
                        possible.append(
                            {
                                "unit_id": unit_id,
                                "speed": unit_speed,
                                "match_score": 0.8,
                            }
                        )

        # 按匹配度排序
        possible.sort(key=lambda x: x["match_score"], reverse=True)
        return possible[:5]  # 返回最可能的 5 種


class KeepAliveExecutionEngine(BaseExecutionEngine):
    """Keep-alive 執行引擎.

    負責執行 Keep-alive 操作，維持登入狀態。

    登出偵測:
    - 當 session 過期時，會被重定向到 lobby.legends.travian.com
    - 或者出現登入表單

    登入狀態偵測:
    - 存在 #sidebarBoxActiveVillage (村莊側邊欄)
    - 存在 .villageInfobox (村莊資訊)
    - URL 包含遊戲伺服器域名且有 dorf1.php 或 dorf2.php
    """

    # 登出頁面特徵
    LOGOUT_INDICATORS = [
        "lobby.legends.travian.com",  # 登出後會導向這裡
        "lobby.travian.com",
    ]

    async def execute(self, server_url: str) -> ExecutionResult:
        """執行 Keep-alive.

        Args:
            server_url: 伺服器 URL

        Returns:
            執行結果
        """
        start_time = datetime.now()

        try:
            # 1. 導航到主頁面 (資源田頁面)
            dorf1_url = f"{server_url}/dorf1.php"
            await self._navigate(dorf1_url)
            logger.info(f"Keep-alive 導航到: {dorf1_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 檢查是否被登出 (URL 變成 lobby)
            if self._page:
                current_url = str(self._page.url) if hasattr(self._page, "url") else ""
                for indicator in self.LOGOUT_INDICATORS:
                    if indicator in current_url:
                        duration = int(
                            (datetime.now() - start_time).total_seconds() * 1000
                        )
                        return ExecutionResult(
                            success=False,
                            error="Session 已過期，被重定向到登入頁面",
                            duration_ms=duration,
                            details={"session_expired": True},
                        )

            # 4. 檢查是否有村莊資訊 (表示仍在登入狀態)
            # 根據收集到的 HTML，使用 #sidebarBoxActiveVillage
            village_element = await self._wait_for_element(
                "#sidebarBoxActiveVillage", timeout=5
            )

            if not village_element:
                # 嘗試其他選擇器
                village_element = await self._wait_for_element(
                    ".villageInfobox, #villageBoxes", timeout=3
                )

            if not village_element:
                # 檢查是否有登入表單
                login_form = await self._wait_for_element(
                    "form.login, .loginForm, input[type='password']", timeout=3
                )

                if login_form:
                    duration = int((datetime.now() - start_time).total_seconds() * 1000)
                    return ExecutionResult(
                        success=False,
                        error="Session 已過期，需要重新登入",
                        duration_ms=duration,
                        details={"session_expired": True},
                    )

            # 5. 可選：做一些動作來模擬活動
            # 例如點擊一下資源田
            resource_field = await self._wait_for_element(
                "#resourceFieldContainer .buildingSlot", timeout=2
            )
            if resource_field:
                # 隨機點擊一個資源田
                await self._click(resource_field)
                await asyncio.sleep(self.human.get_random_delay() * 0.5)
                # 返回資源頁面
                await self._navigate(dorf1_url)

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message="Keep-alive 成功",
                duration_ms=duration,
                details={"session_expired": False},
            )

        except Exception as e:
            logger.error(f"執行 Keep-alive 失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
            )

        finally:
            await self._stop_browser()


class FarmListExecutionEngine(BaseExecutionEngine):
    """農場清單執行引擎.

    負責自動發送農場清單（搶羊）。
    使用 Gold Club 內建的農場清單功能。

    農場清單頁面結構 (基於收集到的 HTML):
    - URL: /build.php?id=39&gid=16&tt=99
    - 頁面容器: #rallyPointFarmList
    - 農場清單 wrapper: .farmListWrapper
    - 單一清單啟動按鈕: button.startFarmList
    - 全部清單啟動按鈕: button.startAllFarmLists
    - 清單 ID: data-list="XXX"
    - 清單狀態: .farmListStatus
    """

    # 集結點建築 gid
    RALLY_POINT_GID = 16
    # 農場清單分頁
    FARMLIST_TAB = 99

    async def execute_single_list(
        self,
        server_url: str,
        village_id: str | None = None,
        list_id: str | None = None,
    ) -> ExecutionResult:
        """執行單一農場清單.

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID（可選）
            list_id: 農場清單 ID（可選，如果不指定則執行第一個）

        Returns:
            執行結果
        """
        start_time = datetime.now()

        try:
            # 1. 導航到農場清單頁面
            farmlist_url = f"{server_url}/build.php?gid={self.RALLY_POINT_GID}&tt={self.FARMLIST_TAB}"
            if village_id:
                farmlist_url += f"&newdid={village_id}"

            await self._navigate(farmlist_url)
            logger.info(f"導航到農場清單頁面: {farmlist_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 確認在農場清單頁面
            farmlist_container = await self._wait_for_element(
                "#rallyPointFarmList", timeout=5
            )
            if not farmlist_container:
                screenshot = await self._take_screenshot("farmlist_error_no_page")
                return ExecutionResult(
                    success=False,
                    error="找不到農場清單頁面，請確認有 Gold Club 功能",
                    screenshot_path=screenshot,
                )

            # 4. 找到並點擊啟動按鈕
            if list_id:
                # 找特定清單的按鈕
                list_wrapper = await self._wait_for_element(
                    f".farmListWrapper[data-list='{list_id}'] button.startFarmList",
                    timeout=5,
                )
                if not list_wrapper:
                    # 嘗試在 header 中找
                    list_wrapper = await self._wait_for_element(
                        ".farmListHeader button.startFarmList",
                        timeout=3,
                    )
            else:
                # 找第一個清單的按鈕
                list_wrapper = await self._wait_for_element(
                    "button.startFarmList", timeout=5
                )

            if not list_wrapper:
                screenshot = await self._take_screenshot("farmlist_error_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到農場清單啟動按鈕",
                    screenshot_path=screenshot,
                )

            # 5. 點擊啟動按鈕
            await self._click(list_wrapper)
            logger.info(f"點擊農場清單啟動按鈕: list_id={list_id or 'first'}")

            # 6. 等待執行完成
            await asyncio.sleep(self.human.get_random_delay())

            # 7. 截圖記錄
            screenshot = await self._take_screenshot("farmlist_success")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功啟動農場清單 {list_id or '(第一個)'}",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={"list_id": list_id},
            )

        except Exception as e:
            logger.error(f"執行農場清單失敗: {e}")
            screenshot = await self._take_screenshot("farmlist_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()

    async def execute_all_lists(
        self,
        server_url: str,
        village_id: str | None = None,
    ) -> ExecutionResult:
        """執行所有農場清單.

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID（可選）

        Returns:
            執行結果
        """
        start_time = datetime.now()

        try:
            # 1. 導航到農場清單頁面
            farmlist_url = f"{server_url}/build.php?gid={self.RALLY_POINT_GID}&tt={self.FARMLIST_TAB}"
            if village_id:
                farmlist_url += f"&newdid={village_id}"

            await self._navigate(farmlist_url)
            logger.info(f"導航到農場清單頁面: {farmlist_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 找到「啟動全部」按鈕
            start_all_btn = await self._wait_for_element(
                "button.startAllFarmLists", timeout=5
            )

            if not start_all_btn:
                screenshot = await self._take_screenshot("farmlist_error_no_startall")
                return ExecutionResult(
                    success=False,
                    error="找不到「啟動全部」按鈕",
                    screenshot_path=screenshot,
                )

            # 4. 點擊啟動全部
            await self._click(start_all_btn)
            logger.info("點擊「啟動全部農場清單」按鈕")

            # 5. 等待執行完成
            await asyncio.sleep(self.human.get_random_delay())

            # 6. 截圖記錄
            screenshot = await self._take_screenshot("farmlist_all_success")

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message="成功啟動所有農場清單",
                screenshot_path=screenshot,
                duration_ms=duration,
            )

        except Exception as e:
            logger.error(f"執行全部農場清單失敗: {e}")
            screenshot = await self._take_screenshot("farmlist_all_error")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()


class ScheduledAttackEngine(BaseExecutionEngine):
    """定時發兵引擎.

    負責執行定時發兵和多波壓秒功能。

    發兵頁面結構 (基於收集到的 HTML):
    - URL: /build.php?id=39&gid=16&tt=2
    - 座標輸入: input[name="x"], input[name="y"]
    - 部隊輸入: input[name="troop[t1]"] ~ input[name="troop[t11]"]
    - 任務類型 (eventType):
      - value="3" - 攻擊（普通）
      - value="4" - 搶奪（raid）
      - value="5" - 援助（reinforce）
    - 送出按鈕: button[type="submit"]
    """

    # 集結點建築 gid
    RALLY_POINT_GID = 16
    # 發兵分頁
    SEND_TROOPS_TAB = 2

    # 任務類型
    EVENT_TYPE_ATTACK = "3"
    EVENT_TYPE_RAID = "4"
    EVENT_TYPE_REINFORCE = "5"

    async def send_troops(
        self,
        server_url: str,
        village_id: str | None,
        target_x: int,
        target_y: int,
        troops: dict[str, int],
        event_type: str = "4",  # 預設為搶奪
    ) -> ExecutionResult:
        """發送部隊.

        Args:
            server_url: 伺服器 URL
            village_id: 來源村莊 ID
            target_x: 目標 X 座標
            target_y: 目標 Y 座標
            troops: 部隊字典，格式 {"t1": 10, "t2": 5, ...}
            event_type: 任務類型 (3=攻擊, 4=搶奪, 5=援助)

        Returns:
            執行結果
        """
        start_time = datetime.now()

        try:
            # 1. 導航到發兵頁面
            send_url = f"{server_url}/build.php?gid={self.RALLY_POINT_GID}&tt={self.SEND_TROOPS_TAB}"
            if village_id:
                send_url += f"&newdid={village_id}"

            await self._navigate(send_url)
            logger.info(f"導航到發兵頁面: {send_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 輸入座標
            x_input = await self._wait_for_element("#xCoordInput", timeout=5)
            y_input = await self._wait_for_element("#yCoordInput", timeout=5)

            if not x_input or not y_input:
                screenshot = await self._take_screenshot("attack_error_no_coords")
                return ExecutionResult(
                    success=False,
                    error="找不到座標輸入框",
                    screenshot_path=screenshot,
                )

            await self._type_text(x_input, str(target_x))
            await asyncio.sleep(self.human.get_random_delay() * 0.3)
            await self._type_text(y_input, str(target_y))

            # 4. 輸入部隊數量
            for troop_key, count in troops.items():
                if count > 0:
                    # troop_key 格式: "t1", "t2", ... 或 "troop[t1]"
                    if not troop_key.startswith("troop["):
                        input_name = f"troop[{troop_key}]"
                    else:
                        input_name = troop_key

                    troop_input = await self._wait_for_element(
                        f"input[name='{input_name}']", timeout=3
                    )
                    if troop_input:
                        await self._type_text(troop_input, str(count))
                        await asyncio.sleep(self.human.get_random_delay() * 0.2)

            # 5. 選擇任務類型
            event_radio = await self._wait_for_element(
                f"input[name='eventType'][value='{event_type}']", timeout=3
            )
            if event_radio:
                await self._click(event_radio)
                await asyncio.sleep(self.human.get_random_delay() * 0.3)

            # 6. 點擊送出按鈕
            submit_btn = await self._wait_for_element(
                "button[type='submit']", timeout=5
            )
            if not submit_btn:
                screenshot = await self._take_screenshot("attack_error_no_submit")
                return ExecutionResult(
                    success=False,
                    error="找不到送出按鈕",
                    screenshot_path=screenshot,
                )

            await self._click(submit_btn)
            logger.info(f"點擊送出按鈕，目標: ({target_x}, {target_y})")

            # 7. 等待確認頁面
            await asyncio.sleep(self.human.get_random_delay())

            # 8. 點擊確認按鈕（如果有）
            confirm_btn = await self._wait_for_element(
                "button[type='submit'].green, .rallyPointConfirm button", timeout=3
            )
            if confirm_btn:
                await self._click(confirm_btn)
                logger.info("點擊確認按鈕")
                await asyncio.sleep(self.human.get_random_delay())

            # 9. 截圖記錄
            screenshot = await self._take_screenshot(
                f"attack_success_{target_x}_{target_y}"
            )

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功發兵到 ({target_x}, {target_y})",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={
                    "target_x": target_x,
                    "target_y": target_y,
                    "troops": troops,
                    "event_type": event_type,
                },
            )

        except Exception as e:
            logger.error(f"發兵失敗: {e}")
            screenshot = await self._take_screenshot("attack_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()

    async def send_waves(
        self,
        server_url: str,
        village_id: str | None,
        target_x: int,
        target_y: int,
        waves: list[dict[str, int]],
        arrival_time: datetime,
        event_type: str = "3",
        precision_seconds: float = 1.0,
    ) -> ExecutionResult:
        """發送多波壓秒攻擊.

        Args:
            server_url: 伺服器 URL
            village_id: 來源村莊 ID
            target_x: 目標 X 座標
            target_y: 目標 Y 座標
            waves: 波次列表，每個元素是部隊字典
            arrival_time: 目標抵達時間
            event_type: 任務類型 (3=攻擊, 4=搶奪)
            precision_seconds: 精度（秒）

        Returns:
            執行結果

        Note:
            此功能需要精確的時間控制，建議在低延遲環境下使用。
            壓秒精度取決於網路延遲和伺服器響應時間。
        """
        start_time = datetime.now()
        results = []

        try:
            logger.info(f"準備發送 {len(waves)} 波攻擊，目標抵達時間: {arrival_time}")

            # 計算每波的發送時間
            # TODO: 需要從遊戲獲取移動時間來計算
            # 這裡暫時假設所有波次同時發送（最簡單的壓秒）

            for i, wave_troops in enumerate(waves):
                wave_num = i + 1
                logger.info(f"發送第 {wave_num} 波")

                result = await self.send_troops(
                    server_url=server_url,
                    village_id=village_id,
                    target_x=target_x,
                    target_y=target_y,
                    troops=wave_troops,
                    event_type=event_type,
                )

                results.append(
                    {
                        "wave": wave_num,
                        "success": result.success,
                        "message": result.message or result.error,
                    }
                )

                if not result.success:
                    logger.warning(f"第 {wave_num} 波發送失敗: {result.error}")

                # 波次間隔（精度控制）
                if i < len(waves) - 1:
                    await asyncio.sleep(precision_seconds)

            # 統計結果
            success_count = sum(1 for r in results if r["success"])
            total_count = len(results)

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=success_count == total_count,
                message=f"發送 {success_count}/{total_count} 波成功",
                duration_ms=duration,
                details={
                    "target_x": target_x,
                    "target_y": target_y,
                    "total_waves": total_count,
                    "success_waves": success_count,
                    "results": results,
                },
            )

        except Exception as e:
            logger.error(f"多波攻擊失敗: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
                details={"results": results},
            )


class ResourceFieldUpgradeEngine(BaseExecutionEngine):
    """資源田升級引擎.

    負責升級資源田（dorf1.php 頁面的建築）。

    資源田頁面結構 (基於收集到的 HTML):
    - URL: /dorf1.php
    - 容器: #resourceFieldContainer
    - 資源田: a.resourceField.buildingSlot{N} (N=1-18)
    - 屬性: data-aid (位置), data-gid (資源類型: 1=木,2=土,3=鐵,4=糧)
    - 點擊後進入: /build.php?id=N
    - 升級按鈕結構與 BuildExecutionEngine 相同
    """

    # 資源類型對應
    RESOURCE_GID = {
        "wood": 1,
        "clay": 2,
        "iron": 3,
        "crop": 4,
    }

    async def execute(
        self,
        server_url: str,
        village_id: str | None,
        field_position: int,
    ) -> ExecutionResult:
        """升級指定位置的資源田.

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID
            field_position: 資源田位置 (1-18)

        Returns:
            執行結果
        """
        if not self.config.ENABLE_BUILD_EXECUTION:
            return ExecutionResult(
                success=False,
                error="建造執行功能已停用",
            )

        start_time = datetime.now()

        try:
            # 1. 直接導航到資源田建築頁面
            build_url = f"{server_url}/build.php?id={field_position}"
            if village_id:
                build_url += f"&newdid={village_id}"

            await self._navigate(build_url)
            logger.info(f"導航到資源田頁面: {build_url}")

            # 2. 等待頁面載入
            await asyncio.sleep(self.human.get_random_delay())

            # 3. 找到升級按鈕並點擊
            # 與 BuildExecutionEngine 相同的選擇器
            upgrade_selectors = [
                ".upgradeButtonsContainer .section1 button.textButtonV1:not(.gold)",
                ".section1 button[onclick*='action=build']:not(.gold)",
                ".upgradeButtonsContainer button.green:not(.gold)",
                "button.textButtonV1.green:not(.gold)",
                ".build:not(.gold)",
            ]

            upgrade_btn = None
            for selector in upgrade_selectors:
                upgrade_btn = await self._wait_for_element(selector, timeout=5)
                if upgrade_btn:
                    break

            if not upgrade_btn:
                # 檢查是否有錯誤訊息
                error_msg = await self._wait_for_element(
                    ".buildingCondition.error, .notEnoughResources", timeout=2
                )
                if error_msg:
                    screenshot = await self._take_screenshot(
                        "resource_error_insufficient"
                    )
                    return ExecutionResult(
                        success=False,
                        error="資源不足或不符合升級條件",
                        screenshot_path=screenshot,
                    )

                screenshot = await self._take_screenshot("resource_error_no_button")
                return ExecutionResult(
                    success=False,
                    error="找不到升級按鈕（可能資源不足或已達等級上限）",
                    screenshot_path=screenshot,
                )

            # 4. 執行點擊
            await self._click(upgrade_btn)
            logger.info(f"點擊資源田升級按鈕: 位置 {field_position}")

            # 5. 等待並驗證
            await asyncio.sleep(self.human.get_random_delay())

            # 6. 截圖記錄
            screenshot = await self._take_screenshot(
                f"resource_success_pos{field_position}"
            )

            duration = int((datetime.now() - start_time).total_seconds() * 1000)

            return ExecutionResult(
                success=True,
                message=f"成功升級資源田位置 {field_position}",
                screenshot_path=screenshot,
                duration_ms=duration,
                details={"field_position": field_position},
            )

        except Exception as e:
            logger.error(f"執行資源田升級失敗: {e}")
            screenshot = await self._take_screenshot("resource_error_exception")
            return ExecutionResult(
                success=False,
                error=str(e),
                screenshot_path=screenshot,
            )

        finally:
            await self._stop_browser()

    async def find_best_field_to_upgrade(
        self,
        server_url: str,
        village_id: str | None,
        resource_type: str | None = None,
    ) -> dict | None:
        """找出最適合升級的資源田.

        Args:
            server_url: 伺服器 URL
            village_id: 村莊 ID
            resource_type: 資源類型 (wood/clay/iron/crop)，None 表示任意

        Returns:
            最佳資源田資訊，包含 position 和 level
        """
        try:
            # 導航到資源田頁面
            dorf1_url = f"{server_url}/dorf1.php"
            if village_id:
                dorf1_url += f"?newdid={village_id}"

            await self._navigate(dorf1_url)
            await asyncio.sleep(self.human.get_random_delay())

            # 取得所有資源田
            # 這裡需要 JavaScript 執行來解析頁面
            # 暫時返回 None，實際實作需要更複雜的頁面解析
            logger.warning("find_best_field_to_upgrade 尚未完全實作")
            return None

        except Exception as e:
            logger.error(f"查找最佳資源田失敗: {e}")
            return None


class ExecutionEngineFactory:
    """執行引擎工廠.

    根據任務類型建立對應的執行引擎。
    """

    @staticmethod
    def create(execution_type: ExecutionType) -> BaseExecutionEngine:
        """建立執行引擎.

        Args:
            execution_type: 執行類型

        Returns:
            對應的執行引擎實例

        Raises:
            ValueError: 不支援的執行類型
        """
        if execution_type == ExecutionType.BUILD:
            return BuildExecutionEngine()
        elif execution_type == ExecutionType.TRAIN:
            return TrainExecutionEngine()
        elif execution_type == ExecutionType.TRANSPORT:
            return TransportExecutionEngine()
        elif execution_type == ExecutionType.KEEPALIVE:
            return KeepAliveExecutionEngine()
        else:
            raise ValueError(f"不支援的執行類型: {execution_type}")
