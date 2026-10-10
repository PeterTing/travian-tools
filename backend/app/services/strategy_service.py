"""策略建議服務."""

from sqlalchemy.orm import Session, joinedload

from app.domain.schemas.strategy import (
    GamePhase,
    HealthCheckItem,
    HealthCheckResponse,
    PhaseDetectionResponse,
    PhaseStandard,
    ProgressStatus,
)
from app.infrastructure.database.models.game_account import GameAccount, PlayerRole
from app.infrastructure.database.models.village import Village
from app.services.game_data_service import get_game_data_service

# ============ 根據玩家角色的評估調整係數 ============

ROLE_ADJUSTMENTS = {
    # 進攻手：部隊更重要，村莊/人口要求稍低
    PlayerRole.ATTACKER: {
        "village_weight": 0.8,
        "population_weight": 0.7,
        "troop_weight": 1.5,
        "focus": "部隊訓練和攻擊能力",
        "key_metrics": ["部隊攻擊力", "錘子村發展", "資源掠奪效率"],
    },
    # 防守手：防禦部隊重要，村莊數適中
    PlayerRole.DEFENDER: {
        "village_weight": 0.9,
        "population_weight": 0.8,
        "troop_weight": 1.3,
        "focus": "防禦部隊和城牆",
        "key_metrics": ["防禦部隊數量", "城牆等級", "增援速度"],
    },
    # 經濟發展：村莊和人口最重要
    PlayerRole.FARMER: {
        "village_weight": 1.3,
        "population_weight": 1.2,
        "troop_weight": 0.6,
        "focus": "資源產出和村莊擴張",
        "key_metrics": ["資源產量", "村莊數量", "CP 產出"],
    },
    # 混合型：平衡發展
    PlayerRole.HYBRID: {
        "village_weight": 1.0,
        "population_weight": 1.0,
        "troop_weight": 1.0,
        "focus": "平衡發展",
        "key_metrics": ["整體發展", "靈活應變能力"],
    },
}

# ============ 階段標準定義 ============

PHASE_STANDARDS: dict[GamePhase, dict] = {
    GamePhase.BEGINNER_PROTECTION: {
        # day_range 上界為預設 x1（5 天）；實際以 beginner_protection_days 覆寫（S12）
        "day_range": (1, 5),
        "name_zh": "新手保護期",
        "description": "無法被攻擊的保護期，專注於完成新手任務和基礎建設",
        "standard": PhaseStandard(
            min_villages=1,
            target_villages=1,
            min_population=50,
            target_population=100,
            key_objectives=[
                "完成所有新手任務",
                "升級資源田至 Lv2-3",
                "建造基礎建築（倉庫、穀倉、村莊大樓）",
                "訓練少量兵力開始農場",
            ],
        ),
    },
    GamePhase.EARLY_DEVELOPMENT: {
        "day_range": (1, 7),
        "name_zh": "早期發展期",
        "description": "快速發展資源產出，為開設第二村做準備",
        "standard": PhaseStandard(
            min_villages=1,
            target_villages=2,
            min_population=100,
            target_population=300,
            key_objectives=[
                "資源田升級至 Lv5-6",
                "累積 CP 達到開村門檻",
                "建立穩定的農場收入",
                "完成第二村定居",
            ],
        ),
    },
    GamePhase.MID_EXPANSION: {
        "day_range": (8, 30),
        "name_zh": "中期擴張期",
        "description": "多村發展、確立角色定位（進攻/防守/經濟）",
        "standard": PhaseStandard(
            min_villages=2,
            target_villages=6,
            min_population=500,
            target_population=2000,
            key_objectives=[
                "持續開村，目標 6 村以上",
                "確定村莊角色分工",
                "開始建立部隊基礎",
                "加入聯盟，建立外交關係",
            ],
        ),
    },
    GamePhase.LATE_MID: {
        "day_range": (31, 100),
        "name_zh": "中後期",
        "description": "軍事競爭期，聯盟協作變得重要",
        "standard": PhaseStandard(
            min_villages=6,
            target_villages=15,
            min_population=3000,
            target_population=10000,
            key_objectives=[
                "持續擴張村莊數量",
                "建立主力部隊（Hammer 或 Anvil）",
                "參與聯盟作戰",
                "準備神器爭奪",
            ],
        ),
    },
    GamePhase.ARTEFACT: {
        "day_range": (100, 150),
        "name_zh": "神器期",
        "description": "神器發布後的競爭期",
        "standard": PhaseStandard(
            min_villages=15,
            target_villages=25,
            min_population=15000,
            target_population=50000,
            key_objectives=[
                "爭奪或防守神器",
                "最大化部隊訓練",
                "聯盟協調作戰",
                "為 WW 期做準備",
            ],
        ),
    },
    GamePhase.ENDGAME: {
        "day_range": (150, 999),
        "name_zh": "終局/WW 期",
        "description": "世界奇蹟建造期，全聯盟協作",
        "standard": PhaseStandard(
            min_villages=20,
            target_villages=40,
            min_population=50000,
            target_population=150000,
            key_objectives=[
                "支援 WW 建造",
                "防守 WW 村",
                "摧毀敵方 WW",
                "維持資源供給線",
            ],
        ),
    },
}


