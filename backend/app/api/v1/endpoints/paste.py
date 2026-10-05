"""P0-05 草稿、確認存入、來襲列表。預覽仍走 POST /api/v1/parse。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DBSession, UploadUser
from app.domain.schemas.game_account import GameAccountUpdate, TimeDisplay
from app.domain.schemas.game_world import GameWorldUpdate
from app.domain.schemas.paste import (
    ConfirmRequest,
    ConfirmResponse,
    DiffPreviewRequest,
    DiffPreviewResponse,
    DraftCreateRequest,
    DraftResponse,
    MovementCoordsUpdate,
    MovementListResponse,
    MovementResponse,
)
from app.infrastructure.database.models.parse_draft import ParseDraft
from app.services.game_account_service import GameAccountService
from app.services.game_world_service import GameWorldService
from app.services.paste_service import PasteService

router = APIRouter(tags=["paste"])


def _draft_response(draft: ParseDraft) -> DraftResponse:
    return DraftResponse(
        draft_id=draft.draft_id,
        account_id=draft.account_id,
        page_type=draft.page_type,
        source=draft.source,
        url=draft.url,
        server_time=draft.server_time,
        data=draft.parsed_json or {},
        warnings=draft.warnings_json or [],
        expires_at=draft.expires_at,
    )


@router.post(
    "/sync/draft",
    response_model=DraftResponse,
    summary="建立解析草稿（擴充 UploadUser 可用）",
)
def create_draft(
    data: DraftCreateRequest,
    db: DBSession,
    current_user: UploadUser,
) -> DraftResponse:
    ok, message, draft = PasteService(db).create_draft(
        user_id=current_user.user_id,
        account_id=data.account_id,
        raw_kind=data.kind,
        raw_content=data.content,
        url=data.url,
        page_type_hint=data.page_type_hint,
        server_time=data.server_time,
        source=data.source,
    )
    if not ok or draft is None:
        if "太大" in message:
            code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        elif "找不到" in message or "權限" in message:
            code = status.HTTP_403_FORBIDDEN
        else:
            code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=message)
    return _draft_response(draft)


@router.get(
    "/parse/drafts/{draft_id}",
    response_model=DraftResponse,
    summary="讀取解析草稿",
)
def get_draft(
    draft_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> DraftResponse:
    draft = PasteService(db).get_draft(current_user.user_id, draft_id)
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="草稿不存在或已過期"
        )
    return _draft_response(draft)


@router.post(
    "/paste/preview-diff",
    response_model=DiffPreviewResponse,
    summary="集結點確認前預覽新增／更新筆數（不寫入）",
)
def preview_paste_diff(
    data: DiffPreviewRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> DiffPreviewResponse:
    if data.page_type != "rally_point":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前只有集結點支援預覽比對",
        )
    payload = dict(data.data or {})
    if data.village_id:
        payload["village_id"] = data.village_id
    result = PasteService(db).preview_rally_diff(
        current_user.user_id,
        account_id=data.account_id,
        data=payload,
        capture_at=data.capture_at,
        source=data.source,
        server_time=data.server_time,
        village_id=data.village_id,
    )
    if not result.get("success"):
        code = status.HTTP_403_FORBIDDEN
        if result.get("error_code") in ("unsupported", "empty_parse"):
            code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=code,
            detail=result.get("message") or "預覽失敗",
        )
    return DiffPreviewResponse(
        success=True,
        message=str(result.get("message") or "ok"),
        created=int(result.get("created") or 0),
        updated=int(result.get("updated") or 0),
        total=int(result.get("total") or 0),
        village_id=result.get("village_id"),
    )


@router.post(
    "/paste/confirm",
    response_model=ConfirmResponse,
    summary="確認後存入",
)
def confirm_paste(
    data: ConfirmRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ConfirmResponse:
    if data.time_display is not None:
        try:
            display = TimeDisplay(data.time_display)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="time_display 只能是 server 或 local",
            ) from exc
        GameAccountService(db).update_account(
            data.account_id,
            current_user.user_id,
            GameAccountUpdate(
                time_display=display,
                local_timezone=data.local_timezone,
            ),
        )
    if data.utc_offset is not None:
        account = GameAccountService(db).get_account_by_id(
            data.account_id, current_user.user_id
        )
        if account and account.world_id:
            GameWorldService(db).update_world(
                account.world_id,
                current_user.user_id,
                GameWorldUpdate(utc_offset=data.utc_offset),
            )

    payload = dict(data.data or {})
    if data.village_id:
        payload["village_id"] = data.village_id

    service = PasteService(db)
    if data.draft_id:
        result = service.confirm_from_draft(
            current_user.user_id,
            draft_id=data.draft_id,
            capture_at=data.capture_at,
            page_type_override=data.page_type,
            parsed_override=payload,
        )
    else:
        result = service.confirm_parsed(
            current_user.user_id,
            account_id=data.account_id,
            page_type=data.page_type,
            data=payload,
            capture_at=data.capture_at,
            source=data.source,
            server_time=data.server_time,
        )
    if not result.get("success"):
        code = status.HTTP_403_FORBIDDEN
        if result.get("error_code") in ("unsupported", "empty_parse"):
            code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=code,
            detail=result.get("message") or "存入失敗",
        )
    # help_improve 尚未接上送出管線；前端標「尚未送出」
    _ = data.help_improve
    return ConfirmResponse(
        success=True,
        message=str(result.get("message") or "ok"),
        created=int(result.get("created") or 0),
        updated=int(result.get("updated") or 0),
        total=int(result.get("total") or 0),
        village_id=result.get("village_id"),
        movement_ids=list(result.get("movement_ids") or []),
    )


@router.get(
    "/movements",
    response_model=MovementListResponse,
    summary="來襲列表（P0-06）",
)
def list_movements(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str = Query(...),
    village_id: str | None = Query(
        None, description="只顯示該村莊來襲；省略＝全部村莊"
    ),
) -> MovementListResponse:
    ok, message, rows = PasteService(db).list_incoming(
        current_user.user_id, account_id, village_id=village_id
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)
    items = [
        MovementResponse(
            movement_id=r.movement_id,
            village_id=r.village_id,
            kind=r.kind,
            role=r.role,
            headline=r.headline,
            coordinate_x=r.coordinate_x,
            coordinate_y=r.coordinate_y,
            arrival_at=r.arrival_at,
            needs_coords=r.needs_coords,
            troops=(r.troops_json or {}).get("troops") or [],
            source=r.source,
        )
        for r in rows
    ]
    return MovementListResponse(movements=items, total=len(items))


@router.patch(
    "/movements/{movement_id}/coords",
    response_model=MovementResponse,
    summary="補來襲座標",
)
def patch_movement_coords(
    movement_id: str,
    data: MovementCoordsUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> MovementResponse:
    ok, message, row = PasteService(db).update_movement_coords(
        current_user.user_id,
        movement_id,
        coordinate_x=data.coordinate_x,
        coordinate_y=data.coordinate_y,
    )
    if not ok or row is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)
    return MovementResponse(
        movement_id=row.movement_id,
        village_id=row.village_id,
        kind=row.kind,
        role=row.role,
        headline=row.headline,
        coordinate_x=row.coordinate_x,
        coordinate_y=row.coordinate_y,
        arrival_at=row.arrival_at,
        needs_coords=row.needs_coords,
        troops=(row.troops_json or {}).get("troops") or [],
        source=row.source,
    )
