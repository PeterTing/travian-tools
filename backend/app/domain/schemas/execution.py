"""執行任務 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.execution_task import (
    ExecutionStatus,
    ExecutionType,
)


class ExecutionTaskBase(BaseModel):
    """執行任務基礎 Schema."""

    execution_type: ExecutionType = Field(..., description="執行類型")
    target_id: str = Field(..., description="目標 ID (建築/兵種 ID)")
    target_name: str = Field(..., description="目標名稱")
    target_level: int | None = Field(None, description="目標等級 (建築用)")
    quantity: int = Field(1, ge=1, description="數量 (訓練用)")
    position: int | None = Field(None, description="建築位置 (1-40)")


class ExecutionTaskCreate(ExecutionTaskBase):
    """建立執行任務請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    village_id: str | None = Field(None, description="村莊 ID")
    cost_wood: int = Field(0, ge=0, description="木材成本")
    cost_clay: int = Field(0, ge=0, description="黏土成本")
    cost_iron: int = Field(0, ge=0, description="鐵礦成本")
    cost_crop: int = Field(0, ge=0, description="糧食成本")
    estimated_duration: int = Field(0, ge=0, description="預估時間(秒)")
    priority: int = Field(0, description="優先順序 (數字越大越優先)")


class ExecutionTaskUpdate(BaseModel):
    """更新執行任務請求."""

    priority: int | None = Field(None, description="優先順序")
    status: ExecutionStatus | None = Field(None, description="狀態")


class ExecutionTaskResponse(ExecutionTaskBase):
    """執行任務回應."""

    task_id: str
    user_id: str
    account_id: str
    village_id: str | None
    cost_wood: int
    cost_clay: int
    cost_iron: int
    cost_crop: int
    estimated_duration: int
    status: ExecutionStatus
    priority: int
    result_message: str | None
    error_message: str | None
    screenshot_path: str | None
    created_at: datetime
    confirmed_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None

    # 額外計算欄位
    total_cost: int = Field(0, description="總成本")

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_total(
        cls, obj: "ExecutionTaskResponse"
    ) -> "ExecutionTaskResponse":
        """從 ORM 物件建立，並計算總成本."""
        data = {
            "task_id": obj.task_id,
            "user_id": obj.user_id,
            "account_id": obj.account_id,
            "village_id": obj.village_id,
            "execution_type": obj.execution_type,
            "target_id": obj.target_id,
            "target_name": obj.target_name,
            "target_level": obj.target_level,
            "quantity": obj.quantity,
            "position": obj.position,
            "cost_wood": obj.cost_wood,
            "cost_clay": obj.cost_clay,
            "cost_iron": obj.cost_iron,
            "cost_crop": obj.cost_crop,
            "estimated_duration": obj.estimated_duration,
            "status": obj.status,
            "priority": obj.priority,
            "result_message": obj.result_message,
            "error_message": obj.error_message,
            "screenshot_path": obj.screenshot_path,
            "created_at": obj.created_at,
            "confirmed_at": obj.confirmed_at,
            "started_at": obj.started_at,
            "completed_at": obj.completed_at,
            "total_cost": obj.cost_wood + obj.cost_clay + obj.cost_iron + obj.cost_crop,
        }
        return cls(**data)


class ExecutionTaskListResponse(BaseModel):
    """執行任務列表回應."""

    tasks: list[ExecutionTaskResponse]
    total: int
    pending_count: int = Field(0, description="待確認數量")
    confirmed_count: int = Field(0, description="已確認數量")
    executing_count: int = Field(0, description="執行中數量")


class ExecutionTaskConfirmRequest(BaseModel):
    """確認執行任務請求."""

    task_ids: list[str] = Field(..., min_length=1, description="任務 ID 列表")


class ExecutionTaskConfirmResponse(BaseModel):
    """確認執行任務回應."""

    confirmed_count: int
    failed_count: int
    failed_task_ids: list[str] = Field(default_factory=list)
    message: str


# 執行日誌相關 Schema
class ExecutionLogResponse(BaseModel):
    """執行日誌回應."""

    log_id: str
    task_id: str
    user_id: str
    account_id: str
    village_id: str | None
    execution_type: ExecutionType
    target_id: str
    target_name: str
    parameters: str | None
    success: bool
    result_message: str | None
    error_message: str | None
    screenshot_path: str | None
    started_at: datetime
    completed_at: datetime | None
    duration_ms: int | None

    model_config = {"from_attributes": True}


class ExecutionLogListResponse(BaseModel):
    """執行日誌列表回應."""

    logs: list[ExecutionLogResponse]
    total: int
    success_count: int
    failure_count: int


# 安全機制相關 Schema
class SafetyConfig(BaseModel):
    """安全設定."""

    daily_operation_limit: int = Field(100, description="每日操作上限")
    min_operation_interval: int = Field(60, description="最小操作間隔(秒)")
    allowed_hours_start: int = Field(7, ge=0, le=23, description="允許操作時間起始")
    allowed_hours_end: int = Field(23, ge=0, le=23, description="允許操作時間結束")
    min_delay_seconds: float = Field(1.0, ge=0.5, description="最小隨機延遲(秒)")
    max_delay_seconds: float = Field(5.0, ge=1.0, description="最大隨機延遲(秒)")


class SafetyCheckResult(BaseModel):
    """安全檢查結果."""

    can_execute: bool = Field(..., description="是否可執行")
    reason: str | None = Field(None, description="不可執行原因")
    daily_operations_used: int = Field(0, description="今日已用操作次數")
    daily_operations_remaining: int = Field(100, description="今日剩餘操作次數")
    last_operation_at: datetime | None = Field(None, description="上次操作時間")
    seconds_until_next_allowed: int = Field(0, description="距下次可操作秒數")


class ExecutionQueueStatsResponse(BaseModel):
    """執行佇列統計回應."""

    total_tasks: int
    pending_tasks: int
    confirmed_tasks: int
    executing_tasks: int
    completed_today: int
    failed_today: int
    safety_check: SafetyCheckResult
