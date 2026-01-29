"""對話歷史 API 端點."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.conversation import (
    ConversationCreate,
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
    ConversationUpdate,
    SendMessageRequest,
    SendMessageResponse,
)
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str | None = Query(None, description="篩選指定帳號的對話"),
    include_archived: bool = Query(False, description="是否包含已封存的對話"),
    limit: int = Query(50, ge=1, le=100, description="每頁數量"),
    offset: int = Query(0, ge=0, description="偏移量"),
) -> ConversationListResponse:
    """取得對話列表.

    返回用戶的所有對話，按更新時間倒序排列。
    支援按帳號篩選和分頁。

    Args:
        db: 資料庫 session
        current_user: 當前登入用戶
        account_id: 篩選指定帳號的對話（可選）
        include_archived: 是否包含已封存的對話
        limit: 每頁數量
        offset: 偏移量

    Returns:
        ConversationListResponse: 對話列表
    """
    service = ConversationService(db)
    return service.get_conversations(
        user_id=current_user.user_id,
        account_id=account_id,
        include_archived=include_archived,
        limit=limit,
        offset=offset,
    )


@router.post(
    "", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED
)
async def create_conversation(
    request: ConversationCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ConversationSummary:
    """建立新對話.

    Args:
        request: 對話建立請求
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        ConversationSummary: 新建立的對話摘要
    """
    service = ConversationService(db)

    # 驗證帳號所有權
    account = service._verify_account_ownership(
        request.account_id, current_user.user_id
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該遊戲帳號或無權限存取",
        )

    conv = service.create_conversation(
        user_id=current_user.user_id,
        account_id=request.account_id,
        title=request.title,
    )

    return ConversationSummary(
        conversation_id=conv.conversation_id,
        account_id=conv.account_id,
        title=conv.title,
        message_count=conv.message_count,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        last_message_preview=None,
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> ConversationDetail:
    """取得對話詳情.

    返回對話的完整資訊，包含所有未壓縮的訊息。
    已壓縮的訊息會以摘要形式呈現在 summary 欄位。

    Args:
        conversation_id: 對話 ID
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        ConversationDetail: 對話詳情

    Raises:
        HTTPException: 對話不存在或無權限
    """
    service = ConversationService(db)
    result = service.get_conversation(conversation_id, current_user.user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該對話或無權限存取",
        )

    return result


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: str,
    request: ConversationUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ConversationSummary:
    """更新對話.

    可更新對話標題或封存狀態。

    Args:
        conversation_id: 對話 ID
        request: 更新請求
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        ConversationSummary: 更新後的對話摘要

    Raises:
        HTTPException: 對話不存在或無權限
    """
    service = ConversationService(db)
    conv = service.update_conversation(
        conversation_id=conversation_id,
        user_id=current_user.user_id,
        title=request.title,
        is_archived=request.is_archived,
    )

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該對話或無權限存取",
        )

    return ConversationSummary(
        conversation_id=conv.conversation_id,
        account_id=conv.account_id,
        title=conv.title,
        message_count=conv.message_count,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        last_message_preview=None,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除對話.

    永久刪除對話及其所有訊息。

    Args:
        conversation_id: 對話 ID
        db: 資料庫 session
        current_user: 當前登入用戶

    Raises:
        HTTPException: 對話不存在或無權限
    """
    service = ConversationService(db)
    success = service.delete_conversation(conversation_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該對話或無權限存取",
        )


@router.post("/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> SendMessageResponse:
    """發送訊息.

    發送用戶訊息並取得 AI 回應。
    如果對話訊息過多，會自動觸發壓縮機制。

    Args:
        conversation_id: 對話 ID
        request: 訊息請求
        db: 資料庫 session
        current_user: 當前登入用戶

    Returns:
        SendMessageResponse: 包含用戶訊息和 AI 回應

    Raises:
        HTTPException: 對話不存在或無權限
    """
    service = ConversationService(db)
    result = service.send_message(
        conversation_id=conversation_id,
        user_id=current_user.user_id,
        question=request.question,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到該對話或無權限存取",
        )

    return result
