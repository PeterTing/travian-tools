"""AI 策略諮詢服務（Claude API 整合 + RAG 知識庫 + Tool Use）."""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any, cast

from anthropic import Anthropic, APIError, AuthenticationError, RateLimitError
from anthropic.types import (
    MessageParam,
    TextBlock,
    ToolParam,
    ToolResultBlockParam,
    ToolUseBlock,
)
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.domain.schemas.strategy import (
    ConversationHistoryResponse,
    ConversationMessage,
    StrategyAdviceResponse,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.village import Village
from app.knowledge_base.rag_service import (
    format_knowledge_for_prompt,
    retrieve_knowledge,
)
from app.services.game_data_service import get_game_data_service
from app.services.strategy_service import PHASE_STANDARDS, StrategyService

logger = logging.getLogger(__name__)


# ============ Tool Definitions for Claude Tool Use ============

GAME_DATA_TOOLS: list[ToolParam] = [
    {
        "name": "get_building_info",
        "description": "查詢 Travian 建築的詳細資料，包括各等級的建造成本（木材、磚塊、鐵礦、糧食）、建造時間、人口消耗、文化點等。使用此工具來提供準確的建築數據。",
        "input_schema": {
            "type": "object",
            "properties": {
                "building_id": {
                    "type": "string",
                    "description": "建築 ID，例如：main_building（主建築）、barracks（兵營）、stable（馬廄）、heros_mansion（英雄館）、academy（研究院）、warehouse（倉庫）、granary（糧倉）、marketplace（市場）、residence（行宮）、palace（皇宮）、town_hall（城鎮廳）、smithy（鐵匠鋪）、rally_point（集合點）、wall（城牆）",
                },
            },
            "required": ["building_id"],
        },
    },
    {
        "name": "get_building_level_cost",
        "description": "查詢建築特定等級的詳細建造成本，包括各資源需求、建造時間、人口消耗等。",
        "input_schema": {
            "type": "object",
            "properties": {
                "building_id": {
                    "type": "string",
                    "description": "建築 ID",
                },
                "level": {
                    "type": "integer",
                    "description": "要查詢的等級（1-20）",
                },
            },
            "required": ["building_id", "level"],
        },
    },
    {
        "name": "calculate_upgrade_cost",
        "description": "計算建築從某等級升到目標等級的總成本，包括所有中間等級的累計資源需求。",
        "input_schema": {
            "type": "object",
            "properties": {
                "building_id": {
                    "type": "string",
                    "description": "建築 ID",
                },
                "from_level": {
                    "type": "integer",
                    "description": "起始等級（0 表示尚未建造）",
                },
                "to_level": {
                    "type": "integer",
                    "description": "目標等級",
                },
            },
            "required": ["building_id", "from_level", "to_level"],
        },
    },
    {
        "name": "list_buildings",
        "description": "列出所有可用的建築，可依類別篩選。類別包括：infrastructure（基礎設施）、military（軍事）、resource（資源）、defense（防禦）、special（特殊）。",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "建築類別篩選",
                    "enum": [
                        "infrastructure",
                        "military",
                        "resource",
                        "defense",
                        "special",
                    ],
                },
            },
        },
    },
    {
        "name": "get_troop_info",
        "description": "查詢 Travian 兵種的詳細資料，包括攻防數值、訓練成本、速度、載重量等。",
        "input_schema": {
            "type": "object",
            "properties": {
                "troop_id": {
                    "type": "string",
                    "description": "兵種 ID，例如：legionnaire（軍團兵）、praetorian（禁衛兵）、imperian（帝國兵）、phalanx（方陣兵）、swordsman（劍士）、clubswinger（棍棒兵）、spearman（矛兵）等",
                },
            },
            "required": ["troop_id"],
        },
    },
    {
        "name": "list_troops",
        "description": "列出所有可用的兵種，可依種族篩選。",
        "input_schema": {
            "type": "object",
            "properties": {
                "tribe": {
                    "type": "string",
                    "description": "種族篩選",
                    "enum": [
                        "romans",
                        "gauls",
                        "teutons",
                        "huns",
                        "egyptians",
                        "spartans",
                    ],
                },
            },
        },
    },
    {
        "name": "get_resource_field_info",
        "description": "查詢資源田（伐木場、採土場、鐵礦場、農田）的各等級產量和建造成本。",
        "input_schema": {
            "type": "object",
            "properties": {
                "resource_type": {
                    "type": "string",
                    "description": "資源類型",
                    "enum": ["wood", "clay", "iron", "crop"],
                },
            },
            "required": ["resource_type"],
        },
    },
]


