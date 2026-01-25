"""AI 服務單元測試."""

from datetime import UTC

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """建立測試客戶端."""
    return TestClient(app)


class TestAIAdviceEndpoint:
    """AI 諮詢端點測試."""

    def test_advice_requires_auth(self, client: TestClient):
        """測試需要認證."""
        response = client.post(
            "/api/v1/strategy/advice",
            json={
                "account_id": "test-account-id",
                "question": "我應該先升級什麼？",
            },
        )
        assert response.status_code == 401

    def test_advice_validation_missing_question(self, client: TestClient):
        """測試缺少 question 驗證 (認證優先)."""
        response = client.post(
            "/api/v1/strategy/advice",
            json={"account_id": "test-account-id"},
        )
        # 認證優先於資料驗證
        assert response.status_code == 401


class TestConversationHistoryEndpoint:
    """對話歷史端點測試."""

    def test_get_history_requires_auth(self, client: TestClient):
        """測試需要認證."""
        response = client.get("/api/v1/strategy/conversation/test-conv-id")
        assert response.status_code == 401


class TestAIServiceLogic:
    """AI 服務邏輯測試."""

    def test_cleanup_old_conversations(self):
        """測試清理過期對話."""
        from datetime import datetime, timedelta

        from app.services.ai_service import AIService

        # 設置測試對話
        old_conv_id = "old-conversation"
        new_conv_id = "new-conversation"

        AIService._conversations[old_conv_id] = [{"role": "user", "content": "test"}]
        AIService._conversations[new_conv_id] = [{"role": "user", "content": "test"}]

        # 設置時間戳
        AIService._conversation_timestamps[old_conv_id] = datetime.now(UTC) - timedelta(
            hours=25
        )
        AIService._conversation_timestamps[new_conv_id] = datetime.now(UTC)

        # 清理
        cleaned = AIService.cleanup_old_conversations(max_age_hours=24)

        assert cleaned == 1
        assert old_conv_id not in AIService._conversations
        assert new_conv_id in AIService._conversations

        # 清理測試數據
        AIService._conversations.pop(new_conv_id, None)
        AIService._conversation_timestamps.pop(new_conv_id, None)

    def test_parse_ai_response_with_sections(self):
        """測試解析帶有段落的 AI 回應."""
        from app.services.ai_service import AIService

        service = AIService(None)  # type: ignore

        response_text = """
## 階段分析
您目前處於早期發展期。

## 立即行動
- 升級資源田至 Lv5
- 建造兵營 Lv3

## 短期計畫
- 累積文化點開設第二村
- 開始訓練部隊

## 風險提醒
- 糧食產量可能不足
"""

        result = service._parse_ai_response(response_text)

        assert "早期發展期" in result["phase_analysis"]
        assert len(result["immediate_actions"]) >= 1
        assert len(result["short_term_plan"]) >= 1
        assert len(result["risk_warnings"]) >= 1

    def test_parse_ai_response_without_sections(self):
        """測試解析沒有明確段落的 AI 回應."""
        from app.services.ai_service import AIService

        service = AIService(None)  # type: ignore

        response_text = """這是一個沒有結構的回應。
建議您持續發展資源田。"""

        result = service._parse_ai_response(response_text)

        assert result["answer"] == response_text
        # 應該有預設值
        assert len(result["immediate_actions"]) > 0
        assert len(result["short_term_plan"]) > 0


class TestStrategyAdviceSchema:
    """策略諮詢 Schema 測試."""

    def test_strategy_advice_request_schema(self):
        """測試策略諮詢請求 Schema."""
        from app.domain.schemas.strategy import StrategyAdviceRequest

        request = StrategyAdviceRequest(
            account_id="test-account-id",
            question="我應該先升級什麼？",
        )
        assert request.account_id == "test-account-id"
        assert request.question == "我應該先升級什麼？"
        assert request.conversation_id is None

    def test_strategy_advice_request_with_conversation_id(self):
        """測試帶對話 ID 的策略諮詢請求 Schema."""
        from app.domain.schemas.strategy import StrategyAdviceRequest

        request = StrategyAdviceRequest(
            account_id="test-account-id",
            question="接下來呢？",
            conversation_id="conv-123",
        )
        assert request.conversation_id == "conv-123"

    def test_strategy_advice_response_schema(self):
        """測試策略諮詢回應 Schema."""
        from app.domain.schemas.strategy import StrategyAdviceResponse

        response = StrategyAdviceResponse(
            conversation_id="conv-123",
            phase_analysis="您目前處於早期發展期",
            immediate_actions=["升級資源田", "建造兵營"],
            short_term_plan=["累積文化點"],
            risk_warnings=["注意糧食"],
            answer="建議優先升級資源田...",
        )

        assert response.conversation_id == "conv-123"
        assert len(response.immediate_actions) == 2
        assert len(response.short_term_plan) == 1
        assert len(response.risk_warnings) == 1

    def test_conversation_message_schema(self):
        """測試對話訊息 Schema."""
        from app.domain.schemas.strategy import ConversationMessage

        msg = ConversationMessage(role="user", content="我應該先升級什麼？")
        assert msg.role == "user"
        assert msg.content == "我應該先升級什麼？"

    def test_conversation_history_response_schema(self):
        """測試對話歷史回應 Schema."""
        from app.domain.schemas.strategy import (
            ConversationHistoryResponse,
            ConversationMessage,
        )

        response = ConversationHistoryResponse(
            conversation_id="conv-123",
            messages=[
                ConversationMessage(role="user", content="問題"),
                ConversationMessage(role="assistant", content="回答"),
            ],
            created_at="2026-01-26T10:00:00Z",
            last_updated="2026-01-26T10:05:00Z",
        )

        assert response.conversation_id == "conv-123"
        assert len(response.messages) == 2
