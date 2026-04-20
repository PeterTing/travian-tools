"""自動化設定 API 端點."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.automation import (
    AutomationSettingsResponse,
    AutomationSettingsUpdate,
    KeepAliveLogListResponse,
    KeepAliveStatsResponse,
    VillageAutoUpgradeConfigCreate,
    VillageAutoUpgradeConfigListResponse,
    VillageAutoUpgradeConfigResponse,
    VillageAutoUpgradeConfigUpdate,
)
from app.infrastructure.database.models.user import User
from app.services.automation_service import AutomationService

router = APIRouter(prefix="/automation", tags=["automation"])


# ============ 自動化設定 ============


@router.get(
    "/settings/{account_id}",
    response_model=AutomationSettingsResponse,
    summary="取得自動化設定",
)
async def get_automation_settings(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AutomationSettingsResponse:
    """取得自動化設定（如果不存在則建立預設）."""
    service = AutomationService(db)
    return service.get_or_create_automation_settings(account_id, current_user.user_id)


@router.patch(
    "/settings/{account_id}",
    response_model=AutomationSettingsResponse,
    summary="更新自動化設定",
)
async def update_automation_settings(
    account_id: str,
    data: AutomationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AutomationSettingsResponse:
    """更新自動化設定."""
    service = AutomationService(db)
    update_data = data.model_dump(exclude_unset=True)
    return service.update_automation_settings(
        account_id=account_id,
        user_id=current_user.user_id,
        **update_data,
    )


# ============ 村莊自動升級配置 ============


@router.get(
    "/auto-upgrade/{account_id}",
    response_model=VillageAutoUpgradeConfigListResponse,
    summary="取得帳號所有村莊自動升級配置",
)
async def get_auto_upgrade_configs(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigListResponse:
    """取得帳號所有村莊自動升級配置."""
    service = AutomationService(db)
    configs = service.get_auto_upgrade_configs_by_account(
        account_id, current_user.user_id
    )
    return VillageAutoUpgradeConfigListResponse(configs=configs, total=len(configs))


@router.get(
    "/auto-upgrade/{account_id}/{village_id}",
    response_model=VillageAutoUpgradeConfigResponse,
    summary="取得村莊自動升級配置",
)
async def get_auto_upgrade_config(
    account_id: str,
    village_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigResponse:
    """取得村莊自動升級配置."""
    service = AutomationService(db)
    config = service.get_auto_upgrade_config(village_id, current_user.user_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊自動升級配置",
        )
    return config


@router.post(
    "/auto-upgrade/{account_id}",
    response_model=VillageAutoUpgradeConfigResponse,
    status_code=status.HTTP_201_CREATED,
    summary="建立或更新村莊自動升級配置",
)
async def create_or_update_auto_upgrade_config(
    account_id: str,
    data: VillageAutoUpgradeConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigResponse:
    """建立或更新村莊自動升級配置."""
    service = AutomationService(db)
    return service.create_or_update_auto_upgrade_config(
        user_id=current_user.user_id,
        account_id=account_id,
        village_id=data.village_id,
        enabled=data.enabled,
        skip_upgrade=data.skip_upgrade,
        roman_dual_build_enabled=data.roman_dual_build_enabled,
        plus_multi_build_enabled=data.plus_multi_build_enabled,
        priority_type=data.priority_type,
    )


@router.patch(
    "/auto-upgrade/{account_id}/{village_id}",
    response_model=VillageAutoUpgradeConfigResponse,
    summary="更新村莊自動升級配置",
)
async def update_auto_upgrade_config(
    account_id: str,
    village_id: str,
    data: VillageAutoUpgradeConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigResponse:
    """更新村莊自動升級配置."""
    service = AutomationService(db)
    config = service.get_auto_upgrade_config(village_id, current_user.user_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊自動升級配置",
        )

    update_data = data.model_dump(exclude_unset=True)
    return service.create_or_update_auto_upgrade_config(
        user_id=current_user.user_id,
        account_id=account_id,
        village_id=village_id,
        enabled=update_data.get("enabled", config.enabled),
        skip_upgrade=update_data.get("skip_upgrade", config.skip_upgrade),
        roman_dual_build_enabled=update_data.get(
            "roman_dual_build_enabled", config.roman_dual_build_enabled
        ),
        plus_multi_build_enabled=update_data.get(
            "plus_multi_build_enabled", config.plus_multi_build_enabled
        ),
        priority_type=update_data.get("priority_type", config.priority_type),
    )


@router.post(
    "/auto-upgrade/{account_id}/{village_id}/toggle",
    response_model=VillageAutoUpgradeConfigResponse,
    summary="切換村莊自動升級開關",
)
async def toggle_auto_upgrade(
    account_id: str,
    village_id: str,
    enabled: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigResponse:
    """切換村莊自動升級開關."""
    service = AutomationService(db)
    config = service.toggle_village_auto_upgrade(
        village_id, current_user.user_id, enabled
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊自動升級配置",
        )
    return config


@router.post(
    "/auto-upgrade/{account_id}/{village_id}/skip",
    response_model=VillageAutoUpgradeConfigResponse,
    summary="切換村莊略過升級",
)
async def toggle_skip_upgrade(
    account_id: str,
    village_id: str,
    skip: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageAutoUpgradeConfigResponse:
    """切換村莊略過升級."""
    service = AutomationService(db)
    config = service.toggle_village_skip_upgrade(village_id, current_user.user_id, skip)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊自動升級配置",
        )
    return config


# ============ Keep-alive ============


@router.get(
    "/keepalive/logs/{account_id}",
    response_model=KeepAliveLogListResponse,
    summary="取得 Keep-alive 日誌",
)
async def get_keepalive_logs(
    account_id: str,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KeepAliveLogListResponse:
    """取得 Keep-alive 日誌."""
    service = AutomationService(db)
    logs = service.get_keepalive_logs(current_user.user_id, account_id, limit)
    return KeepAliveLogListResponse(logs=logs, total=len(logs))


@router.get(
    "/keepalive/stats/{account_id}",
    response_model=KeepAliveStatsResponse,
    summary="取得 Keep-alive 統計",
)
async def get_keepalive_stats(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KeepAliveStatsResponse:
    """取得 Keep-alive 統計."""
    service = AutomationService(db)
    return service.get_keepalive_stats(current_user.user_id, account_id)


@router.get(
    "/keepalive/status/{account_id}",
    summary="取得 session 狀態",
)
async def get_session_status(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """取得 session 狀態."""
    service = AutomationService(db)
    is_expired = service.is_session_expired(account_id, current_user.user_id)
    last_keepalive = service.get_last_keepalive(account_id, current_user.user_id)

    return {
        "session_expired": is_expired,
        "last_keepalive_at": (last_keepalive.executed_at if last_keepalive else None),
        "last_keepalive_success": (last_keepalive.success if last_keepalive else None),
    }


@router.post(
    "/popup/handle/{account_id}",
    summary="處理彈窗（瀏覽器自動化）",
)
async def handle_popups(
    account_id: str,
    delay_seconds: int = Query(60, ge=10, le=300, description="關閉前延遲秒數"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """處理彈窗（透過瀏覽器自動化）.

    注意：此端點需要瀏覽器實例已經存在。
    通常在 keep-alive 檢查時一併處理。
    """
    from app.services.execution_engine import PopupHandlerEngine

    engine = PopupHandlerEngine()
    result = await engine.handle_popups(delay_seconds=delay_seconds)

    return {
        "success": result.success,
        "message": result.message or result.error,
        "closed_count": result.details.get("closed_count", 0) if result.details else 0,
    }


@router.post(
    "/mh/handle/{account_id}",
    summary="處理 MH 公告（瀏覽器自動化）",
)
async def handle_mh_announcement(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """處理 MH 公告（透過瀏覽器自動化）.

    注意：此端點需要瀏覽器實例已經存在。
    """
    from app.services.execution_engine import PopupHandlerEngine

    engine = PopupHandlerEngine()
    result = await engine.handle_mh_announcement()

    return {
        "success": result.success,
        "message": result.message or result.error,
    }


@router.get(
    "/attack/check/{account_id}",
    summary="檢查攻擊（瀏覽器自動化）",
)
async def check_attacks(
    account_id: str,
    server_url: str = Query(..., description="遊戲伺服器 URL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """檢查是否有攻擊（透過瀏覽器自動化）.

    注意：此端點會啟動瀏覽器進行檢查。
    前端應根據 has_attacks 來決定是否播放警告音效。
    """
    from app.services.execution_engine import AttackWarningEngine

    engine = AttackWarningEngine()
    await engine._navigate(server_url)
    result = await engine.check_attacks()

    return {
        "success": result.success,
        "message": result.message or result.error,
        "has_attacks": result.details.get("has_attacks", False)
        if result.details
        else False,
        "attacks": result.details.get("attacks", []) if result.details else [],
    }


@router.post(
    "/keepalive/execute/{account_id}",
    summary="執行 Keep-alive（瀏覽器自動化）",
)
async def execute_keepalive(
    account_id: str,
    server_url: str = Query(..., description="遊戲伺服器 URL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """執行 Keep-alive（透過瀏覽器自動化）.

    注意：此端點會啟動瀏覽器進行 keep-alive 操作。
    """
    from app.services.execution_engine import KeepAliveExecutionEngine

    service = AutomationService(db)

    # 執行 keep-alive
    engine = KeepAliveExecutionEngine()
    result = await engine.execute(server_url=server_url)

    # 記錄結果
    log = service.create_keepalive_log(
        user_id=current_user.user_id,
        account_id=account_id,
        success=result.success,
        response_time_ms=result.duration_ms,
        error_message=result.error,
        session_expired=result.details.get("session_expired", False)
        if result.details
        else False,
    )

    return {
        "success": result.success,
        "message": result.message or result.error,
        "session_expired": result.details.get("session_expired", False)
        if result.details
        else False,
        "log_id": log.log_id,
    }


# ============ 版本檢查 ============


@router.get(
    "/version",
    summary="取得版本資訊",
)
async def get_version() -> dict:
    """取得版本資訊."""
    from app.services.version_service import get_current_version

    return {
        "current_version": get_current_version(),
        "latest_version": None,  # 不進行網路請求
        "update_available": False,
        "release_notes": None,
        "download_url": None,
    }


@router.get(
    "/version/check",
    summary="檢查更新",
)
async def check_update() -> dict:
    """檢查是否有更新（會進行網路請求）."""
    from app.services.version_service import check_latest_version

    return await check_latest_version()


# ============ URL 快取 ============


@router.get(
    "/cache/stats",
    summary="取得 URL 快取統計",
)
async def get_cache_stats() -> dict:
    """取得 URL 快取統計."""
    from app.services.url_cache_service import url_cache

    return url_cache.get_stats()


@router.post(
    "/cache/clear",
    summary="清空 URL 快取",
)
async def clear_cache() -> dict:
    """清空 URL 快取."""
    from app.services.url_cache_service import url_cache

    count = url_cache.clear()
    return {"cleared_count": count}
