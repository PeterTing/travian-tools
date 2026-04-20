"""提醒服務單元測試."""

from datetime import datetime
from unittest.mock import MagicMock

import pytest

from app.domain.schemas.reminder import (
    NotificationCreate,
    ReminderRuleCreate,
    ReminderRuleUpdate,
)
from app.infrastructure.database.models.reminder import (
    Notification,
    PushSubscription,
    ReminderRule,
    ReminderType,
)
from app.services.reminder_service import ReminderService


class TestReminderService:
    """提醒服務測試."""

    @pytest.fixture
    def mock_db(self) -> MagicMock:
        """模擬資料庫 session."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db: MagicMock) -> ReminderService:
        """建立服務實例."""
        return ReminderService(mock_db)

    @pytest.fixture
    def mock_rule(self) -> ReminderRule:
        """模擬提醒規則."""
        return ReminderRule(
            rule_id="rule-123",
            user_id="user-123",
            account_id="acc-123",
            reminder_type=ReminderType.BUILD_COMPLETE,
            enabled=True,
            threshold=None,
            description="建造完成提醒",
            created_at=datetime.utcnow(),
        )

    @pytest.fixture
    def mock_notification(self) -> Notification:
        """模擬通知."""
        return Notification(
            notification_id="notif-123",
            user_id="user-123",
            account_id="acc-123",
            rule_id="rule-123",
            title="建造完成",
            message="主建築升級完成",
            notification_type=ReminderType.BUILD_COMPLETE,
            is_read=False,
            is_pushed=False,
            created_at=datetime.utcnow(),
        )

    @pytest.fixture
    def mock_push_subscription(self) -> PushSubscription:
        """模擬 Push 訂閱."""
        return PushSubscription(
            subscription_id="sub-123",
            user_id="user-123",
            endpoint="https://fcm.googleapis.com/fcm/send/xxx",
            p256dh_key="test_p256dh_key",
            auth_key="test_auth_key",
            is_active=True,
            created_at=datetime.utcnow(),
        )

    # ============ 提醒規則測試 ============

    def test_create_rule_success(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試建立規則成功."""
        data = ReminderRuleCreate(
            reminder_type=ReminderType.BUILD_COMPLETE,
            enabled=True,
            description="建造完成提醒",
            account_id="acc-123",
        )

        service.create_rule("user-123", data)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    def test_get_rule_by_id_found(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_rule: ReminderRule,
    ) -> None:
        """測試根據 ID 取得規則成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_rule
        mock_db.query.return_value = mock_query

        result = service.get_rule_by_id("rule-123", "user-123")

        assert result is not None
        assert result.rule_id == "rule-123"

    def test_get_rule_by_id_not_found(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試根據 ID 取得規則失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service.get_rule_by_id("rule-999", "user-123")

        assert result is None

    def test_get_rules_by_user(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_rule: ReminderRule,
    ) -> None:
        """測試取得用戶規則列表."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = [mock_rule]
        mock_db.query.return_value = mock_query

        result = service.get_rules_by_user("user-123")

        assert len(result) == 1
        assert result[0].rule_id == "rule-123"

    def test_update_rule_success(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_rule: ReminderRule,
    ) -> None:
        """測試更新規則成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_rule
        mock_db.query.return_value = mock_query

        data = ReminderRuleUpdate(enabled=False)
        result = service.update_rule("rule-123", "user-123", data)

        assert result is not None
        assert result.enabled is False
        mock_db.commit.assert_called_once()

    def test_update_rule_not_found(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試更新規則失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        data = ReminderRuleUpdate(enabled=False)
        result = service.update_rule("rule-999", "user-123", data)

        assert result is None

    def test_delete_rule_success(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_rule: ReminderRule,
    ) -> None:
        """測試刪除規則成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_rule
        mock_db.query.return_value = mock_query

        result = service.delete_rule("rule-123", "user-123")

        assert result is True
        mock_db.delete.assert_called_once_with(mock_rule)
        mock_db.commit.assert_called_once()

    def test_delete_rule_not_found(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試刪除規則失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service.delete_rule("rule-999", "user-123")

        assert result is False
        mock_db.delete.assert_not_called()

    # ============ 通知測試 ============

    def test_create_notification_success(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試建立通知成功."""
        data = NotificationCreate(
            title="建造完成",
            message="主建築升級完成",
            notification_type=ReminderType.BUILD_COMPLETE,
            account_id="acc-123",
            rule_id="rule-123",
        )

        service.create_notification("user-123", data)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    def test_get_notifications(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_notification: Notification,
    ) -> None:
        """測試取得通知列表."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [
            mock_notification
        ]

        # 設置未讀數量查詢
        mock_count_query = MagicMock()
        mock_count_query.filter.return_value.scalar.return_value = 1
        mock_db.query.side_effect = [mock_query, mock_count_query]

        notifications, total, unread = service.get_notifications("user-123")

        assert len(notifications) == 1
        assert total == 1
        assert unread == 1

    def test_mark_as_read(self, service: ReminderService, mock_db: MagicMock) -> None:
        """測試標記通知為已讀."""
        mock_query = MagicMock()
        mock_query.filter.return_value.update.return_value = 2
        mock_db.query.return_value = mock_query

        count = service.mark_as_read(["notif-1", "notif-2"], "user-123")

        assert count == 2
        mock_db.commit.assert_called_once()

    def test_mark_all_as_read(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試標記所有通知為已讀."""
        mock_query = MagicMock()
        mock_query.filter.return_value.update.return_value = 5
        mock_db.query.return_value = mock_query

        count = service.mark_all_as_read("user-123")

        assert count == 5
        mock_db.commit.assert_called_once()

    def test_delete_notification_success(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_notification: Notification,
    ) -> None:
        """測試刪除通知成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_notification
        mock_db.query.return_value = mock_query

        result = service.delete_notification("notif-123", "user-123")

        assert result is True
        mock_db.delete.assert_called_once_with(mock_notification)
        mock_db.commit.assert_called_once()

    def test_delete_notification_not_found(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試刪除通知失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service.delete_notification("notif-999", "user-123")

        assert result is False

    # ============ Push 訂閱測試 ============

    def test_create_push_subscription_new(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試建立新 Push 訂閱."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        service.create_push_subscription(
            user_id="user-123",
            endpoint="https://fcm.googleapis.com/fcm/send/xxx",
            p256dh_key="test_key",
            auth_key="test_auth",
        )

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    def test_create_push_subscription_existing(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_push_subscription: PushSubscription,
    ) -> None:
        """測試更新現有 Push 訂閱."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_push_subscription
        mock_db.query.return_value = mock_query

        service.create_push_subscription(
            user_id="user-123",
            endpoint="https://fcm.googleapis.com/fcm/send/xxx",
            p256dh_key="new_key",
            auth_key="new_auth",
        )

        # 不應新增，應更新現有
        mock_db.add.assert_not_called()
        mock_db.commit.assert_called_once()

    def test_get_push_subscriptions(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_push_subscription: PushSubscription,
    ) -> None:
        """測試取得 Push 訂閱列表."""
        mock_query = MagicMock()
        mock_query.filter.return_value.all.return_value = [mock_push_subscription]
        mock_db.query.return_value = mock_query

        result = service.get_push_subscriptions("user-123")

        assert len(result) == 1
        assert result[0].subscription_id == "sub-123"

    def test_deactivate_push_subscription_success(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_push_subscription: PushSubscription,
    ) -> None:
        """測試停用 Push 訂閱成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_push_subscription
        mock_db.query.return_value = mock_query

        result = service.deactivate_push_subscription("sub-123", "user-123")

        assert result is True
        assert mock_push_subscription.is_active is False
        mock_db.commit.assert_called_once()

    def test_deactivate_push_subscription_not_found(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試停用 Push 訂閱失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service.deactivate_push_subscription("sub-999", "user-123")

        assert result is False

    # ============ 觸發提醒測試 ============

    def test_trigger_reminder_with_rule(
        self,
        service: ReminderService,
        mock_db: MagicMock,
        mock_rule: ReminderRule,
    ) -> None:
        """測試觸發提醒（有對應規則）."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = [mock_rule]
        mock_db.query.return_value = mock_query

        service.trigger_reminder(
            user_id="user-123",
            reminder_type=ReminderType.BUILD_COMPLETE,
            title="建造完成",
            message="主建築升級完成",
            account_id="acc-123",
        )

        # 應該建立通知
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    def test_trigger_reminder_without_rule(
        self, service: ReminderService, mock_db: MagicMock
    ) -> None:
        """測試觸發提醒（無對應規則）."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = []
        mock_db.query.return_value = mock_query

        result = service.trigger_reminder(
            user_id="user-123",
            reminder_type=ReminderType.ATTACK_INCOMING,
            title="攻擊警報",
            message="有敵軍來襲",
        )

        assert result is None
        # 不應建立通知
        mock_db.add.assert_not_called()
