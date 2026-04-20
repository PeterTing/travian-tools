"""提醒服務."""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

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


class ReminderService:
    """提醒服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    # ============ 提醒規則 ============

    def create_rule(self, user_id: str, data: ReminderRuleCreate) -> ReminderRule:
        """建立提醒規則."""
        rule = ReminderRule(
            rule_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=data.account_id,
            reminder_type=data.reminder_type,
            enabled=data.enabled,
            threshold=data.threshold,
            description=data.description,
        )
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def get_rule_by_id(self, rule_id: str, user_id: str) -> ReminderRule | None:
        """根據 ID 取得規則."""
        return (
            self.db.query(ReminderRule)
            .filter(
                ReminderRule.rule_id == rule_id,
                ReminderRule.user_id == user_id,
            )
            .first()
        )

    def get_rules_by_user(
        self,
        user_id: str,
        account_id: str | None = None,
        reminder_type: ReminderType | None = None,
        enabled_only: bool = False,
    ) -> list[ReminderRule]:
        """取得用戶的提醒規則."""
        query = self.db.query(ReminderRule).filter(ReminderRule.user_id == user_id)

        if account_id:
            query = query.filter(ReminderRule.account_id == account_id)
        if reminder_type:
            query = query.filter(ReminderRule.reminder_type == reminder_type)
        if enabled_only:
            query = query.filter(ReminderRule.enabled == True)  # noqa: E712

        return query.order_by(ReminderRule.created_at.desc()).all()

    def update_rule(
        self, rule_id: str, user_id: str, data: ReminderRuleUpdate
    ) -> ReminderRule | None:
        """更新提醒規則."""
        rule = self.get_rule_by_id(rule_id, user_id)
        if not rule:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(rule, field, value)

        self.db.commit()
        self.db.refresh(rule)
        return rule

    def delete_rule(self, rule_id: str, user_id: str) -> bool:
        """刪除提醒規則."""
        rule = self.get_rule_by_id(rule_id, user_id)
        if not rule:
            return False

        self.db.delete(rule)
        self.db.commit()
        return True

    # ============ 通知 ============

    def create_notification(
        self, user_id: str, data: NotificationCreate
    ) -> Notification:
        """建立通知."""
        notification = Notification(
            notification_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=data.account_id,
            rule_id=data.rule_id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_notifications(
        self,
        user_id: str,
        account_id: str | None = None,
        notification_type: ReminderType | None = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Notification], int, int]:
        """取得通知列表.

        Returns:
            tuple: (notifications, total, unread_count)
        """
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if account_id:
            query = query.filter(Notification.account_id == account_id)
        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)
        if unread_only:
            query = query.filter(Notification.is_read == False)  # noqa: E712

        total = query.count()
        unread_count = (
            self.db.query(func.count(Notification.notification_id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .scalar()
            or 0
        )

        notifications = (
            query.order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return notifications, total, unread_count

    def mark_as_read(self, notification_ids: list[str], user_id: str) -> int:
        """標記通知為已讀.

        Returns:
            已標記的通知數量
        """
        now = datetime.utcnow()
        count = (
            self.db.query(Notification)
            .filter(
                Notification.notification_id.in_(notification_ids),
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .update(
                {Notification.is_read: True, Notification.read_at: now},
                synchronize_session=False,
            )
        )
        self.db.commit()
        return count

    def mark_all_as_read(self, user_id: str) -> int:
        """標記所有通知為已讀."""
        now = datetime.utcnow()
        count = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .update(
                {Notification.is_read: True, Notification.read_at: now},
                synchronize_session=False,
            )
        )
        self.db.commit()
        return count

    def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """刪除通知."""
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.notification_id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if not notification:
            return False

        self.db.delete(notification)
        self.db.commit()
        return True

    # ============ Push 訂閱 ============

    def create_push_subscription(
        self,
        user_id: str,
        endpoint: str,
        p256dh_key: str,
        auth_key: str,
    ) -> PushSubscription:
        """建立 Push 訂閱."""
        # 檢查是否已存在相同 endpoint
        existing = (
            self.db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
            .first()
        )

        if existing:
            # 更新現有訂閱
            existing.p256dh_key = p256dh_key
            existing.auth_key = auth_key
            existing.is_active = True
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # 建立新訂閱
        subscription = PushSubscription(
            subscription_id=str(uuid.uuid4()),
            user_id=user_id,
            endpoint=endpoint,
            p256dh_key=p256dh_key,
            auth_key=auth_key,
        )
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def get_push_subscriptions(self, user_id: str) -> list[PushSubscription]:
        """取得用戶的 Push 訂閱."""
        return (
            self.db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True,  # noqa: E712
            )
            .all()
        )

    def deactivate_push_subscription(self, subscription_id: str, user_id: str) -> bool:
        """停用 Push 訂閱."""
        subscription = (
            self.db.query(PushSubscription)
            .filter(
                PushSubscription.subscription_id == subscription_id,
                PushSubscription.user_id == user_id,
            )
            .first()
        )
        if not subscription:
            return False

        subscription.is_active = False
        self.db.commit()
        return True

    # ============ 統計 ============

    def get_reminder_stats(self, user_id: str) -> dict:
        """取得提醒統計."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_rules = (
            self.db.query(func.count(ReminderRule.rule_id))
            .filter(ReminderRule.user_id == user_id)
            .scalar()
            or 0
        )

        active_rules = (
            self.db.query(func.count(ReminderRule.rule_id))
            .filter(
                ReminderRule.user_id == user_id,
                ReminderRule.enabled == True,  # noqa: E712
            )
            .scalar()
            or 0
        )

        notifications_today = (
            self.db.query(func.count(Notification.notification_id))
            .filter(
                Notification.user_id == user_id,
                Notification.created_at >= today_start,
            )
            .scalar()
            or 0
        )

        unread = (
            self.db.query(func.count(Notification.notification_id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
            .scalar()
            or 0
        )

        has_push = (
            self.db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True,  # noqa: E712
            )
            .first()
            is not None
        )

        return {
            "total_rules": total_rules,
            "active_rules": active_rules,
            "total_notifications_today": notifications_today,
            "unread_notifications": unread,
            "has_push_subscription": has_push,
        }

    # ============ 觸發提醒 ============

    def trigger_reminder(
        self,
        user_id: str,
        reminder_type: ReminderType,
        title: str,
        message: str,
        account_id: str | None = None,
    ) -> Notification | None:
        """觸發提醒.

        檢查是否有對應的啟用規則，如果有則建立通知。

        Returns:
            建立的通知，如果沒有對應規則則返回 None
        """
        # 檢查是否有對應的啟用規則
        rules = self.get_rules_by_user(
            user_id=user_id,
            account_id=account_id,
            reminder_type=reminder_type,
            enabled_only=True,
        )

        if not rules:
            return None

        # 建立通知
        notification = self.create_notification(
            user_id=user_id,
            data=NotificationCreate(
                title=title,
                message=message,
                notification_type=reminder_type,
                account_id=account_id,
                rule_id=rules[0].rule_id,
            ),
        )

        return notification
