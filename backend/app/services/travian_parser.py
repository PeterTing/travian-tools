"""Travian HTML 解析器.

參考 travian-bot 專案的解析邏輯，使用 BeautifulSoup 進行精確的 HTML 解析。
主要負責從 Travian 頁面 HTML 中提取：
- 資源狀態和生產率（從內嵌 JSON）
- 建築資訊（從 CSS class 編碼）
- 部隊資訊（從多個 tab）
- 村莊列表（從 sidebar）
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None  # type: ignore

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
class ParsedResources:
    """解析後的資源資訊."""

    wood: int = 0
    clay: int = 0
    iron: int = 0
    crop: int = 0
    free_crop: int = 0
    warehouse_capacity: int = 0
    granary_capacity: int = 0
    wood_production: int = 0
    clay_production: int = 0
    iron_production: int = 0
    crop_production: int = 0


@dataclass
class ParsedBuilding:
    """解析後的建築資訊."""

    slot_id: int  # 1-40
    gid: int  # 建築類型 ID
    level: int
    name: str = ""
    is_under_construction: bool = False


@dataclass
class ParsedBuildingQueueItem:
    """解析後的建築佇列項目."""

    name: str
    level: int
    finish_time: str
    countdown_seconds: int


@dataclass
class ParsedTroop:
    """解析後的部隊資訊."""

    unit_id: int
    name: str
    count: int


@dataclass
class ParsedTroopMovement:
    """部隊移動資訊."""

    movement_type: str  # incoming_attack, outgoing, returning, reinforcing_others, etc.
    origin: str
    destination: str
    troops: list["ParsedTroop"]
    arrival_time: str = ""
    countdown_seconds: int = 0


@dataclass
class ParsedOasisTroops:
    """綠洲部隊資訊."""

    oasis: str
    troops: list["ParsedTroopMovement"]


@dataclass
class ParsedTroopOverview:
    """部隊總覽."""

    own_troops: list["ParsedTroop"]
    reinforcements: list["ParsedTroop"]
    reinforcing_others: list["ParsedTroopMovement"]  # 增援到其他村莊的部隊
    in_oases: list["ParsedOasisTroops"]  # 在綠洲的部隊
    crop_consumption: int = 0


@dataclass
class ParsedVillage:
    """解析後的村莊資訊."""

    village_id: str
    name: str
    x: int
    y: int
    is_capital: bool = False
    has_attack: bool = False


class TravianParser:
    """Travian HTML 解析器.

    使用 BeautifulSoup 解析 Travian 頁面 HTML，
    採用與 travian-bot 相同的解析策略以確保準確性。
    """

    @staticmethod
    def parse_resources(html: str) -> ParsedResources:
        """從 HTML 解析資源資訊.

        資源值來自 #l1, #l2, #l3, #l4 元素。
        生產率和倉庫容量來自內嵌的 JavaScript JSON。

        Args:
            html: dorf1.php 頁面的 HTML

        Returns:
            ParsedResources 物件
        """
        result = ParsedResources()

        if BeautifulSoup is None:
            logger.warning("BeautifulSoup not installed, using regex fallback")
            return TravianParser._parse_resources_regex(html)

        try:
            soup = BeautifulSoup(html, "lxml")

            # 解析當前資源（頂部欄位）
            l1 = soup.select_one("#l1")
            l2 = soup.select_one("#l2")
            l3 = soup.select_one("#l3")
            l4 = soup.select_one("#l4")

            if l1:
                result.wood = _parse_number(l1.get_text())
            if l2:
                result.clay = _parse_number(l2.get_text())
            if l3:
                result.iron = _parse_number(l3.get_text())
            if l4:
                result.crop = _parse_number(l4.get_text())

            # 解析剩餘糧食
            free_crop = soup.select_one("#stockBarFreeCrop")
            if free_crop:
                result.free_crop = _parse_number(free_crop.get_text())

            # 從內嵌 JavaScript 解析生產率
            # 格式: production: {"l1": 1750, "l2": 1750, "l3": 1750, "l4": 1973}
            production = TravianParser._parse_json_block(html, "production")
            if production:
                result.wood_production = production.get("l1", 0)
                result.clay_production = production.get("l2", 0)
                result.iron_production = production.get("l3", 0)
                result.crop_production = production.get("l4", 0)

            # 從內嵌 JavaScript 解析倉庫容量
            # 格式: maxStorage: {"l1": 37900, "l2": 37900, "l3": 37900, "l4": 37900}
            max_storage = TravianParser._parse_json_block(html, "maxStorage")
            if max_storage:
                # l1-l3 是倉庫容量（相同），l4 是穀倉容量
                result.warehouse_capacity = max_storage.get("l1", 0)
                result.granary_capacity = max_storage.get("l4", 0)

            logger.debug(
                f"Parsed resources: wood={result.wood}, clay={result.clay}, "
                f"iron={result.iron}, crop={result.crop}, "
                f"production=({result.wood_production}, {result.clay_production}, "
                f"{result.iron_production}, {result.crop_production}), "
                f"warehouse={result.warehouse_capacity}, granary={result.granary_capacity}"
            )

        except Exception as e:
            logger.warning(f"Error parsing resources: {e}")

        return result

    @staticmethod
    def _parse_resources_regex(html: str) -> ParsedResources:
        """使用 regex 作為 fallback 解析資源."""
        result = ParsedResources()

        # 解析資源值
        for i, attr in enumerate(["wood", "clay", "iron", "crop"], 1):
            match = re.search(rf'id="l{i}"[^>]*>([^<]+)', html)
            if match:
                setattr(result, attr, _parse_number(match.group(1)))

        # 解析生產率
        prod_match = re.search(
            r'production:\s*\{\s*"l1":\s*(-?\d+)\s*,\s*"l2":\s*(-?\d+)\s*,\s*"l3":\s*(-?\d+)\s*,\s*"l4":\s*(-?\d+)',
            html,
        )
        if prod_match:
            result.wood_production = int(prod_match.group(1))
            result.clay_production = int(prod_match.group(2))
            result.iron_production = int(prod_match.group(3))
            result.crop_production = int(prod_match.group(4))

        # 解析倉庫容量
        storage_match = re.search(
            r'maxStorage:\s*\{\s*"l1":\s*(\d+).*?"l4":\s*(\d+)', html, re.DOTALL
        )
        if storage_match:
            result.warehouse_capacity = int(storage_match.group(1))
            result.granary_capacity = int(storage_match.group(2))

        return result

    @staticmethod
    def _parse_json_block(html: str, key: str) -> dict[str, int]:
        """從 HTML 中解析內嵌的 JSON 區塊.

        Travian 在頁面中嵌入 JavaScript 變數，如：
        production: {"l1": 1750, "l2": 1750, "l3": 1750, "l4": 1973}

        Args:
            html: HTML 內容
            key: JSON 區塊的 key（如 "production", "maxStorage"）

        Returns:
            解析後的 dict
        """
        try:
            # 嘗試匹配 key: {...} 格式
            pattern = rf'{key}:\s*(\{{"l1":\s*-?\d+.*?\}})'
            match = re.search(pattern, html)
            if match:
                json_str = match.group(1)
                return json.loads(json_str)
        except Exception as e:
            logger.debug(f"Failed to parse JSON block '{key}': {e}")

        return {}

    @staticmethod
    def parse_buildings(html: str) -> list[ParsedBuilding]:
        """從 HTML 解析建築資訊.

        Travian 在 CSS class 中編碼建築資訊：
        - a{N}: 建築格子 ID (1-40)
        - g{N}: 建築類型 ID (gid)
        - level{N}: 建築等級

        Args:
            html: dorf1.php 或 dorf2.php 頁面的 HTML

        Returns:
            建築列表
        """
        buildings = []

        if BeautifulSoup is None:
            logger.warning("BeautifulSoup not installed, skipping building parse")
            return buildings

        try:
            soup = BeautifulSoup(html, "lxml")

            for slot in soup.select(".buildingSlot"):
                classes = slot.get("class", [])
                if isinstance(classes, list):
                    class_str = " ".join(classes)
                else:
                    class_str = classes

                # 解析格子 ID (a1-a40)
                id_match = re.search(r"a(\d+)", class_str)
                slot_id = int(id_match.group(1)) if id_match else 0

                # 解析建築類型 ID (g1-g40)
                gid_match = re.search(r"g(\d+)", class_str)
                gid = int(gid_match.group(1)) if gid_match else 0

                # 解析等級 - 可能在 class 或 .labelLayer 中
                level = 0
                level_match = re.search(r"level(\d+)", class_str)
                if level_match:
                    level = int(level_match.group(1))
                else:
                    # 嘗試從 .labelLayer 取得
                    label = slot.select_one(".labelLayer")
                    if label:
                        label_text = label.get_text().strip()
                        if label_text.isdigit():
                            level = int(label_text)

                # 取得建築名稱
                name = slot.get("data-name", "") or slot.get("title", "")

                if slot_id > 0:
                    buildings.append(
                        ParsedBuilding(
                            slot_id=slot_id,
                            gid=gid,
                            level=level,
                            name=name,
                        )
                    )

            logger.debug(f"Parsed {len(buildings)} buildings")

        except Exception as e:
            logger.warning(f"Error parsing buildings: {e}")

        return buildings

    @staticmethod
    def parse_building_queue(html: str) -> list[ParsedBuildingQueueItem]:
        """從 HTML 解析建築佇列.

        Args:
            html: dorf1.php 或 dorf2.php 頁面的 HTML

        Returns:
            建築佇列列表
        """
        queue = []

        if BeautifulSoup is None:
            return queue

        try:
            soup = BeautifulSoup(html, "lxml")

            # 尋找建築列表
            building_list = soup.select_one(".buildingList")
            if not building_list:
                return queue

            # 解析每個建築項目
            for item in building_list.select("li, .buildingWrapper"):
                try:
                    # 取得名稱
                    name_elem = item.select_one(".name a, .name")
                    name = name_elem.get_text().strip() if name_elem else "未知建築"

                    # 取得等級
                    level = 0
                    level_elem = item.select_one(".lvl, .level")
                    if level_elem:
                        level_text = level_elem.get_text()
                        level_match = re.search(r"\d+", level_text)
                        if level_match:
                            level = int(level_match.group())

                    # 取得倒數計時
                    timer = item.select_one(".timer[value], span.timer")
                    countdown = 0
                    finish_time = ""
                    if timer:
                        countdown_val = timer.get("value")
                        if countdown_val:
                            countdown = int(countdown_val)
                        finish_time = timer.get_text().strip()

                    if name and countdown > 0:
                        queue.append(
                            ParsedBuildingQueueItem(
                                name=name,
                                level=level,
                                finish_time=finish_time,
                                countdown_seconds=countdown,
                            )
                        )
                except Exception:
                    continue

            logger.debug(f"Parsed {len(queue)} building queue items")

        except Exception as e:
            logger.warning(f"Error parsing building queue: {e}")

        return queue

    @staticmethod
    def parse_village_list(html: str) -> list[ParsedVillage]:
        """從 HTML 解析村莊列表.

        村莊列表在 sidebar 的 #sidebarBoxVillageList 中。

        Args:
            html: 任何 Travian 頁面的 HTML

        Returns:
            村莊列表
        """
        villages = []

        if BeautifulSoup is None:
            return villages

        try:
            soup = BeautifulSoup(html, "lxml")

            # 尋找村莊列表
            for entry in soup.select(
                ".listEntry.village, #sidebarBoxVillageList .listEntry"
            ):
                try:
                    # 取得村莊 ID
                    village_id = entry.get("data-did", "")
                    if not village_id:
                        continue

                    # 取得名稱
                    name_elem = entry.select_one("span.name, .name")
                    name = (
                        _clean_text(name_elem.get_text()) if name_elem else "未知村莊"
                    )

                    # 取得座標
                    x, y = 0, 0
                    x_elem = entry.select_one(".coordinateX")
                    y_elem = entry.select_one(".coordinateY")
                    if x_elem and y_elem:
                        x_text = x_elem.get_text()
                        y_text = y_elem.get_text()
                        # 處理 Unicode 負號
                        x = _parse_number(x_text)
                        y = _parse_number(y_text)

                    # 檢查是否為主城
                    is_capital = entry.select_one(".isCapital, .capital") is not None

                    # 檢查是否有攻擊
                    entry_classes = entry.get("class", [])
                    if isinstance(entry_classes, list):
                        has_attack = "attack" in entry_classes
                    else:
                        has_attack = "attack" in entry_classes.split()

                    villages.append(
                        ParsedVillage(
                            village_id=village_id,
                            name=name,
                            x=x,
                            y=y,
                            is_capital=is_capital,
                            has_attack=has_attack,
                        )
                    )

                except Exception as e:
                    logger.debug(f"Error parsing village entry: {e}")
                    continue

            logger.debug(f"Parsed {len(villages)} villages")

        except Exception as e:
            logger.warning(f"Error parsing village list: {e}")

        return villages

    @staticmethod
    def parse_own_troops(html: str) -> ParsedTroopOverview:
        """從集結點 tt=1 頁面解析本村部隊.

        URL: build.php?id=39&gid=16&tt=1

        解析以下區塊：
        - 在本村的部隊（自軍、增援）
        - 在他村的部隊（增援到其他村莊）
        - 在綠洲的部隊

        Args:
            html: 集結點 tt=1 頁面的 HTML

        Returns:
            部隊總覽
        """
        result = ParsedTroopOverview(
            own_troops=[],
            reinforcements=[],
            reinforcing_others=[],
            in_oases=[],
            crop_consumption=0,
        )

        if BeautifulSoup is None:
            return result

        try:
            soup = BeautifulSoup(html, "lxml")

            current_section = ""

            # 遍歷 h4（區塊標題）和 table.troop_details
            for el in soup.select("h4, table.troop_details, div.at_details"):
                tag_name = el.name.lower() if el.name else ""

                if tag_name == "h4":
                    # 區塊標題
                    current_section = el.get_text().strip()

                elif tag_name == "table" and "troop_details" in el.get("class", []):
                    headline = el.select_one(".troopHeadline")
                    headline_text = headline.get_text().strip() if headline else ""

                    role = el.select_one("td.role")
                    role_text = role.get_text().strip() if role else ""

                    troops = TravianParser._parse_troop_table(el)

                    if troops:
                        # 判斷屬於哪個區塊
                        if (
                            "在本村" in current_section
                            or "in this village" in current_section.lower()
                            or "Troops in this village" in current_section
                        ):
                            # 在本村的部隊
                            if (
                                "自軍" in headline_text
                                or "Troops" in headline_text
                                or "Own" in headline_text
                            ):
                                result.own_troops = troops
                            else:
                                result.reinforcements.extend(troops)

                            # 解析糧食消耗
                            supply = el.select_one(".supplyWrapper .value")
                            if supply:
                                supply_text = supply.get_text().strip()
                                result.crop_consumption += _parse_number(supply_text)

                        elif (
                            "在他村" in current_section
                            or "other villages" in current_section.lower()
                        ):
                            # 增援到其他村莊
                            result.reinforcing_others.append(
                                ParsedTroopMovement(
                                    movement_type="reinforcing_others",
                                    origin=role_text,
                                    destination=headline_text,
                                    troops=troops,
                                )
                            )

                elif tag_name == "div" and "at_details" in el.get("class", []):
                    # 綠洲部隊
                    h5 = el.select_one("h5")
                    oasis_name = h5.get_text().strip() if h5 else "綠洲"

                    oasis_troops: list[ParsedTroopMovement] = []

                    for table in el.select("table.troop_details"):
                        headline = table.select_one(".troopHeadline")
                        headline_text = headline.get_text().strip() if headline else ""

                        role = table.select_one("td.role")
                        role_text = role.get_text().strip() if role else ""

                        troops = TravianParser._parse_troop_table(table)

                        if troops:
                            oasis_troops.append(
                                ParsedTroopMovement(
                                    movement_type="in_oasis",
                                    origin=role_text,
                                    destination=headline_text,
                                    troops=troops,
                                )
                            )

                    if oasis_troops:
                        result.in_oases.append(
                            ParsedOasisTroops(
                                oasis=oasis_name,
                                troops=oasis_troops,
                            )
                        )

            logger.debug(
                f"Parsed troops: {len(result.own_troops)} own, "
                f"{len(result.reinforcements)} reinforcements, "
                f"{len(result.reinforcing_others)} reinforcing others, "
                f"{len(result.in_oases)} oases, "
                f"crop consumption: {result.crop_consumption}"
            )

        except Exception as e:
            logger.warning(f"Error parsing own troops: {e}")

        return result

    @staticmethod
    def parse_troops_out(html: str) -> list[ParsedTroopMovement]:
        """從集結點 tt=2 頁面解析外出部隊.

        URL: build.php?id=39&gid=16&tt=2

        Args:
            html: 集結點 tt=2 頁面的 HTML

        Returns:
            部隊移動列表
        """
        movements = []

        if BeautifulSoup is None:
            return movements

        try:
            soup = BeautifulSoup(html, "lxml")

            for table in soup.select("table.troop_details"):
                role = table.select_one("td.role a")
                headline = table.select_one(".troopHeadline a")

                origin = role.get_text().strip() if role else ""
                destination = headline.get_text().strip() if headline else ""

                troops = TravianParser._parse_troop_table(table)

                if troops:
                    # 解析倒數計時
                    timer = table.select_one(".timer[value]")
                    countdown = 0
                    arrival_time = ""
                    if timer:
                        countdown_val = timer.get("value")
                        if countdown_val:
                            countdown = int(countdown_val)
                        arrival_time = timer.get_text().strip()

                    movements.append(
                        ParsedTroopMovement(
                            movement_type="outgoing",
                            origin=origin,
                            destination=destination,
                            troops=troops,
                            arrival_time=arrival_time,
                            countdown_seconds=countdown,
                        )
                    )

            logger.debug(f"Parsed {len(movements)} troop movements (out)")

        except Exception as e:
            logger.warning(f"Error parsing troops out: {e}")

        return movements

    @staticmethod
    def parse_incoming(html: str) -> list[ParsedTroopMovement]:
        """從集結點 tt=3 頁面解析來襲部隊.

        URL: build.php?id=39&gid=16&tt=3

        Args:
            html: 集結點 tt=3 頁面的 HTML

        Returns:
            部隊移動列表
        """
        movements = []

        if BeautifulSoup is None:
            return movements

        try:
            soup = BeautifulSoup(html, "lxml")

            for table in soup.select("table.troop_details"):
                role = table.select_one("td.role a")
                headline = table.select_one(".troopHeadline a")

                origin = headline.get_text().strip() if headline else ""
                destination = role.get_text().strip() if role else ""

                troops = TravianParser._parse_troop_table(table)

                # 判斷是攻擊還是支援
                mark_attack = table.select_one("a.markAttack")
                if mark_attack:
                    movement_type = "incoming_attack"
                else:
                    movement_type = "incoming_reinforcement"

                # 解析倒數計時
                timer = table.select_one(".timer[value]")
                countdown = 0
                arrival_time = ""
                if timer:
                    countdown_val = timer.get("value")
                    if countdown_val:
                        countdown = int(countdown_val)
                    arrival_time = timer.get_text().strip()

                movements.append(
                    ParsedTroopMovement(
                        movement_type=movement_type,
                        origin=origin,
                        destination=destination,
                        troops=troops,
                        arrival_time=arrival_time,
                        countdown_seconds=countdown,
                    )
                )

            logger.debug(f"Parsed {len(movements)} incoming movements")

        except Exception as e:
            logger.warning(f"Error parsing incoming: {e}")

        return movements

    @staticmethod
    def _parse_troop_table(table: Any) -> list[ParsedTroop]:
        """解析單個部隊表格.

        部隊資訊編碼在 img.unit 的 class 中：
        - u{N}: 部隊類型 ID
        - alt: 部隊名稱

        數量在 tbody.units.last 的 td.unit 中。

        Args:
            table: BeautifulSoup 的 table 元素

        Returns:
            部隊列表
        """
        troops = []

        try:
            # 收集部隊 ID 和名稱
            unit_ids = []
            unit_names = []

            for img in table.select("img.unit"):
                class_str = img.get("class", [])
                if isinstance(class_str, list):
                    class_str = " ".join(class_str)

                unit_match = re.search(r"u(\d+)", class_str)
                if unit_match:
                    unit_id = int(unit_match.group(1))
                    # 跳過英雄
                    if unit_id == 0:
                        continue
                    unit_ids.append(unit_id)
                    unit_names.append(img.get("alt", f"u{unit_id}"))

            # 收集數量 - 從 tbody.units.last 或 tbody.units:last-of-type
            counts = []
            count_row = table.select_one(
                "tbody.units.last tr, tbody.units:last-of-type tr"
            )
            if count_row:
                for td in count_row.select("td.unit"):
                    text = td.get_text().strip()
                    count = _parse_number(text) if text else 0
                    counts.append(count)

            # 組合部隊資訊
            for i, unit_id in enumerate(unit_ids):
                if i < len(counts) and counts[i] > 0:
                    troops.append(
                        ParsedTroop(
                            unit_id=unit_id,
                            name=unit_names[i]
                            if i < len(unit_names)
                            else f"u{unit_id}",
                            count=counts[i],
                        )
                    )

        except Exception as e:
            logger.debug(f"Error parsing troop table: {e}")

        return troops

    @staticmethod
    def parse_attack_indicator(html: str) -> int:
        """從頂部導航列解析攻擊指示器數量.

        Args:
            html: 任何 Travian 頁面的 HTML

        Returns:
            攻擊指示器數量
        """
        if BeautifulSoup is None:
            return 0

        try:
            soup = BeautifulSoup(html, "lxml")
            # 攻擊圖示可能是 svg.attack 或 .attack1, .attack2, .attack3
            attack_icons = soup.select("svg.attack, .attack1, .attack2, .attack3")
            return len(attack_icons)
        except Exception:
            return 0
