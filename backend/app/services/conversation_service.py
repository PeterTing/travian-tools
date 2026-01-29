"""對話歷史服務."""

import logging
from typing import Any, cast

from anthropic import Anthropic
from anthropic.types import MessageParam, TextBlock, ToolResultBlockParam, ToolUseBlock
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.domain.schemas.conversation import (
    ConversationDetail,
    ConversationListResponse,
    ConversationMessageResponse,
    ConversationSummary,
    SendMessageResponse,
)
from app.infrastructure.database.models.conversation import (
    Conversation,
    ConversationMessage,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.village import Village

# 從 ai_service 匯入工具定義
from app.services.ai_service import GAME_DATA_TOOLS
from app.services.game_data_service import get_game_data_service
from app.services.strategy_service import PHASE_STANDARDS, StrategyService

logger = logging.getLogger(__name__)

# 壓縮觸發門檻
COMPACT_THRESHOLD = 20  # 超過 20 則訊息就觸發壓縮
KEEP_RECENT_MESSAGES = 6  # 壓縮後保留最近 6 則訊息

# System Prompt
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

{conversation_summary}

## 回應格式要求
請以中文回答，提供：
1. **階段分析**: 簡短說明玩家當前所處階段和進度
2. **立即行動** (1-3 項): 現在應該做的事
3. **短期計畫** (1-3 天): 接下來幾天的目標
4. **風險提醒** (如有): 需要注意的問題

**重要**: 請參考「相關知識參考」中的資料來回答問題，確保建議符合當前遊戲版本的策略。

保持回答簡潔實用，避免過於冗長。"""

# 壓縮用的 Prompt
COMPACTION_PROMPT = """請將以下對話歷史壓縮成一段簡潔的摘要。

摘要應該包含：
1. 玩家詢問過的主要問題
2. AI 給出的關鍵建議
3. 任何重要的上下文資訊（如玩家的遊戲策略偏好）

請用 2-3 段落概括，保留對後續對話最有價值的資訊。

對話歷史：
{conversation_history}

請直接輸出摘要，不需要其他說明。"""


class ConversationService:
    """對話歷史服務."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db
        self.strategy_service = StrategyService(db)

        # 初始化 Claude client
        self.client: Anthropic | None = None
        if settings.ANTHROPIC_API_KEY:
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

    def get_conversations(
        self,
        user_id: str,
        account_id: str | None = None,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> ConversationListResponse:
        """取得對話列表."""
        query = self.db.query(Conversation).filter(Conversation.user_id == user_id)

        if account_id:
            query = query.filter(Conversation.account_id == account_id)

        if not include_archived:
            query = query.filter(Conversation.is_archived.is_(False))

        total = query.count()

        conversations = (
            query.order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        # 建構摘要列表
        summaries = []
        for conv in conversations:
            # 取得最後一則訊息預覽
            last_message = (
                self.db.query(ConversationMessage)
                .filter(ConversationMessage.conversation_id == conv.conversation_id)
                .order_by(ConversationMessage.sequence.desc())
                .first()
            )
            preview = None
            if last_message:
                preview = (
                    last_message.content[:50] + "..."
                    if len(last_message.content) > 50
                    else last_message.content
                )

            summaries.append(
                ConversationSummary(
                    conversation_id=conv.conversation_id,
                    account_id=conv.account_id,
                    title=conv.title,
                    message_count=conv.message_count,
                    is_archived=conv.is_archived,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    last_message_preview=preview,
                )
            )

        return ConversationListResponse(conversations=summaries, total=total)

    def get_conversation(
        self, conversation_id: str, user_id: str
    ) -> ConversationDetail | None:
        """取得對話詳情（含未壓縮的訊息）."""
        conv = (
            self.db.query(Conversation)
            .filter(
                Conversation.conversation_id == conversation_id,
                Conversation.user_id == user_id,
            )
            .first()
        )

        if not conv:
            return None

        # 取得未壓縮的訊息
        messages = (
            self.db.query(ConversationMessage)
            .filter(
                ConversationMessage.conversation_id == conversation_id,
                ConversationMessage.is_compacted.is_(False),
            )
            .order_by(ConversationMessage.sequence)
            .all()
        )

        return ConversationDetail(
            conversation_id=conv.conversation_id,
            account_id=conv.account_id,
            title=conv.title,
            summary=conv.summary,
            message_count=conv.message_count,
            is_archived=conv.is_archived,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[
                ConversationMessageResponse(
                    message_id=msg.message_id,
                    role=msg.role,
                    content=msg.content,
                    sequence=msg.sequence,
                    is_compacted=msg.is_compacted,
                    created_at=msg.created_at,
                )
                for msg in messages
            ],
        )

    def create_conversation(
        self, user_id: str, account_id: str, title: str | None = None
    ) -> Conversation:
        """建立新對話."""
        conv = Conversation(
            user_id=user_id,
            account_id=account_id,
            title=title,
            message_count=0,
            is_archived=False,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """刪除對話."""
        conv = (
            self.db.query(Conversation)
            .filter(
                Conversation.conversation_id == conversation_id,
                Conversation.user_id == user_id,
            )
            .first()
        )

        if not conv:
            return False

        self.db.delete(conv)
        self.db.commit()
        return True

    def update_conversation(
        self,
        conversation_id: str,
        user_id: str,
        title: str | None = None,
        is_archived: bool | None = None,
    ) -> Conversation | None:
        """更新對話."""
        conv = (
            self.db.query(Conversation)
            .filter(
                Conversation.conversation_id == conversation_id,
                Conversation.user_id == user_id,
            )
            .first()
        )

        if not conv:
            return None

        if title is not None:
            conv.title = title
        if is_archived is not None:
            conv.is_archived = is_archived

        self.db.commit()
        self.db.refresh(conv)
        return conv

    def _execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> str:
        """執行工具並返回結果."""
        try:
            game_data = get_game_data_service()

            if tool_name == "get_building_info":
                building_id = tool_input.get("building_id", "")
                building = game_data.buildings.get_building(building_id)
                if not building:
                    return f"找不到建築 '{building_id}'。請使用 list_buildings 工具查看可用的建築 ID。"

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

    def _build_player_context(self, account: GameAccount) -> str:
        """建構玩家上下文資訊."""
        villages = account.villages or []
        village_count = len(villages)
        total_population = sum(v.population or 0 for v in villages)
        day = account.current_server_day

        phase = self.strategy_service._determine_phase(day)
        phase_info = PHASE_STANDARDS[phase]

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
                if troop.location == "total":
                    total_troops += troop.count or 0

        # 如果沒有 total 資料，fallback 到 home
        if total_troops == 0:
            for village in villages:
                for troop in village.troop_instances or []:
                    if troop.location == "home":
                        total_troops += troop.count or 0

        # 建構每個村莊的完整詳情
        village_details = []
        for idx, v in enumerate(villages):
            # 基本資訊
            type_label = ""
            if v.village_type:
                type_label = f"[{v.village_type.value}]"
            if v.is_capital:
                type_label += "[首都]" if type_label else "[首都]"
            role_label = f"({v.role.value})" if v.role else ""

            coord = f"({v.coordinate_x or '?'}, {v.coordinate_y or '?'})"
            village_header = (
                f"### 村莊 {idx + 1}: {v.name or '未命名'} {coord} "
                f"{type_label} {role_label}".strip()
            )
            village_details.append(village_header)
            village_details.append(f"- 人口: {v.population or 0}")

            # 建築列表
            buildings = v.building_instances or []
            if buildings:
                village_details.append("- 建築:")
                # 按位置排序
                sorted_buildings = sorted(buildings, key=lambda b: b.position or 0)
                for b in sorted_buildings:
                    upgrading = " (升級中)" if b.is_upgrading else ""
                    village_details.append(
                        f"  - [{b.position or '?'}] {b.building_id} Lv.{b.current_level or 0}{upgrading}"
                    )
            else:
                village_details.append("- 建築: 無資料")

            # 部隊列表 - 村莊內 (home)
            troops_home = [t for t in (v.troop_instances or []) if t.location == "home"]
            if troops_home:
                village_details.append("- 村莊內部隊:")
                for t in troops_home:
                    training = " (訓練中)" if t.is_training else ""
                    village_details.append(
                        f"  - {t.troop_id}: {t.count or 0}{training}"
                    )

            # 部隊列表 - 總計 (total)
            troops_total = [
                t for t in (v.troop_instances or []) if t.location == "total"
            ]
            if troops_total:
                village_details.append("- 全部部隊(含外派):")
                for t in troops_total:
                    village_details.append(f"  - {t.troop_id}: {t.count or 0}")

            # 如果沒有任何部隊資料
            if not troops_home and not troops_total:
                village_details.append("- 部隊: 無資料")

            village_details.append("")  # 空行分隔

        standard = phase_info["standard"]

        # 玩家角色定位
        role_labels = {
            "attacker": "進攻手（重視攻擊部隊、錘子村）",
            "defender": "防守手（重視防禦部隊、鐵砧村）",
            "farmer": "經濟發展（重視資源產量、村莊數）",
            "hybrid": "混合型（平衡發展）",
        }
        player_role_str = "未設定"
        if account.player_role:
            player_role_str = role_labels.get(
                account.player_role.value, account.player_role.value
            )

        return f"""
- **種族**: {account.tribe.value if account.tribe else "未知"}
- **玩家角色定位**: {player_role_str}
- **伺服器天數**: Day {day}
- **遊戲階段**: {phase_info["name_zh"]} ({phase_info["description"]})
- **進度狀態**: {progress_label} - {progress_desc}
- **村莊數**: {village_count} (階段目標: {standard.target_villages})
- **總人口**: {total_population} (階段目標: {standard.target_population})
- **部隊總數**: {total_troops}
- **聯盟**: {account.alliance_name or "無"}

## 村莊詳細資訊
{chr(10).join(village_details) if village_details else "無村莊數據"}

**重要**:
1. 請根據上述「進度狀態」來評估玩家的發展情況，如果顯示「落後」就表示玩家進度不理想，需要加快發展。
2. 請根據「玩家角色定位」來調整建議的方向。例如：進攻手應重視兵營、工坊等軍事建築；防守手應重視城牆和防禦部隊；經濟發展應重視資源田和擴村速度。
"""

    def _should_compact(self, conversation: Conversation) -> bool:
        """判斷是否需要壓縮."""
        return conversation.message_count >= COMPACT_THRESHOLD

    def _compact_conversation(self, conversation: Conversation) -> None:
        """壓縮對話歷史."""
        if not self.client:
            logger.warning("無法壓縮對話：Claude client 未初始化")
            return

        # 取得所有未壓縮的訊息
        messages = (
            self.db.query(ConversationMessage)
            .filter(
                ConversationMessage.conversation_id == conversation.conversation_id,
                ConversationMessage.is_compacted.is_(False),
            )
            .order_by(ConversationMessage.sequence)
            .all()
        )

        if len(messages) <= KEEP_RECENT_MESSAGES:
            return

        # 要壓縮的訊息
        to_compact = messages[:-KEEP_RECENT_MESSAGES]

        # 建構對話歷史文字
        history_text = ""
        for msg in to_compact:
            role_label = "玩家" if msg.role == "user" else "AI"
            history_text += f"{role_label}: {msg.content}\n\n"

        # 如果已有摘要，也加入
        if conversation.summary:
            history_text = (
                f"[先前摘要]\n{conversation.summary}\n\n[新對話]\n{history_text}"
            )

        try:
            # 呼叫 Claude 生成摘要
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": COMPACTION_PROMPT.format(
                            conversation_history=history_text
                        ),
                    }
                ],
            )

            first_block = response.content[0]
            summary = first_block.text if isinstance(first_block, TextBlock) else ""

            # 更新對話摘要
            conversation.summary = summary

            # 標記訊息為已壓縮
            for msg in to_compact:
                msg.is_compacted = True

            self.db.commit()
            logger.info(
                f"對話 {conversation.conversation_id} 已壓縮 {len(to_compact)} 則訊息"
            )

        except Exception as e:
            logger.error(f"壓縮對話失敗: {e}")
            self.db.rollback()

    def send_message(
        self,
        conversation_id: str,
        user_id: str,
        question: str,
    ) -> SendMessageResponse | None:
        """發送訊息並取得 AI 回應."""
        # 取得對話
        conv = (
            self.db.query(Conversation)
            .filter(
                Conversation.conversation_id == conversation_id,
                Conversation.user_id == user_id,
            )
            .first()
        )

        if not conv:
            return None

        # 驗證帳號所有權
        account = None
        if conv.account_id:
            account = self._verify_account_ownership(conv.account_id, user_id)
            if not account:
                return None

        # 計算新的 sequence
        max_seq = (
            self.db.query(ConversationMessage.sequence)
            .filter(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.sequence.desc())
            .first()
        )
        next_seq = (max_seq[0] + 1) if max_seq else 1

        # 儲存用戶訊息
        user_msg = ConversationMessage(
            conversation_id=conversation_id,
            role="user",
            content=question,
            sequence=next_seq,
            is_compacted=False,
        )
        self.db.add(user_msg)

        # 自動生成標題（如果是第一則訊息）
        if conv.message_count == 0:
            conv.title = question[:50] + ("..." if len(question) > 50 else "")

        # 建構 Claude 請求
        player_context = ""
        if account:
            player_context = self._build_player_context(account)

        # 取得未壓縮的歷史訊息
        history_messages = (
            self.db.query(ConversationMessage)
            .filter(
                ConversationMessage.conversation_id == conversation_id,
                ConversationMessage.is_compacted.is_(False),
            )
            .order_by(ConversationMessage.sequence)
            .all()
        )

        # 建構 API 訊息
        messages: list[MessageParam] = []
        for msg in history_messages:
            messages.append(
                cast(MessageParam, {"role": msg.role, "content": msg.content})
            )
        messages.append({"role": "user", "content": question})

        # 建構 summary context
        summary_context = ""
        if conv.summary:
            summary_context = f"\n## 先前對話摘要\n{conv.summary}"

        # 呼叫 Claude API
        if not self.client:
            # Fallback response
            assistant_content = "抱歉，AI 服務暫時不可用。請稍後再試。"
            phase_analysis = ""
            immediate_actions = []
            short_term_plan = []
            risk_warnings = ["AI 服務暫時不可用"]
        else:
            try:
                # 使用 RAG 知識
                from app.knowledge_base.rag_service import (
                    format_knowledge_for_prompt,
                    retrieve_knowledge,
                )

                knowledge_results = retrieve_knowledge(
                    query=question,
                    player_context={
                        "tribe": account.tribe.value
                        if account and account.tribe
                        else None,
                        "day": account.current_server_day if account else 1,
                        "phase": self.strategy_service._determine_phase(
                            account.current_server_day if account else 1
                        ),
                    },
                    max_results=5,
                )
                knowledge_context = format_knowledge_for_prompt(knowledge_results)

                # 建構 system prompt（帶入工具使用說明）
                system_prompt = SYSTEM_PROMPT.format(
                    player_context=player_context,
                    knowledge_context=knowledge_context,
                    conversation_summary=summary_context,
                )
                system_prompt += """

## 遊戲數據查詢工具（必須使用）

⚠️ **極度重要 - 強制規則**：
當回答涉及以下內容時，你**必須**先使用工具查詢數據庫，**絕對禁止**憑記憶或估算回答：
- 建築成本（木材、磚塊、鐵礦、糧食）
- 建築建造時間
- 建築功能效果（例如：英雄宅幾級可以佔領綠洲？請查詢 effect_description）
- 兵種數據（攻防、成本、速度）
- 資源田產量
- 任何需要具體數字或遊戲機制的問題

可用工具：
- `get_building_info`: 查詢建築完整資料（所有等級的成本和效果）
- `get_building_level_cost`: 查詢特定等級的建造成本
- `calculate_upgrade_cost`: 計算從等級 A 升到等級 B 的總成本
- `list_buildings`: 列出所有建築 ID
- `get_troop_info`: 查詢兵種資料
- `list_troops`: 列出所有兵種
- `get_resource_field_info`: 查詢資源田各等級資料

**違反此規則會導致數據錯誤，損害玩家利益。**
如果你不確定建築 ID，請先使用 `list_buildings` 查詢。

## 玩家村莊資料核實規則

⚠️ **重要**：回答問題前，請仔細核對上方「村莊詳細資訊」中的建築列表：
- 確認玩家**實際擁有**哪些建築及其等級
- 如果某個建築不在列表中，表示玩家**尚未建造**該建築
- 不要假設玩家有某個建築，要以實際資料為準
- 例如：如果 heros_mansion（英雄宅）不在建築列表中，就表示該村莊沒有英雄宅"""

                # Tool Use 迴圈：最多執行 5 次工具呼叫
                max_tool_iterations = 5
                assistant_content = ""
                api_messages = messages.copy()

                for iteration in range(max_tool_iterations):
                    response = self.client.messages.create(
                        model=settings.CLAUDE_MODEL,
                        max_tokens=settings.CLAUDE_MAX_TOKENS,
                        system=system_prompt,
                        messages=api_messages,
                        tools=GAME_DATA_TOOLS,
                    )

                    print(
                        f"[DEBUG] Tool Use 迴圈第 {iteration + 1} 次，stop_reason: {response.stop_reason}"
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
                                assistant_content = block.text
                                break
                        break

                    # 處理工具呼叫
                    # 先將 assistant 的回應加入 messages
                    assistant_api_content: list[Any] = []
                    for block in response.content:
                        if isinstance(block, TextBlock):
                            assistant_api_content.append(
                                {"type": "text", "text": block.text}
                            )
                        elif isinstance(block, ToolUseBlock):
                            assistant_api_content.append(
                                {
                                    "type": "tool_use",
                                    "id": block.id,
                                    "name": block.name,
                                    "input": block.input,
                                }
                            )

                    api_messages.append(
                        {"role": "assistant", "content": assistant_api_content}
                    )

                    # 執行工具並收集結果
                    tool_results: list[ToolResultBlockParam] = []
                    for tool_block in tool_use_blocks:
                        print(
                            f"[DEBUG] 執行工具: {tool_block.name}, 輸入: {tool_block.input}"
                        )
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
                    api_messages.append({"role": "user", "content": tool_results})

                # 解析回應
                parsed = self._parse_ai_response(assistant_content)
                phase_analysis = parsed["phase_analysis"]
                immediate_actions = parsed["immediate_actions"]
                short_term_plan = parsed["short_term_plan"]
                risk_warnings = parsed["risk_warnings"]

            except Exception as e:
                logger.error(f"Claude API 錯誤: {e}")
                assistant_content = f"抱歉，處理您的問題時發生錯誤: {str(e)}"
                phase_analysis = ""
                immediate_actions = []
                short_term_plan = []
                risk_warnings = ["處理請求時發生錯誤"]

        # 儲存 AI 回應
        assistant_msg = ConversationMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=assistant_content,
            sequence=next_seq + 1,
            is_compacted=False,
        )
        self.db.add(assistant_msg)

        # 更新對話統計
        conv.message_count += 2
        self.db.commit()

        # 檢查是否需要壓縮
        if self._should_compact(conv):
            self._compact_conversation(conv)

        self.db.refresh(user_msg)
        self.db.refresh(assistant_msg)

        return SendMessageResponse(
            conversation_id=conversation_id,
            user_message=ConversationMessageResponse(
                message_id=user_msg.message_id,
                role=user_msg.role,
                content=user_msg.content,
                sequence=user_msg.sequence,
                is_compacted=user_msg.is_compacted,
                created_at=user_msg.created_at,
            ),
            assistant_message=ConversationMessageResponse(
                message_id=assistant_msg.message_id,
                role=assistant_msg.role,
                content=assistant_msg.content,
                sequence=assistant_msg.sequence,
                is_compacted=assistant_msg.is_compacted,
                created_at=assistant_msg.created_at,
            ),
            phase_analysis=phase_analysis,
            immediate_actions=immediate_actions,
            short_term_plan=short_term_plan,
            risk_warnings=risk_warnings,
        )

    def _parse_ai_response(self, response_text: str) -> dict:
        """解析 AI 回應."""
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

            if "階段分析" in line or "當前階段" in line:
                current_section = "phase"
            elif "立即行動" in line or "立即建議" in line:
                current_section = "immediate"
            elif "短期計畫" in line or "短期目標" in line:
                current_section = "short_term"
            elif "風險提醒" in line or "注意事項" in line:
                current_section = "risk"
            elif line.startswith("-") or line.startswith("•") or line.startswith("*"):
                item = line.lstrip("-•* ").strip()
                if item:
                    if current_section == "immediate":
                        immediate_actions.append(item)
                    elif current_section == "short_term":
                        short_term_plan.append(item)
                    elif current_section == "risk":
                        risk_warnings.append(item)
            elif current_section == "phase" and not phase_analysis:
                if not any(
                    keyword in line for keyword in ["階段分析", "當前階段", "**", "##"]
                ):
                    phase_analysis = line

        if not immediate_actions:
            immediate_actions = ["請參考上述建議"]
        if not short_term_plan:
            short_term_plan = ["持續執行目前策略"]

        return {
            "phase_analysis": phase_analysis,
            "immediate_actions": immediate_actions,
            "short_term_plan": short_term_plan,
            "risk_warnings": risk_warnings,
        }
