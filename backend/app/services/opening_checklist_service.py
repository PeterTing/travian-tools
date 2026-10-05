"""開局攻略清單服務（P0-10）.

清單內容是 ``data/static/opening_checklist.json``（由
``scripts/convert_opening_checklist.py`` 從 Peter 的 Excel 轉出來）；
這裡只存每個帳號 × 世界 × 攻略勾了哪些步驟。
"""

import json
from functools import cache, lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.schemas.opening_checklist import OpeningStrategy
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.opening_checklist import (
    OpeningChecklistProgress,
)
from app.services.game_world_service import GameWorldService

DATA_FILE = (
    Path(__file__).resolve().parents[2] / "data" / "static" / "opening_checklist.json"
)


@lru_cache(maxsize=1)
def load_checklist() -> dict[str, Any]:
    """讀清單內容（靜態檔，讀一次就好）."""
    with DATA_FILE.open(encoding="utf-8") as f:
        data: dict[str, Any] = json.load(f)
    return data


@cache
def step_order(strategy: str) -> tuple[str, ...]:
    """某個攻略的所有步驟代碼（照清單順序）."""
    for s in load_checklist()["strategies"]:
        if s["id"] == strategy:
            return tuple(
                step["id"] for section in s["sections"] for step in section["steps"]
            )
    raise KeyError(strategy)


@cache
def optional_step_ids(strategy: str) -> frozenset[str]:
    """選做段落（便宜的文明點建築）的步驟；不算進主進度."""
    for s in load_checklist()["strategies"]:
        if s["id"] == strategy:
            return frozenset(
                step["id"]
                for section in s["sections"]
                if section.get("optional")
                for step in section["steps"]
            )
    raise KeyError(strategy)


class UnknownStepError(LookupError):
    """這個攻略沒有這一步."""


class OpeningChecklistService:
    """勾選進度：按帳號 × 世界 × 攻略分開存."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    def get_account(self, account_id: str, user_id: str) -> GameAccount | None:
        """只能看自己的帳號；別人的（或不存在的）回傳 None."""
        account = (
            self.db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )
        if account is not None and account.world_id is None:
            # 舊資料可能還沒連到世界：照新增帳號的規則補上
            world = GameWorldService(self.db).get_or_create(user_id, account.server_url)
            account.world_id = world.world_id
            self.db.commit()
        return account

    def checked_steps(
        self, account: GameAccount, strategy: OpeningStrategy
    ) -> list[str]:
        """這個帳號在目前世界、這個攻略勾掉的步驟（照清單順序）."""
        rows = (
            self.db.query(OpeningChecklistProgress.step_id)
            .filter(
                OpeningChecklistProgress.account_id == account.account_id,
                OpeningChecklistProgress.world_id == account.world_id,
                OpeningChecklistProgress.strategy == strategy.value,
            )
            .all()
        )
        checked = {r[0] for r in rows}
        return [s for s in step_order(strategy.value) if s in checked]

    def set_step(
        self,
        account: GameAccount,
        strategy: OpeningStrategy,
        step_id: str,
        checked: bool,
    ) -> list[str]:
        """勾選或取消一步（冪等）；回傳更新後勾掉的步驟."""
        if step_id not in step_order(strategy.value):
            raise UnknownStepError(step_id)
        query = self.db.query(OpeningChecklistProgress).filter(
            OpeningChecklistProgress.account_id == account.account_id,
            OpeningChecklistProgress.world_id == account.world_id,
            OpeningChecklistProgress.strategy == strategy.value,
            OpeningChecklistProgress.step_id == step_id,
        )
        existing = query.first()
        if checked and existing is None:
            self.db.add(
                OpeningChecklistProgress(
                    account_id=account.account_id,
                    world_id=account.world_id,
                    strategy=strategy.value,
                    step_id=step_id,
                )
            )
            try:
                self.db.commit()
            except IntegrityError:
                # 兩個分頁同時勾同一步：另一邊已經寫進去了，結果一樣
                self.db.rollback()
        elif not checked and existing is not None:
            self.db.delete(existing)
            self.db.commit()
        return self.checked_steps(account, strategy)
