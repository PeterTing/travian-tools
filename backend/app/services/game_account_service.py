"""遊戲帳號服務."""

from sqlalchemy.orm import Session

from app.domain.schemas.game_account import GameAccountCreate, GameAccountUpdate
from app.infrastructure.database.models.game_account import (
    GameAccount,
    TimeDisplay,
    TribeType,
)
from app.services.game_world_service import GameWorldService
from app.utils.world_url import describe_server_url


class GameAccountService:
    """遊戲帳號服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    def create_account(self, user_id: str, data: GameAccountCreate) -> GameAccount:
        """建立遊戲帳號."""
        # Pydantic 已經驗證並轉換 tribe 為 TribeType Enum、正規化 server_url
        world = GameWorldService(self.db).get_or_create(user_id, data.server_url)
        account = GameAccount(
            user_id=user_id,
            server_url=data.server_url,
            world_id=world.world_id,
            server_name=data.server_name,
            server_speed=data.server_speed or 1,
            tribe=data.tribe,
            birth_tribe=data.tribe,
            player_name=data.player_name,
            alliance_name=data.alliance_name,
            server_start_date=data.server_start_date,
            time_display=data.time_display,
            local_timezone=data.local_timezone,
        )
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def get_account_by_id(self, account_id: str, user_id: str) -> GameAccount | None:
        """根據 ID 取得遊戲帳號."""
        return (
            self.db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )

    def get_accounts_by_user(
        self,
        user_id: str,
        include_inactive: bool = False,
    ) -> list[GameAccount]:
        """取得用戶的所有遊戲帳號."""
        query = self.db.query(GameAccount).filter(GameAccount.user_id == user_id)
        if not include_inactive:
            query = query.filter(GameAccount.is_active.is_(True))
        return query.order_by(GameAccount.created_at.desc()).all()

    def update_account(
        self,
        account_id: str,
        user_id: str,
        data: GameAccountUpdate,
    ) -> GameAccount | None:
        """更新遊戲帳號."""
        account = self.get_account_by_id(account_id, user_id)
        if not account:
            return None

        update_data = data.model_dump(exclude_unset=True)
        new_display = update_data.get("time_display", account.time_display)
        new_timezone = update_data.get("local_timezone", account.local_timezone)
        if new_display == TimeDisplay.LOCAL and not new_timezone:
            raise ValueError("選「本地時間」時需要填時區")
        world_changed = (
            "server_url" in update_data
            and update_data["server_url"] is not None
            and update_data["server_url"] != account.server_url
        )
        if world_changed:
            # 換了世界：名稱和速度沒有明確給（沒送或送空）就從新網址重新推，
            # 不然頂部的世界和擴充「存到」會顯示舊的世界
            info = describe_server_url(update_data["server_url"])
            if not update_data.get("server_name"):
                update_data["server_name"] = info.server_name
            if update_data.get("server_speed") is None:
                update_data["server_speed"] = info.server_speed or 1
        if "server_speed" in update_data and update_data["server_speed"] is None:
            del update_data["server_speed"]
        for field, value in update_data.items():
            setattr(account, field, value)
        if "tribe" in update_data:
            self._change_birth_tribe(account, update_data["tribe"])
        if "server_url" in update_data:
            # 換了世界就接到那個世界（沒有就建一筆）
            world = GameWorldService(self.db).get_or_create(user_id, account.server_url)
            account.world_id = world.world_id

        self.db.commit()
        self.db.refresh(account)
        return account

    def _change_birth_tribe(
        self,
        account: GameAccount,
        new_tribe: TribeType | None,
    ) -> None:
        """帳號的部族就是出生部族（P0-25）：兩個欄位一起改.

        一般伺服器：所有村莊一起改（整個帳號一個部族）。
        「征服保留部族」世界（PM 決定，#39）：只有還沒設定部族（NULL）的村莊跟著改；
        有設定部族的村莊一律不動——就算剛好等於舊的部族，也可能是真的征服來的那一族。
        """
        account.birth_tribe = new_tribe
        multi_tribe = bool(account.world and account.world.keep_tribe_on_conquest)
        for village in account.villages:
            if not multi_tribe or village.tribe is None:
                village.tribe = new_tribe

    def delete_account(self, account_id: str, user_id: str) -> bool:
        """刪除遊戲帳號."""
        account = self.get_account_by_id(account_id, user_id)
        if not account:
            return False

        self.db.delete(account)
        self.db.commit()
        return True

    def count_accounts_by_user(self, user_id: str) -> int:
        """計算用戶的遊戲帳號數量."""
        return self.db.query(GameAccount).filter(GameAccount.user_id == user_id).count()
