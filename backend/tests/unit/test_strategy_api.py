"""策略 API 端點測試."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """建立測試客戶端."""
    return TestClient(app)


class TestPhaseDetectionEndpoint:
    """階段判斷端點測試."""

    def test_phase_detection_requires_auth(self, client: TestClient):
        """測試需要認證."""
        response = client.post(
            "/api/v1/strategy/phase",
            json={"account_id": "test-account-id"},
        )
        assert response.status_code == 401

    def test_phase_detection_validation_missing_account_id(self, client: TestClient):
        """測試缺少 account_id 驗證 (認證優先於資料驗證)."""
        response = client.post(
            "/api/v1/strategy/phase",
            json={},
        )
        # 由於端點需要認證，未認證時返回 401
        assert response.status_code == 401


class TestHealthCheckEndpoint:
    """健康檢查端點測試."""

    def test_health_check_requires_auth(self, client: TestClient):
        """測試需要認證."""
        response = client.post(
            "/api/v1/strategy/health-check",
            json={"account_id": "test-account-id"},
        )
        assert response.status_code == 401

    def test_health_check_validation_missing_account_id(self, client: TestClient):
        """測試缺少 account_id 驗證 (認證優先於資料驗證)."""
        response = client.post(
            "/api/v1/strategy/health-check",
            json={},
        )
        # 由於端點需要認證，未認證時返回 401
        assert response.status_code == 401


class TestStrategySchemas:
    """策略 Schema 測試."""

    def test_phase_detection_request_schema(self):
        """測試階段判斷請求 Schema."""
        from app.domain.schemas.strategy import PhaseDetectionRequest

        request = PhaseDetectionRequest(account_id="test-account-id")
        assert request.account_id == "test-account-id"

    def test_health_check_request_schema(self):
        """測試健康檢查請求 Schema."""
        from app.domain.schemas.strategy import HealthCheckRequest

        request = HealthCheckRequest(account_id="test-account-id")
        assert request.account_id == "test-account-id"

    def test_phase_detection_response_schema(self):
        """測試階段判斷回應 Schema."""
        from app.domain.schemas.strategy import (
            GamePhase,
            PhaseDetectionResponse,
            PhaseStandard,
            ProgressStatus,
        )

        response = PhaseDetectionResponse(
            phase=GamePhase.EARLY_DEVELOPMENT,
            phase_name_zh="早期發展期",
            phase_description="快速發展資源產出",
            day=5,
            village_count=1,
            total_population=150,
            progress_status=ProgressStatus.NORMAL,
            progress_description="發展進度正常",
            standard=PhaseStandard(
                min_villages=1,
                target_villages=2,
                min_population=100,
                target_population=300,
                key_objectives=["開設第二村"],
            ),
            recommendations=["繼續發展資源田"],
        )

        assert response.phase == GamePhase.EARLY_DEVELOPMENT
        assert response.day == 5
        assert response.village_count == 1
        assert response.progress_status == ProgressStatus.NORMAL

    def test_health_check_response_schema(self):
        """測試健康檢查回應 Schema."""
        from app.domain.schemas.strategy import HealthCheckItem, HealthCheckResponse

        response = HealthCheckResponse(
            overall_score=75,
            overall_status="warning",
            checks=[
                HealthCheckItem(
                    name="糧食平衡",
                    status="good",
                    score=85,
                    message="糧食平衡正常",
                    suggestions=[],
                ),
                HealthCheckItem(
                    name="文化點產出",
                    status="warning",
                    score=65,
                    message="文化點產出略低",
                    suggestions=["升級市政廳"],
                ),
            ],
            priority_actions=["升級市政廳"],
        )

        assert response.overall_score == 75
        assert response.overall_status == "warning"
        assert len(response.checks) == 2
        assert len(response.priority_actions) == 1