# ============ System Prompt Template ============

SYSTEM_PROMPT = """你是 Travian: Legends 遊戲的專業策略顧問。你對這款複雜的網頁即時策略遊戲有深入的了解，包括：

## 你的專業知識
- **資源系統**: 木材、磚塊、鐵礦、糧食四種資源的管理
- **建築系統**: 約 40 種建築的升級策略和優先順序
- **兵種系統**: 7 個種族（羅馬、高盧、條頓、匈奴、埃及、維京、斯巴達）的部隊特性
- **村莊擴張**: 文化點累積和新村開設策略
- **戰鬥機制**: 攻防計算、城牆效果、部隊配置
- **遊戲階段**: 從新手保護期到 WW 終局的策略轉變

## 當前玩家資訊
{player_context}

{knowledge_context}

## 回應格式要求
請以中文回答，提供：
1. **階段分析**: 簡短說明玩家當前所處階段和進度
2. **立即行動** (1-3 項): 現在應該做的事
3. **短期計畫** (1-3 天): 接下來幾天的目標
4. **風險提醒** (如有): 需要注意的問題

**重要**: 請參考「相關知識參考」中的資料來回答問題，確保建議符合當前遊戲版本的策略。

保持回答簡潔實用，避免過於冗長。"""


class AIService:
    """AI 策略諮詢服務."""

    # 簡單的內存對話歷史存儲（生產環境應該用資料庫）
    _conversations: dict[str, list[dict]] = {}
    _conversation_timestamps: dict[str, datetime] = {}

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db
        self.strategy_service = StrategyService(db)

        # 初始化 Claude client
        self.client: Anthropic | None = None
        if settings.ANTHROPIC_API_KEY:
            # 支援自訂 base_url（用於代理或 Docker 網路問題解決）
            if settings.ANTHROPIC_BASE_URL:
                self.client = Anthropic(
                    api_key=settings.ANTHROPIC_API_KEY,
                    base_url=settings.ANTHROPIC_BASE_URL,
                )
            else:
                self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _verify_account_ownership(
        self, account_id: str, user_id: str
    ) -> GameAccount | None:
        """驗證帳號所有權並返回帳號."""
        account = (
            self.db.query(GameAccount)
            .options(
                joinedload(GameAccount.villages).joinedload(Village.building_instances)
            )
            .options(
                joinedload(GameAccount.villages).joinedload(Village.troop_instances)
            )
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )
        return account

    def _build_player_context(self, account: GameAccount) -> tuple[str, dict]:
        """建構玩家上下文資訊.

        Returns:
            tuple: (context_string, player_info_dict)
        """
        villages = account.villages or []
        village_count = len(villages)
        total_population = sum(v.population or 0 for v in villages)
        # 使用自動計算的伺服器天數
        day = account.current_server_day

        # 判斷階段
        phase = self.strategy_service._determine_phase(day)
        phase_info = PHASE_STANDARDS[phase]

        # 評估進度
        progress_status, progress_desc = self.strategy_service._evaluate_progress(
            phase, village_count, total_population
        )
        progress_labels = {"ahead": "領先", "normal": "正常", "behind": "落後"}
        progress_label = progress_labels.get(
            progress_status.value, progress_status.value
        )

        # 計算部隊數量（優先使用 total，否則用 home）
        total_troops = 0
        for village in villages:
            for troop in village.troop_instances or []:
                # 優先計算 total（總兵力），避免重複計算
                if troop.location == "total":
                    total_troops += troop.count or 0

        # 如果沒有 total 資料，fallback 到 home
        if total_troops == 0:
            for village in villages:
                for troop in village.troop_instances or []:
                    if troop.location == "home":
                        total_troops += troop.count or 0

        # 建構村莊摘要
        village_summaries = []
        for v in villages[:5]:  # 最多顯示 5 個村莊
            buildings_count = len(v.building_instances or [])
            # 優先顯示總兵力，否則顯示在村莊內的兵力
            troops_total = sum(
                t.count or 0 for t in (v.troop_instances or []) if t.location == "total"
            )
            troops_home = sum(
                t.count or 0 for t in (v.troop_instances or []) if t.location == "home"
            )
            # 村莊類型標記
            type_label = ""
            if v.village_type:
                type_label = f" [{v.village_type.value}]"
            elif v.is_capital:
                type_label = " [首都]"
            # 村莊角色
            role_label = f" ({v.role.value})" if v.role else ""
            # 部隊顯示：如果有總兵力就顯示總兵力，否則顯示在村莊內
            if troops_total > 0:
                troops_label = f"總兵力 {troops_total}"
            elif troops_home > 0:
                troops_label = f"在村莊 {troops_home}"
            else:
                troops_label = "部隊 0"
            village_summaries.append(
                f"  - {v.name or '未命名'}{type_label}{role_label}: "
                f"人口 {v.population or 0}, 建築 {buildings_count} 個, {troops_label}"
            )

        # 階段標準
        standard = phase_info["standard"]

        # 統計村莊類型
        village_types = [v.village_type.value for v in villages if v.village_type]
        has_15c = any(
            v.village_type and v.village_type.value == "15c" for v in villages
        )

        # 給 RAG 用的玩家資訊
        player_info = {
            "tribe": account.tribe.value if account.tribe else None,
            "day": day,
            "phase": phase,
            "progress_status": progress_status.value,
            "village_count": village_count,
            "total_population": total_population,
            "village_types": village_types,
            "has_15c": has_15c,
        }

        context = f"""
- **種族**: {account.tribe.value if account.tribe else "未知"}
- **伺服器天數**: Day {day}
- **遊戲階段**: {phase_info["name_zh"]} ({phase_info["description"]})
- **進度狀態**: {progress_label} - {progress_desc}
- **村莊數**: {village_count} (階段目標: {standard.target_villages})
- **總人口**: {total_population} (階段目標: {standard.target_population})
- **部隊總數**: {total_troops}
- **聯盟**: {account.alliance_name or "無"}

**村莊列表**:
{chr(10).join(village_summaries) if village_summaries else "  - 無村莊數據"}

**重要**: 請根據上述「進度狀態」來評估玩家的發展情況，如果顯示「落後」就表示玩家進度不理想，需要加快發展。
"""
        return context, player_info

    def _execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> str:
        """執行工具並返回結果.

        Args:
            tool_name: 工具名稱
            tool_input: 工具輸入參數

        Returns:
            工具執行結果的字串
        """
        try:
            game_data = get_game_data_service()

            if tool_name == "get_building_info":
                building_id = tool_input.get("building_id", "")
                building = game_data.buildings.get_building(building_id)
                if not building:
                    return f"找不到建築 '{building_id}'。請使用 list_buildings 工具查看可用的建築 ID。"

                # 建構詳細資訊
                result = f"## {building.name_zh} ({building.name_en})\n\n"
                result += f"- **類別**: {building.category.value}\n"
                result += f"- **最高等級**: {building.max_level}\n"
                if building.description_zh:
                    result += f"- **說明**: {building.description_zh}\n"

                if building.prerequisites:
                    result += "\n**前置需求**:\n"
                    for prereq in building.prerequisites:
                        result += f"- {prereq.building_id} 等級 {prereq.level}\n"

                result += "\n### 各等級成本與效果\n\n"
                result += "| 等級 | 木材 | 磚塊 | 鐵礦 | 糧食 | 總計 | 建造時間(秒) | 人口 | 文化點 | 效果 |\n"
                result += "|------|------|------|------|------|------|--------------|------|--------|------|\n"

                for level in building.levels:
                    total = (
                        level.cost_wood
                        + level.cost_clay
                        + level.cost_iron
                        + level.cost_crop
                    )
                    effect = level.effect_description or "-"
                    result += f"| {level.level} | {level.cost_wood:,} | {level.cost_clay:,} | {level.cost_iron:,} | {level.cost_crop:,} | {total:,} | {level.build_time_base:,} | {level.population} | {level.culture_points} | {effect} |\n"

                return result

            elif tool_name == "get_building_level_cost":
                building_id = tool_input.get("building_id", "")
                level = tool_input.get("level", 1)

                building = game_data.buildings.get_building(building_id)
                if not building:
                    return f"找不到建築 '{building_id}'"

                level_data = building.get_level(level)
                if not level_data:
                    return f"建築 '{building_id}' 沒有等級 {level} 的資料"

                total = (
                    level_data.cost_wood
                    + level_data.cost_clay
                    + level_data.cost_iron
                    + level_data.cost_crop
                )
                result = f"## {building.name_zh} 等級 {level} 建造成本\n\n"
                result += f"- **木材**: {level_data.cost_wood:,}\n"
                result += f"- **磚塊**: {level_data.cost_clay:,}\n"
                result += f"- **鐵礦**: {level_data.cost_iron:,}\n"
                result += f"- **糧食**: {level_data.cost_crop:,}\n"
                result += f"- **總計**: {total:,}\n"
                result += f"- **建造時間**: {level_data.build_time_base:,} 秒\n"
                result += f"- **人口消耗**: {level_data.population}\n"
                result += f"- **文化點**: {level_data.culture_points}\n"
                if level_data.effect_description:
                    result += f"- **效果**: {level_data.effect_description}\n"

                return result

            elif tool_name == "calculate_upgrade_cost":
                building_id = tool_input.get("building_id", "")
                from_level = tool_input.get("from_level", 0)
                to_level = tool_input.get("to_level", 1)

                building = game_data.buildings.get_building(building_id)
                if not building:
                    return f"找不到建築 '{building_id}'"

                if from_level >= to_level:
                    return "起始等級必須小於目標等級"

                cost = building.get_upgrade_cost(from_level, to_level)
                if not cost:
                    return f"無法計算從等級 {from_level} 到等級 {to_level} 的成本"

                total = cost["wood"] + cost["clay"] + cost["iron"] + cost["crop"]
                result = f"## {building.name_zh} 升級成本計算\n\n"
                result += f"**從等級 {from_level} 升到等級 {to_level}**\n\n"
                result += f"- **木材**: {cost['wood']:,}\n"
                result += f"- **磚塊**: {cost['clay']:,}\n"
                result += f"- **鐵礦**: {cost['iron']:,}\n"
                result += f"- **糧食**: {cost['crop']:,}\n"
                result += f"- **總計**: {total:,}\n"

                return result

            elif tool_name == "list_buildings":
                category = tool_input.get("category")

                if category:
                    from app.domain.schemas.game_data import BuildingCategory

                    try:
                        cat_enum = BuildingCategory(category)
                        buildings = game_data.buildings.get_buildings_by_category(
                            cat_enum
                        )
                    except ValueError:
                        return f"無效的類別: {category}"
                else:
                    buildings = list(game_data.buildings.buildings.values())

                result = "## 建築列表\n\n"
                if category:
                    result += f"**類別**: {category}\n\n"
                result += f"共 {len(buildings)} 個建築\n\n"
                result += "| ID | 中文名稱 | 英文名稱 | 類別 | 最高等級 |\n"
                result += "|----|----------|----------|------|----------|\n"

                for b in buildings:
                    result += f"| {b.building_id} | {b.name_zh} | {b.name_en} | {b.category.value} | {b.max_level} |\n"

                return result

            elif tool_name == "get_troop_info":
                troop_id = tool_input.get("troop_id", "")
                troop = game_data.troops.get_troop(troop_id)
                if not troop:
                    return f"找不到兵種 '{troop_id}'。請使用 list_troops 工具查看可用的兵種 ID。"

                result = f"## {troop.name_zh} ({troop.name_en})\n\n"
                result += f"- **種族**: {troop.tribe.value}\n"
                result += f"- **類型**: {troop.category.value}\n\n"
                result += "### 基礎數值\n"
                result += f"- **攻擊力**: {troop.attack}\n"
                result += f"- **步兵防禦**: {troop.defense_infantry}\n"
                result += f"- **騎兵防禦**: {troop.defense_cavalry}\n"
                result += f"- **速度**: {troop.speed} 格/小時\n"
                result += f"- **載重**: {troop.carry_capacity}\n"
                result += f"- **糧食消耗**: {troop.crop_consumption}\n\n"
                result += "### 訓練成本\n"
                result += f"- **木材**: {troop.cost_wood}\n"
                result += f"- **磚塊**: {troop.cost_clay}\n"
                result += f"- **鐵礦**: {troop.cost_iron}\n"
                result += f"- **糧食**: {troop.cost_crop}\n"
                result += f"- **訓練時間**: {troop.training_time_base} 秒\n"

                return result

            elif tool_name == "list_troops":
                tribe = tool_input.get("tribe")

                if tribe:
                    from app.domain.schemas.game_data import TroopTribe

                    try:
                        tribe_enum = TroopTribe(tribe)
                        troops = game_data.troops.get_troops_by_tribe(tribe_enum)
                    except ValueError:
                        return f"無效的種族: {tribe}"
                else:
                    troops = list(game_data.troops.troops.values())

                result = "## 兵種列表\n\n"
                if tribe:
                    result += f"**種族**: {tribe}\n\n"
                result += f"共 {len(troops)} 個兵種\n\n"
                result += (
                    "| ID | 中文名稱 | 種族 | 攻擊 | 步防 | 騎防 | 速度 | 糧耗 |\n"
                )
                result += (
                    "|----|----------|------|------|------|------|------|------|\n"
                )

                for t in troops:
                    result += f"| {t.troop_id} | {t.name_zh} | {t.tribe.value} | {t.attack} | {t.defense_infantry} | {t.defense_cavalry} | {t.speed} | {t.crop_consumption} |\n"

                return result

            elif tool_name == "get_resource_field_info":
                resource_type = tool_input.get("resource_type", "")
                resource = game_data.resources.get_resource_field(resource_type)
                if not resource:
                    return f"找不到資源類型 '{resource_type}'"

                type_names = {
                    "wood": "伐木場",
                    "clay": "採土場",
                    "iron": "鐵礦場",
                    "crop": "農田",
                }
                result = (
                    f"## {type_names.get(resource_type, resource_type)} 資源田資料\n\n"
                )
                result += "### 各等級產量與成本\n\n"
                result += (
                    "| 等級 | 產量/小時 | 木材 | 磚塊 | 鐵礦 | 糧食 | 建造時間(秒) |\n"
                )
                result += (
                    "|------|-----------|------|------|------|------|---------------|\n"
                )

                for res_level in resource.levels:
                    result += f"| {res_level.level} | {res_level.production_per_hour} | {res_level.cost_wood:,} | {res_level.cost_clay:,} | {res_level.cost_iron:,} | {res_level.cost_crop:,} | {res_level.build_time_base:,} |\n"

                return result

            else:
                return f"未知的工具: {tool_name}"

        except Exception as e:
            logger.error(f"執行工具 {tool_name} 時發生錯誤: {e}")
            return f"執行工具時發生錯誤: {str(e)}"

    def _create_fallback_response(
        self, account: GameAccount, question: str, error_msg: str
    ) -> dict[str, Any]:
        """建立 fallback 回應（當 API 不可用時）."""
        day = account.current_server_day or 1
        phase = self.strategy_service._determine_phase(day)
        phase_info = PHASE_STANDARDS[phase]

        return {
            "phase_analysis": f"您目前處於 {phase_info['name_zh']}（Day {day}）",
            "immediate_actions": phase_info["standard"].key_objectives[:2],
            "short_term_plan": ["持續發展資源產出", "累積文化點準備開村"],
            "risk_warnings": [f"AI 服務暫時不可用: {error_msg}"],
            "answer": f"抱歉，AI 諮詢服務暫時不可用（{error_msg}）。"
            f"根據您的遊戲階段（{phase_info['name_zh']}），"
            f"建議優先專注於：{', '.join(phase_info['standard'].key_objectives[:2])}",
        }

    def _parse_ai_response(self, response_text: str) -> dict[str, Any]:
        """解析 AI 回應並提取結構化數據."""
        immediate_actions: list[str] = []
        short_term_plan: list[str] = []
        risk_warnings: list[str] = []
        phase_analysis = ""

        lines = response_text.split("\n")
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 檢測段落標題
            if "階段分析" in line or "當前階段" in line:
                current_section = "phase"
            elif "立即行動" in line or "立即建議" in line:
                current_section = "immediate"
            elif "短期計畫" in line or "短期目標" in line:
                current_section = "short_term"
            elif "風險提醒" in line or "注意事項" in line:
                current_section = "risk"
            elif line.startswith("-") or line.startswith("•") or line.startswith("*"):
                # 解析列表項
                item = line.lstrip("-•* ").strip()
                if item:
                    if current_section == "immediate":
                        immediate_actions.append(item)
                    elif current_section == "short_term":
                        short_term_plan.append(item)
                    elif current_section == "risk":
                        risk_warnings.append(item)
            elif current_section == "phase" and not phase_analysis:
                # 第一個非標題行作為階段分析
                if not any(
                    keyword in line for keyword in ["階段分析", "當前階段", "**", "##"]
                ):
                    phase_analysis = line

        # 如果解析不到結構化內容，提供預設值
        if not immediate_actions:
            immediate_actions = ["請參考上述建議"]
        if not short_term_plan:
            short_term_plan = ["持續執行目前策略"]

        return {
            "phase_analysis": phase_analysis,
            "immediate_actions": immediate_actions,
            "short_term_plan": short_term_plan,
            "risk_warnings": risk_warnings,
            "answer": response_text,
        }

    def get_advice(
        self,
        account_id: str,
        user_id: str,
        question: str,
        conversation_id: str | None = None,
    ) -> StrategyAdviceResponse | None:
        """取得 AI 策略建議."""
        account = self._verify_account_ownership(account_id, user_id)
        if not account:
            return None

        # 建立或取得對話 ID
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            AIService._conversations[conversation_id] = []
            AIService._conversation_timestamps[conversation_id] = datetime.now(UTC)

        # 取得對話歷史
        history = AIService._conversations.get(conversation_id, [])

        # 建構玩家上下文
        player_context, player_info = self._build_player_context(account)

        # 使用 RAG 檢索相關知識
        knowledge_results = retrieve_knowledge(
            query=question,
            player_context=player_info,
            max_results=5,
        )
        knowledge_context = format_knowledge_for_prompt(knowledge_results)
        logger.info(f"RAG 檢索到 {len(knowledge_results)} 條相關知識")

        # 檢查 API 是否可用
        if not self.client:
            fallback = self._create_fallback_response(
                account, question, "未設定 ANTHROPIC_API_KEY"
            )
            return StrategyAdviceResponse(
                conversation_id=conversation_id,
                **fallback,
            )

        try:
            # 建構訊息
            messages: list[MessageParam] = []

            # 加入對話歷史
            for msg in history[-10:]:  # 最多保留 10 則歷史
                messages.append(cast(MessageParam, msg))

            # 加入用戶新問題
            messages.append({"role": "user", "content": question})

            # 建構 system prompt（帶入 RAG 知識和工具使用說明）
            system_prompt = SYSTEM_PROMPT.format(
                player_context=player_context,
                knowledge_context=knowledge_context,
            )
            system_prompt += """

## 遊戲數據查詢工具（必須使用）

⚠️ **極度重要 - 強制規則**：
當回答涉及以下內容時，你**必須**先使用工具查詢數據庫，**絕對禁止**憑記憶或估算回答：
- 建築成本（木材、磚塊、鐵礦、糧食）
- 建築建造時間
- 兵種數據（攻防、成本、速度）
- 資源田產量
- 任何需要具體數字的問題

可用工具：
- `get_building_info`: 查詢建築完整資料（所有等級）
- `get_building_level_cost`: 查詢特定等級的建造成本
- `calculate_upgrade_cost`: 計算從等級 A 升到等級 B 的總成本
- `list_buildings`: 列出所有建築 ID
- `get_troop_info`: 查詢兵種資料
- `list_troops`: 列出所有兵種
- `get_resource_field_info`: 查詢資源田各等級資料

**違反此規則會導致數據錯誤，損害玩家利益。**
如果你不確定建築 ID，請先使用 `list_buildings` 查詢。"""

            # Tool Use 迴圈：最多執行 5 次工具呼叫
            max_tool_iterations = 5
            response_text = ""

            for iteration in range(max_tool_iterations):
                # 呼叫 Claude API（帶入工具定義）
                response = self.client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=settings.CLAUDE_MAX_TOKENS,
                    system=system_prompt,
                    messages=messages,
                    tools=GAME_DATA_TOOLS,
                )

                logger.info(
                    f"Tool Use 迴圈第 {iteration + 1} 次，stop_reason: {response.stop_reason}"
                )

                # 檢查是否有 tool_use
                tool_use_blocks = [
                    block
                    for block in response.content
                    if isinstance(block, ToolUseBlock)
                ]

                if not tool_use_blocks:
                    # 沒有工具呼叫，提取最終回應文字
                    for block in response.content:
                        if isinstance(block, TextBlock):
                            response_text = block.text
                            break
                    break

                # 處理工具呼叫
                # 先將 assistant 的回應加入 messages
                assistant_content: list[Any] = []
                for block in response.content:
                    if isinstance(block, TextBlock):
                        assistant_content.append({"type": "text", "text": block.text})
                    elif isinstance(block, ToolUseBlock):
                        assistant_content.append(
                            {
                                "type": "tool_use",
                                "id": block.id,
                                "name": block.name,
                                "input": block.input,
                            }
                        )

                messages.append({"role": "assistant", "content": assistant_content})

                # 執行工具並收集結果
                tool_results: list[ToolResultBlockParam] = []
                for tool_block in tool_use_blocks:
                    logger.info(
                        f"執行工具: {tool_block.name}, 輸入: {tool_block.input}"
                    )
                    result = self._execute_tool(
                        tool_block.name,
                        cast(dict[str, Any], tool_block.input),
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_block.id,
                            "content": result,
                        }
                    )

                # 將工具結果加入 messages
                messages.append({"role": "user", "content": tool_results})

            # 更新對話歷史（只保存最終的對話，不保存中間的工具呼叫）
            AIService._conversations[conversation_id].append(
                {"role": "user", "content": question}
            )
            AIService._conversations[conversation_id].append(
                {"role": "assistant", "content": response_text}
            )
            AIService._conversation_timestamps[conversation_id] = datetime.now(UTC)

            # 解析回應
            parsed = self._parse_ai_response(response_text)

            # 如果沒有解析到階段分析，補充
            if not parsed["phase_analysis"]:
                day = account.current_server_day or 1
                phase = self.strategy_service._determine_phase(day)
                phase_info = PHASE_STANDARDS[phase]
                parsed["phase_analysis"] = (
                    f"您目前處於 {phase_info['name_zh']}（Day {day}）"
                )

            return StrategyAdviceResponse(
                conversation_id=conversation_id,
                phase_analysis=parsed["phase_analysis"],
                immediate_actions=parsed["immediate_actions"],
                short_term_plan=parsed["short_term_plan"],
                risk_warnings=parsed["risk_warnings"],
                answer=parsed["answer"],
            )

        except AuthenticationError as e:
            logger.error(f"Claude API 認證錯誤: {e}")
            fallback = self._create_fallback_response(account, question, "API 金鑰無效")
            return StrategyAdviceResponse(conversation_id=conversation_id, **fallback)

        except RateLimitError as e:
            logger.error(f"Claude API 頻率限制: {e}")
            fallback = self._create_fallback_response(
                account, question, "API 請求過於頻繁"
            )
            return StrategyAdviceResponse(conversation_id=conversation_id, **fallback)

        except APIError as e:
            logger.error(f"Claude API 錯誤: {e}")
            fallback = self._create_fallback_response(
                account, question, f"API 錯誤: {e.message}"
            )
            return StrategyAdviceResponse(conversation_id=conversation_id, **fallback)

        except Exception as e:
            logger.error(f"AI 服務未預期錯誤: {e}")
            fallback = self._create_fallback_response(account, question, "系統錯誤")
            return StrategyAdviceResponse(conversation_id=conversation_id, **fallback)

    def get_conversation_history(
        self, conversation_id: str
    ) -> ConversationHistoryResponse | None:
        """取得對話歷史."""
        if conversation_id not in AIService._conversations:
            return None

        messages = [
            ConversationMessage(role=msg["role"], content=msg["content"])
            for msg in AIService._conversations[conversation_id]
        ]

        created_at = AIService._conversation_timestamps.get(
            conversation_id, datetime.now(UTC)
        )

        return ConversationHistoryResponse(
            conversation_id=conversation_id,
            messages=messages,
            created_at=created_at.isoformat(),
            last_updated=created_at.isoformat(),
        )

    @classmethod
    def cleanup_old_conversations(cls, max_age_hours: int = 24) -> int:
        """清理過期對話."""
        now = datetime.now(UTC)
        expired = []

        for conv_id, timestamp in cls._conversation_timestamps.items():
            age = (now - timestamp).total_seconds() / 3600
            if age > max_age_hours:
                expired.append(conv_id)

        for conv_id in expired:
            cls._conversations.pop(conv_id, None)
            cls._conversation_timestamps.pop(conv_id, None)

        return len(expired)