class StrategyService:
    """策略建議服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db
        self.game_data = get_game_data_service()

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

    def _determine_phase(
        self, day: int, beginner_protection_days: int = 5
    ) -> GamePhase:
        """根據天數判斷遊戲階段.

        beginner_protection_days 依世界設定（S12）：x1 預設 5 天，可再延長。
        """
        protection = max(1, beginner_protection_days)
        if day <= protection:
            return GamePhase.BEGINNER_PROTECTION
        elif day <= max(7, protection):
            return GamePhase.EARLY_DEVELOPMENT
        elif day <= 30:
            return GamePhase.MID_EXPANSION
        elif day <= 100:
            return GamePhase.LATE_MID
        elif day <= 150:
            return GamePhase.ARTEFACT
        else:
            return GamePhase.ENDGAME

    def _evaluate_progress(
        self,
        phase: GamePhase,
        village_count: int,
        total_population: int,
        player_role: PlayerRole | None = None,
        total_troops: int = 0,
    ) -> tuple[ProgressStatus, str]:
        """評估玩家進度（根據角色調整標準）."""
        standard = PHASE_STANDARDS[phase]["standard"]

        # 取得角色調整係數
        role = player_role or PlayerRole.HYBRID
        adjustments = ROLE_ADJUSTMENTS.get(role, ROLE_ADJUSTMENTS[PlayerRole.HYBRID])

        # 根據角色調整目標
        adjusted_village_target = (
            standard.target_villages * adjustments["village_weight"]
        )
        adjusted_population_target = (
            standard.target_population * adjustments["population_weight"]
        )

        # 計算村莊和人口的進度百分比
        village_progress = (
            village_count / adjusted_village_target
            if adjusted_village_target > 0
            else 1.0
        )
        population_progress = (
            total_population / adjusted_population_target
            if adjusted_population_target > 0
            else 1.0
        )

        # 綜合評估（根據角色加權）
        if role == PlayerRole.ATTACKER:
            # 進攻手：減少村莊/人口的重要性
            avg_progress = village_progress * 0.3 + population_progress * 0.3 + 0.4
            # 如果有部隊數據，應該納入考量
        elif role == PlayerRole.DEFENDER:
            avg_progress = village_progress * 0.4 + population_progress * 0.4 + 0.2
        elif role == PlayerRole.FARMER:
            # 經濟型：村莊和人口是主要指標
            avg_progress = village_progress * 0.5 + population_progress * 0.5
        else:
            avg_progress = (village_progress + population_progress) / 2

        # 生成描述
        role_focus = adjustments["focus"]

        if avg_progress >= 1.0:
            return (
                ProgressStatus.AHEAD,
                f"發展進度領先（{role_focus}為重點），可考慮更積極的策略",
            )
        elif avg_progress >= 0.6:
            return (
                ProgressStatus.NORMAL,
                f"發展進度正常（{role_focus}為重點），保持當前節奏",
            )
        else:
            # 根據角色給出不同的落後建議
            if role == PlayerRole.ATTACKER:
                return (
                    ProgressStatus.BEHIND,
                    "作為進攻手，應優先發展部隊訓練和攻擊能力",
                )
            elif role == PlayerRole.DEFENDER:
                return (
                    ProgressStatus.BEHIND,
                    "作為防守手，應優先發展防禦部隊和城牆",
                )
            elif role == PlayerRole.FARMER:
                if village_count < standard.min_villages:
                    return (
                        ProgressStatus.BEHIND,
                        f"村莊數量不足（目前 {village_count}，建議至少 {int(standard.min_villages * 1.2)}）",
                    )
                else:
                    return (
                        ProgressStatus.BEHIND,
                        f"人口偏低（目前 {total_population}），需加快資源建設",
                    )
            else:
                return (
                    ProgressStatus.BEHIND,
                    "整體發展落後，建議根據角色定位調整策略",
                )

    def _generate_recommendations(
        self,
        phase: GamePhase,
        progress_status: ProgressStatus,
        village_count: int,
        total_population: int,
        player_role: PlayerRole | None = None,
    ) -> list[str]:
        """生成策略建議（根據玩家角色調整）."""
        recommendations = []
        standard = PHASE_STANDARDS[phase]["standard"]
        role = player_role or PlayerRole.HYBRID

        # 根據角色生成不同的建議
        if role == PlayerRole.ATTACKER:
            recommendations.append("持續訓練攻擊部隊，建立錘子村")
            recommendations.append("尋找掠奪目標，保持資源收入")
            if progress_status == ProgressStatus.BEHIND:
                recommendations.append("優先升級兵營/馬廄，加快部隊訓練")
            elif progress_status == ProgressStatus.AHEAD:
                recommendations.append("考慮發起進攻行動")
        elif role == PlayerRole.DEFENDER:
            recommendations.append("持續訓練防禦部隊，強化鐵砧村")
            recommendations.append("升級城牆，提升防禦加成")
            if progress_status == ProgressStatus.BEHIND:
                recommendations.append("優先訓練矛兵/方陣兵等防禦單位")
            elif progress_status == ProgressStatus.AHEAD:
                recommendations.append("協助聯盟成員防禦")
        elif role == PlayerRole.FARMER:
            recommendations.append("持續開村，擴大經濟版圖")
            recommendations.append("升級資源田，最大化資源產出")
            if progress_status == ProgressStatus.BEHIND:
                recommendations.append("優先累積 CP 開設新村莊")
                recommendations.append("加快資源田升級")
            elif progress_status == ProgressStatus.AHEAD:
                recommendations.append("考慮建立資源供給線支援盟友")
        else:
            # 混合型：使用原本的邏輯
            recommendations.extend(standard.key_objectives[:2])
            if progress_status == ProgressStatus.BEHIND:
                if village_count < standard.min_villages:
                    recommendations.append("優先累積 CP 開設新村莊")
                if total_population < standard.min_population:
                    recommendations.append("加快資源田和建築升級以提升人口")
            elif progress_status == ProgressStatus.AHEAD:
                recommendations.append("可以考慮更積極的軍事策略")

        # 添加通用建議
        if not player_role:
            recommendations.append("建議設定玩家角色以獲得更精準的建議")

        return recommendations[:5]  # 最多返回 5 條建議

    def detect_phase(
        self,
        account_id: str,
        user_id: str,
        beginner_protection_days: int = 5,
    ) -> PhaseDetectionResponse | None:
        """檢測遊戲階段."""
        account = self._verify_account_ownership(account_id, user_id)
        if not account:
            return None

        # 計算基本數據
        day = account.current_server_day
        villages = account.villages or []
        village_count = len(villages)
        total_population = sum(v.population or 0 for v in villages)

        # 計算部隊數量
        total_troops = 0
        for village in villages:
            for troop in village.troop_instances or []:
                total_troops += troop.count or 0

        # 判斷階段（保護天數可設定；S12）
        phase = self._determine_phase(day, beginner_protection_days)
        phase_info = dict(PHASE_STANDARDS[phase])
        if phase == GamePhase.BEGINNER_PROTECTION:
            phase_info = {
                **phase_info,
                "day_range": (1, beginner_protection_days),
            }

        # 評估進度（根據玩家角色調整）
        progress_status, progress_description = self._evaluate_progress(
            phase,
            village_count,
            total_population,
            player_role=account.player_role,
            total_troops=total_troops,
        )

        # 生成建議（根據玩家角色調整）
        recommendations = self._generate_recommendations(
            phase,
            progress_status,
            village_count,
            total_population,
            player_role=account.player_role,
        )

        return PhaseDetectionResponse(
            phase=phase,
            phase_name_zh=phase_info["name_zh"],
            phase_description=phase_info["description"],
            day=day,
            village_count=village_count,
            total_population=total_population,
            progress_status=progress_status,
            progress_description=progress_description,
            standard=phase_info["standard"],
            recommendations=recommendations,
        )

    def health_check(
        self,
        account_id: str,
        user_id: str,
        beginner_protection_days: int = 5,
    ) -> HealthCheckResponse | None:
        """帳號健康檢查.

        beginner_protection_days: 新手保護天數（世界相關；S12）。
        """
        _ = beginner_protection_days  # reserved for phase-aware checks
        account = self._verify_account_ownership(account_id, user_id)
        if not account:
            return None

        checks: list[HealthCheckItem] = []
        total_score = 0

        # 1. 糧食平衡檢查
        crop_check = self._check_crop_balance(account)
        checks.append(crop_check)
        total_score += crop_check.score

        # 2. 文化點產出檢查
        cp_check = self._check_culture_points(account)
        checks.append(cp_check)
        total_score += cp_check.score

        # 3. 村莊配置檢查
        village_check = self._check_village_configuration(account)
        checks.append(village_check)
        total_score += village_check.score

        # 4. 部隊訓練檢查
        troop_check = self._check_troop_training(account)
        checks.append(troop_check)
        total_score += troop_check.score

        # 5. 資源利用率檢查
        resource_check = self._check_resource_utilization(account)
        checks.append(resource_check)
        total_score += resource_check.score

        # 計算總體評分
        overall_score = total_score // len(checks) if checks else 0

        # 判斷總體狀態
        if overall_score >= 80:
            overall_status = "healthy"
        elif overall_score >= 60:
            overall_status = "warning"
        else:
            overall_status = "critical"

        # 生成優先改進建議
        priority_actions = self._generate_priority_actions(checks)

        return HealthCheckResponse(
            overall_score=overall_score,
            overall_status=overall_status,
            checks=checks,
            priority_actions=priority_actions,
        )

    def _check_crop_balance(self, account: GameAccount) -> HealthCheckItem:
        """檢查糧食平衡."""
        villages = account.villages or []
        if not villages:
            return HealthCheckItem(
                name="糧食平衡",
                status="warning",
                score=50,
                message="無村莊數據，無法評估糧食狀況",
                suggestions=["請同步村莊數據"],
            )

        # 計算總人口（簡化計算，實際應該考慮部隊糧耗）
        total_population = sum(v.population or 0 for v in villages)

        # 根據人口判斷糧食壓力（這是簡化邏輯）
        # 實際應該根據同步的資源產量數據
        if total_population < 500:
            return HealthCheckItem(
                name="糧食平衡",
                status="good",
                score=90,
                message=f"人口 {total_population}，糧食壓力較小",
                suggestions=[],
            )
        elif total_population < 2000:
            return HealthCheckItem(
                name="糧食平衡",
                status="good",
                score=80,
                message=f"人口 {total_population}，糧食平衡正常",
                suggestions=["注意持續升級農場"],
            )
        else:
            return HealthCheckItem(
                name="糧食平衡",
                status="warning",
                score=60,
                message=f"人口 {total_population}，需注意糧食供給",
                suggestions=["優先升級農場", "考慮佔領糧食綠洲"],
            )

    def _check_culture_points(self, account: GameAccount) -> HealthCheckItem:
        """檢查文化點產出."""
        villages = account.villages or []
        village_count = len(villages)
        day = account.current_server_day

        # 根據天數和村莊數評估（簡化邏輯）
        expected_villages = max(1, day // 5)  # 大約每 5 天一村

        if village_count >= expected_villages:
            return HealthCheckItem(
                name="CP 產出",
                status="good",
                score=85,
                message=f"村莊數 {village_count}，CP 產出正常",
                suggestions=[],
            )
        elif village_count >= expected_villages * 0.7:
            return HealthCheckItem(
                name="CP 產出",
                status="warning",
                score=65,
                message=f"村莊數 {village_count}，CP 產出略低",
                suggestions=["升級城鎮廳加速 CP", "考慮舉辦慶典"],
            )
        else:
            return HealthCheckItem(
                name="CP 產出",
                status="critical",
                score=40,
                message=f"村莊數 {village_count}，發展速度落後",
                suggestions=["優先建造/升級城鎮廳", "儘快舉辦慶典", "加快資源田發展"],
            )

    def _check_village_configuration(self, account: GameAccount) -> HealthCheckItem:
        """檢查村莊配置."""
        villages = account.villages or []
        village_count = len(villages)

        if village_count == 0:
            return HealthCheckItem(
                name="村莊配置",
                status="warning",
                score=50,
                message="無村莊數據",
                suggestions=["請同步村莊數據"],
            )

        # 檢查是否有首都
        has_capital = any(v.is_capital for v in villages)

        # 檢查村莊角色分配
        roles = [v.role for v in villages if v.role]
        has_role_diversity = len(set(roles)) > 1 if roles else False

        score = 70
        suggestions = []

        if not has_capital:
            score -= 10
            suggestions.append("設定首都村莊")

        if village_count >= 3 and not has_role_diversity:
            score -= 10
            suggestions.append("為村莊分配不同角色（進攻/防守/資源）")

        if score >= 80:
            status = "good"
            message = "村莊配置合理"
        elif score >= 60:
            status = "warning"
            message = "村莊配置有改進空間"
        else:
            status = "critical"
            message = "村莊配置需要優化"

        return HealthCheckItem(
            name="村莊配置",
            status=status,
            score=score,
            message=message,
            suggestions=suggestions,
        )

    def _check_troop_training(self, account: GameAccount) -> HealthCheckItem:
        """檢查部隊訓練進度."""
        villages = account.villages or []

        total_troops = 0
        for village in villages:
            for troop in village.troop_instances or []:
                total_troops += troop.count or 0

        day = account.current_server_day

        # 根據天數評估部隊數量（簡化邏輯）
        if day < 7:
            expected_troops = 50
        elif day < 30:
            expected_troops = 500
        elif day < 100:
            expected_troops = 5000
        else:
            expected_troops = 20000

        ratio = total_troops / expected_troops if expected_troops > 0 else 0

        if ratio >= 0.8:
            return HealthCheckItem(
                name="部隊訓練",
                status="good",
                score=85,
                message=f"部隊數量 {total_troops}，訓練進度良好",
                suggestions=[],
            )
        elif ratio >= 0.5:
            return HealthCheckItem(
                name="部隊訓練",
                status="warning",
                score=60,
                message=f"部隊數量 {total_troops}，訓練進度略慢",
                suggestions=["持續訓練部隊", "升級兵營/馬廄提高訓練速度"],
            )
        else:
            return HealthCheckItem(
                name="部隊訓練",
                status="critical",
                score=40,
                message=f"部隊數量 {total_troops}，部隊嚴重不足",
                suggestions=[
                    "優先建造/升級訓練建築",
                    "開始持續訓練部隊",
                    "考慮調整資源分配",
                ],
            )

    def _check_resource_utilization(self, account: GameAccount) -> HealthCheckItem:
        """檢查資源利用率."""
        villages = account.villages or []

        # 計算平均資源田等級（需要建築數據）
        total_resource_fields = 0
        total_level = 0

        for village in villages:
            for building in village.building_instances or []:
                if building.building_id in [
                    "woodcutter",
                    "clay_pit",
                    "iron_mine",
                    "cropland",
                ]:
                    total_resource_fields += 1
                    total_level += building.current_level or 0

        if total_resource_fields == 0:
            return HealthCheckItem(
                name="資源利用率",
                status="warning",
                score=50,
                message="無資源田數據",
                suggestions=["請同步村莊建築數據"],
            )

        avg_level = total_level / total_resource_fields

        if avg_level >= 8:
            return HealthCheckItem(
                name="資源利用率",
                status="good",
                score=85,
                message=f"資源田平均等級 {avg_level:.1f}，資源產出良好",
                suggestions=[],
            )
        elif avg_level >= 5:
            return HealthCheckItem(
                name="資源利用率",
                status="warning",
                score=65,
                message=f"資源田平均等級 {avg_level:.1f}，有提升空間",
                suggestions=["持續升級資源田", "優先升級 ROI 最高的資源田"],
            )
        else:
            return HealthCheckItem(
                name="資源利用率",
                status="critical",
                score=40,
                message=f"資源田平均等級 {avg_level:.1f}，資源產出不足",
                suggestions=["優先升級資源田至 Lv5+", "參考 ROI 計算器優化升級順序"],
            )

    def _generate_priority_actions(self, checks: list[HealthCheckItem]) -> list[str]:
        """生成優先改進建議."""
        priority_actions = []

        # 按分數排序，優先處理分數最低的
        sorted_checks = sorted(checks, key=lambda x: x.score)

        for check in sorted_checks:
            if check.status in ["critical", "warning"] and check.suggestions:
                priority_actions.extend(check.suggestions[:2])

        # 去重並限制數量
        seen = set()
        unique_actions = []
        for action in priority_actions:
            if action not in seen:
                seen.add(action)
                unique_actions.append(action)
                if len(unique_actions) >= 5:
                    break

        return unique_actions
