"""策略服務單元測試."""

import pytest

from app.domain.schemas.strategy import (
    GamePhase,
    HealthCheckItem,
    PhaseStandard,
    ProgressStatus,
)
from app.services.strategy_service import PHASE_STANDARDS, StrategyService


class TestGamePhaseEnum:
    """測試遊戲階段枚舉."""

    def test_all_phases_defined(self):
        """測試所有階段都有定義."""
        expected_phases = [
            GamePhase.BEGINNER_PROTECTION,
            GamePhase.EARLY_DEVELOPMENT,
            GamePhase.MID_EXPANSION,
            GamePhase.LATE_MID,
            GamePhase.ARTEFACT,
            GamePhase.ENDGAME,
        ]
        assert len(GamePhase) == 6
        for phase in expected_phases:
            assert phase in GamePhase

    def test_phase_values(self):
        """測試階段值."""
        assert GamePhase.BEGINNER_PROTECTION.value == "beginner_protection"
        assert GamePhase.EARLY_DEVELOPMENT.value == "early_development"
        assert GamePhase.MID_EXPANSION.value == "mid_expansion"
        assert GamePhase.LATE_MID.value == "late_mid"
        assert GamePhase.ARTEFACT.value == "artefact"
        assert GamePhase.ENDGAME.value == "endgame"


class TestProgressStatus:
    """測試進度狀態枚舉."""

    def test_progress_statuses(self):
        """測試進度狀態值."""
        assert ProgressStatus.AHEAD.value == "ahead"
        assert ProgressStatus.NORMAL.value == "normal"
        assert ProgressStatus.BEHIND.value == "behind"


