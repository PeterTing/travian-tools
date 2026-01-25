"""遊戲帳號服務."""

from sqlalchemy.orm import Session

from app.domain.schemas.game_account import GameAccountCreate, GameAccountUpdate
from app.infrastructure.database.models.game_account import GameAccount


class GameAccountService:
    """遊戲帳號服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    def create_account(self, user_id: str, data: GameAccountCreate) -> GameAccount:
        """建立遊戲帳號."""
        # Pydantic 已經驗證並轉換 tribe 為 TribeType Enum
        account = GameAccount(
            user_id=user_id,
            server_url=data.server_url,
            server_name=data.server_name,
            server_speed=data.server_speed,
            tribe=data.tribe,
            player_name=data.player_name,
            alliance_name=data.alliance_name,
            account_age_days=data.account_age_days,
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
        for field, value in update_data.items():
            setattr(account, field, value)

        self.db.commit()
        self.db.refresh(account)
        return account

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
