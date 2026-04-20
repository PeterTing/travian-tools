"""提醒系統 API 端點."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.reminder import (
    MarkNotificationReadRequest,
    NotificationListResponse,
    NotificationResponse,
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    ReminderRuleCreate,
    ReminderRuleListResponse,
    ReminderRuleResponse,
    ReminderRuleUpdate,
    ReminderStatsResponse,
)
from app.infrastructure.database.models.reminder import ReminderType
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders", tags=["reminders"])


# ============ 提醒規則 ============


@router.post(
    "/rules",
    response_model=ReminderRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="建立提醒規則",
    description="建立新的提醒規則",
)
def create_rule(
    data: ReminderRuleCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ReminderRuleResponse:
    """建立提醒規則."""
    service = ReminderService(db)
    rule = service.create_rule(current_user.user_id, data)
    return ReminderRuleResponse.model_validate(rule)


@router.get(
    "/rules",
    response_model=ReminderRuleListResponse,
    summary="取得提醒規則列表",
    description="取得用戶的提醒規則列表",
)
def get_rules(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str | None = Query(None, description="篩選帳號"),
    reminder_type: ReminderType | None = Query(None, description="篩選類型"),
    enabled_only: bool = Query(False, description="只顯示啟用的規則"),
) -> ReminderRuleListResponse:
    """取得提醒規則列表."""
    service = ReminderService(db)
    rules = service.get_rules_by_user(
        current_user.user_id, account_id, reminder_type, enabled_only
    )
    return ReminderRuleListResponse(
        rules=[ReminderRuleResponse.model_validate(r) for r in rules],
        total=len(rules),
    )


@router.get(
    "/rules/{rule_id}",
    response_model=ReminderRuleResponse,
    summary="取得提醒規則詳情",
    description="取得指定提醒規則的詳細資訊",
)
def get_rule(
    rule_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> ReminderRuleResponse:
    """取得提醒規則詳情."""
    service = ReminderService(db)
    rule = service.get_rule_by_id(rule_id, current_user.user_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="規則不存在",
        )
    return ReminderRuleResponse.model_validate(rule)


@router.put(
    "/rules/{rule_id}",
    response_model=ReminderRuleResponse,
    summary="更新提醒規則",
    description="更新指定提醒規則",
)
def update_rule(
    rule_id: str,
    data: ReminderRuleUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ReminderRuleResponse:
    """更新提醒規則."""
    service = ReminderService(db)
    rule = service.update_rule(rule_id, current_user.user_id, data)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="規則不存在",
        )
    return ReminderRuleResponse.model_validate(rule)


@router.delete(
    "/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除提醒規則",
    description="刪除指定提醒規則",
)
def delete_rule(
    rule_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除提醒規則."""
    service = ReminderService(db)
    if not service.delete_rule(rule_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="規則不存在",
        )


# ============ 通知 ============


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    summary="取得通知列表",
    description="取得用戶的通知列表",
)
def get_notifications(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str | None = Query(None, description="篩選帳號"),
    notification_type: ReminderType | None = Query(None, description="篩選類型"),
    unread_only: bool = Query(False, description="只顯示未讀通知"),
    limit: int = Query(50, ge=1, le=200, description="每頁數量"),
    offset: int = Query(0, ge=0, description="偏移量"),
) -> NotificationListResponse:
    """取得通知列表."""
    service = ReminderService(db)
    notifications, total, unread_count = service.get_notifications(
        current_user.user_id,
        account_id,
        notification_type,
        unread_only,
        limit,
        offset,
    )
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
    )


@router.post(
    "/notifications/read",
    summary="標記通知為已讀",
    description="批量標記通知為已讀",
)
def mark_notifications_read(
    data: MarkNotificationReadRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    """標記通知為已讀."""
    service = ReminderService(db)
    count = service.mark_as_read(data.notification_ids, current_user.user_id)
    return {"marked_count": count}


@router.post(
    "/notifications/read-all",
    summary="標記所有通知為已讀",
    description="標記所有通知為已讀",
)
def mark_all_notifications_read(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    """標記所有通知為已讀."""
    service = ReminderService(db)
    count = service.mark_all_as_read(current_user.user_id)
    return {"marked_count": count}


@router.delete(
    "/notifications/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除通知",
    description="刪除指定通知",
)
def delete_notification(
    notification_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除通知."""
    service = ReminderService(db)
    if not service.delete_notification(notification_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )


# ============ Push 訂閱 ============


@router.post(
    "/push/subscribe",
    response_model=PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="訂閱 Push 通知",
    description="建立 Web Push 訂閱",
)
def subscribe_push(
    data: PushSubscriptionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> PushSubscriptionResponse:
    """訂閱 Push 通知."""
    service = ReminderService(db)
    subscription = service.create_push_subscription(
        user_id=current_user.user_id,
        endpoint=data.endpoint,
        p256dh_key=data.p256dh_key,
        auth_key=data.auth_key,
    )
    return PushSubscriptionResponse.model_validate(subscription)


@router.get(
    "/push/subscriptions",
    response_model=list[PushSubscriptionResponse],
    summary="取得 Push 訂閱列表",
    description="取得用戶的 Push 訂閱列表",
)
def get_push_subscriptions(
    db: DBSession,
    current_user: CurrentUser,
) -> list[PushSubscriptionResponse]:
    """取得 Push 訂閱列表."""
    service = ReminderService(db)
    subscriptions = service.get_push_subscriptions(current_user.user_id)
    return [PushSubscriptionResponse.model_validate(s) for s in subscriptions]


@router.delete(
    "/push/subscriptions/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="取消 Push 訂閱",
    description="停用指定的 Push 訂閱",
)
def unsubscribe_push(
    subscription_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """取消 Push 訂閱."""
    service = ReminderService(db)
    if not service.deactivate_push_subscription(subscription_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="訂閱不存在",
        )


# ============ 統計 ============


@router.get(
    "/stats",
    response_model=ReminderStatsResponse,
    summary="取得提醒統計",
    description="取得提醒系統統計資訊",
)
def get_reminder_stats(
    db: DBSession,
    current_user: CurrentUser,
) -> ReminderStatsResponse:
    """取得提醒統計."""
    service = ReminderService(db)
    stats = service.get_reminder_stats(current_user.user_id)
    return ReminderStatsResponse(**stats)
