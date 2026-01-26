"""AI 策略諮詢服務（Claude API 整合 + RAG 知識庫）."""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any, cast

from anthropic import Anthropic, APIError, AuthenticationError, RateLimitError
from anthropic.types import MessageParam, TextBlock
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
from app.services.strategy_service import PHASE_STANDARDS, StrategyService

logger = logging.getLogger(__name__)


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
        day = account.account_age_days or 1

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

        # 計算部隊數量
        total_troops = 0
        for village in villages:
            for troop in village.troop_instances or []:
                total_troops += troop.count or 0

        # 建構村莊摘要
        village_summaries = []
        for v in villages[:5]:  # 最多顯示 5 個村莊
            buildings_count = len(v.building_instances or [])
            troops_in_village = sum(t.count or 0 for t in (v.troop_instances or []))
            village_summaries.append(
                f"  - {v.name or '未命名'}: 人口 {v.population or 0}, "
                f"建築 {buildings_count} 個, 部隊 {troops_in_village}"
            )

        # 階段標準
        standard = phase_info["standard"]

        # 給 RAG 用的玩家資訊
        player_info = {
            "tribe": account.tribe.value if account.tribe else None,
            "day": day,
            "phase": phase,
            "progress_status": progress_status.value,
            "village_count": village_count,
            "total_population": total_population,
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

    def _create_fallback_response(
        self, account: GameAccount, question: str, error_msg: str
    ) -> dict[str, Any]:
        """建立 fallback 回應（當 API 不可用時）."""
        day = account.account_age_days or 1
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

            # 呼叫 Claude API（帶入 RAG 知識）
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS,
                system=SYSTEM_PROMPT.format(
                    player_context=player_context,
                    knowledge_context=knowledge_context,
                ),
                messages=messages,
            )

            # 取得回應文字
            first_block = response.content[0]
            response_text = (
                first_block.text if isinstance(first_block, TextBlock) else ""
            )

            # 更新對話歷史
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
                day = account.account_age_days or 1
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