class TestPhaseStandards:
    """測試階段標準定義."""

    def test_all_phases_have_standards(self):
        """測試所有階段都有標準定義."""
        for phase in GamePhase:
            assert phase in PHASE_STANDARDS
            assert "day_range" in PHASE_STANDARDS[phase]
            assert "name_zh" in PHASE_STANDARDS[phase]
            assert "description" in PHASE_STANDARDS[phase]
            assert "standard" in PHASE_STANDARDS[phase]

    def test_beginner_protection_standards(self):
        """測試新手保護期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.BEGINNER_PROTECTION]
        assert phase_info["day_range"] == (1, 3)
        assert phase_info["name_zh"] == "新手保護期"

        standard = phase_info["standard"]
        assert isinstance(standard, PhaseStandard)
        assert standard.min_villages == 1
        assert standard.target_villages == 1
        assert standard.min_population == 50
        assert standard.target_population == 100
        assert len(standard.key_objectives) > 0

    def test_early_development_standards(self):
        """測試早期發展期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.EARLY_DEVELOPMENT]
        assert phase_info["day_range"] == (1, 7)
        assert phase_info["name_zh"] == "早期發展期"

        standard = phase_info["standard"]
        assert standard.target_villages == 2
        assert standard.target_population == 300

    def test_mid_expansion_standards(self):
        """測試中期擴張期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.MID_EXPANSION]
        assert phase_info["day_range"] == (8, 30)
        assert phase_info["name_zh"] == "中期擴張期"

        standard = phase_info["standard"]
        assert standard.target_villages == 6
        assert standard.target_population == 2000

    def test_late_mid_standards(self):
        """測試中後期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.LATE_MID]
        assert phase_info["day_range"] == (31, 100)
        assert phase_info["name_zh"] == "中後期"

        standard = phase_info["standard"]
        assert standard.target_villages == 15
        assert standard.target_population == 10000

    def test_artefact_standards(self):
        """測試神器期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.ARTEFACT]
        assert phase_info["day_range"] == (100, 150)
        assert phase_info["name_zh"] == "神器期"

        standard = phase_info["standard"]
        assert standard.target_villages == 25

    def test_endgame_standards(self):
        """測試終局期標準."""
        phase_info = PHASE_STANDARDS[GamePhase.ENDGAME]
        assert phase_info["day_range"] == (150, 999)
        assert phase_info["name_zh"] == "終局/WW 期"

        standard = phase_info["standard"]
        assert standard.target_villages == 40


class TestStrategyServiceDeterminePhase:
    """測試階段判斷邏輯."""

    def test_determine_phase_beginner_protection(self):
        """測試新手保護期判斷."""
        # 使用 None db，因為我們只測試 _determine_phase 方法
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(1) == GamePhase.BEGINNER_PROTECTION
        assert service._determine_phase(2) == GamePhase.BEGINNER_PROTECTION
        assert service._determine_phase(3) == GamePhase.BEGINNER_PROTECTION

    def test_determine_phase_early_development(self):
        """測試早期發展期判斷."""
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(4) == GamePhase.EARLY_DEVELOPMENT
        assert service._determine_phase(5) == GamePhase.EARLY_DEVELOPMENT
        assert service._determine_phase(7) == GamePhase.EARLY_DEVELOPMENT

    def test_determine_phase_mid_expansion(self):
        """測試中期擴張期判斷."""
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(8) == GamePhase.MID_EXPANSION
        assert service._determine_phase(15) == GamePhase.MID_EXPANSION
        assert service._determine_phase(30) == GamePhase.MID_EXPANSION

    def test_determine_phase_late_mid(self):
        """測試中後期判斷."""
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(31) == GamePhase.LATE_MID
        assert service._determine_phase(50) == GamePhase.LATE_MID
        assert service._determine_phase(100) == GamePhase.LATE_MID

    def test_determine_phase_artefact(self):
        """測試神器期判斷."""
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(101) == GamePhase.ARTEFACT
        assert service._determine_phase(120) == GamePhase.ARTEFACT
        assert service._determine_phase(150) == GamePhase.ARTEFACT

    def test_determine_phase_endgame(self):
        """測試終局期判斷."""
        service = StrategyService(None)  # type: ignore

        assert service._determine_phase(151) == GamePhase.ENDGAME
        assert service._determine_phase(200) == GamePhase.ENDGAME
        assert service._determine_phase(300) == GamePhase.ENDGAME


class TestStrategyServiceEvaluateProgress:
    """測試進度評估邏輯."""

    def test_evaluate_progress_ahead(self):
        """測試領先進度評估."""
        service = StrategyService(None)  # type: ignore

        # 早期發展期，超過目標
        status, desc = service._evaluate_progress(
            GamePhase.EARLY_DEVELOPMENT,
            village_count=3,  # 目標 2
            total_population=400,  # 目標 300
        )
        assert status == ProgressStatus.AHEAD

    def test_evaluate_progress_normal(self):
        """測試正常進度評估."""
        service = StrategyService(None)  # type: ignore

        # 早期發展期，接近目標（需要達到 60% 以上才算正常）
        # 目標: 2 村, 300 人口
        # 2 村 = 100%, 180 人口 = 60%, 平均 80% >= 60%
        status, desc = service._evaluate_progress(
            GamePhase.EARLY_DEVELOPMENT,
            village_count=2,  # 目標 2，達標
            total_population=180,  # 目標 300，60%
        )
        assert status == ProgressStatus.NORMAL

    def test_evaluate_progress_behind_villages(self):
        """測試落後進度評估 - 村莊不足."""
        service = StrategyService(None)  # type: ignore

        # 中期擴張期，村莊數量明顯不足
        status, desc = service._evaluate_progress(
            GamePhase.MID_EXPANSION,
            village_count=1,  # 最低 2
            total_population=100,  # 最低 500
        )
        assert status == ProgressStatus.BEHIND
        assert "落後" in desc or "村莊" in desc or "人口" in desc

    def test_evaluate_progress_behind_population(self):
        """測試落後進度評估 - 人口不足."""
        service = StrategyService(None)  # type: ignore

        # 中期擴張期，人口明顯不足
        status, desc = service._evaluate_progress(
            GamePhase.MID_EXPANSION,
            village_count=2,  # 符合最低要求
            total_population=100,  # 遠低於最低 500
        )
        assert status == ProgressStatus.BEHIND


class TestStrategyServiceGenerateRecommendations:
    """測試策略建議生成."""

    def test_generate_recommendations_returns_list(self):
        """測試生成建議返回列表."""
        service = StrategyService(None)  # type: ignore

        recommendations = service._generate_recommendations(
            GamePhase.EARLY_DEVELOPMENT,
            ProgressStatus.NORMAL,
            village_count=1,
            total_population=150,
        )

        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        assert len(recommendations) <= 5  # 最多 5 條

    def test_generate_recommendations_behind_includes_advice(self):
        """測試落後時生成的建議包含改進建議."""
        service = StrategyService(None)  # type: ignore

        recommendations = service._generate_recommendations(
            GamePhase.MID_EXPANSION,
            ProgressStatus.BEHIND,
            village_count=1,
            total_population=100,
        )

        assert len(recommendations) > 0
        # 落後時應該有開村或資源相關建議
        combined = " ".join(recommendations)
        assert "村" in combined or "資源" in combined or "經濟" in combined

    def test_generate_recommendations_ahead_includes_advice(self):
        """測試領先時生成的建議包含積極建議."""
        service = StrategyService(None)  # type: ignore

        recommendations = service._generate_recommendations(
            GamePhase.MID_EXPANSION,
            ProgressStatus.AHEAD,
            village_count=10,
            total_population=5000,
        )

        assert len(recommendations) > 0


class TestHealthCheckItem:
    """測試健康檢查項目 Schema."""

    def test_health_check_item_creation(self):
        """測試建立健康檢查項目."""
        item = HealthCheckItem(
            name="糧食平衡",
            status="good",
            score=85,
            message="糧食平衡正常",
            suggestions=["持續升級農田"],
        )

        assert item.name == "糧食平衡"
        assert item.status == "good"
        assert item.score == 85
        assert item.message == "糧食平衡正常"
        assert len(item.suggestions) == 1

    def test_health_check_item_score_validation(self):
        """測試健康檢查項目分數驗證."""
        # 分數應該在 0-100 之間
        with pytest.raises(ValueError):
            HealthCheckItem(
                name="測試",
                status="good",
                score=101,  # 超過 100
                message="測試",
            )

        with pytest.raises(ValueError):
            HealthCheckItem(
                name="測試",
                status="good",
                score=-1,  # 小於 0
                message="測試",
            )
