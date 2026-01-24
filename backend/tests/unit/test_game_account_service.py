"""遊戲帳號服務單元測試."""

from unittest.mock import MagicMock

import pytest

from app.domain.schemas.game_account import GameAccountCreate, GameAccountUpdate
from app.infrastructure.database.models.game_account import GameAccount, TribeType
from app.services.game_account_service import GameAccountService


@pytest.fixture
def mock_db() -> MagicMock:
    """模擬資料庫 session."""
    return MagicMock()


@pytest.fixture
def service(mock_db: MagicMock) -> GameAccountService:
    """建立服務實例."""
    return GameAccountService(mock_db)


class TestGameAccountServiceCreate:
    """建立遊戲帳號測試."""

    def test_create_account_success(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試成功建立帳號."""
        data = GameAccountCreate(
            server_url="https://ts1.travian.com",
            server_name="Speed 3x",
            server_speed=3,
            tribe=TribeType.ROMANS,
            player_name="TestPlayer",
        )
        user_id = "user-123"

        result = service.create_account(user_id, data)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
        assert isinstance(result, GameAccount)
        assert result.user_id == user_id
        assert result.server_url == "https://ts1.travian.com"

    def test_create_account_minimal(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試最小必要欄位建立."""
        data = GameAccountCreate(server_url="https://ts1.travian.com")
        user_id = "user-123"

        result = service.create_account(user_id, data)

        assert result.server_speed == 1
        assert result.tribe is None


class TestGameAccountServiceGet:
    """取得遊戲帳號測試."""

    def test_get_account_by_id_found(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試找到帳號."""
        mock_account = GameAccount(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
        )
        mock_db.query.return_value.filter.return_value.first.return_value = mock_account

        result = service.get_account_by_id("acc-123", "user-123")

        assert result == mock_account

    def test_get_account_by_id_not_found(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試找不到帳號."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = service.get_account_by_id("acc-123", "user-123")

        assert result is None

    def test_get_accounts_by_user(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試取得用戶的帳號列表."""
        mock_accounts = [
            GameAccount(
                account_id="acc-1",
                user_id="user-123",
                server_url="https://ts1.travian.com",
            ),
            GameAccount(
                account_id="acc-2",
                user_id="user-123",
                server_url="https://ts2.travian.com",
            ),
        ]
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = mock_accounts

        result = service.get_accounts_by_user("user-123")

        assert len(result) == 2

    def test_get_accounts_include_inactive(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試包含非活躍帳號."""
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.all.return_value = []

        service.get_accounts_by_user("user-123", include_inactive=True)

        # 驗證 filter 被呼叫一次（只有 user_id）
        assert mock_query.filter.call_count == 1


class TestGameAccountServiceUpdate:
    """更新遊戲帳號測試."""

    def test_update_account_success(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試成功更新帳號."""
        mock_account = GameAccount(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
            player_name="OldName",
        )
        mock_db.query.return_value.filter.return_value.first.return_value = mock_account

        data = GameAccountUpdate(player_name="NewName")
        result = service.update_account("acc-123", "user-123", data)

        assert result is not None
        assert result.player_name == "NewName"
        mock_db.commit.assert_called_once()

    def test_update_account_not_found(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試更新不存在的帳號."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        data = GameAccountUpdate(player_name="NewName")
        result = service.update_account("acc-123", "user-123", data)

        assert result is None
        mock_db.commit.assert_not_called()

    def test_update_account_partial(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試部分更新."""
        mock_account = GameAccount(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
            player_name="OldName",
            server_speed=1,
        )
        mock_db.query.return_value.filter.return_value.first.return_value = mock_account

        data = GameAccountUpdate(server_speed=3)
        result = service.update_account("acc-123", "user-123", data)

        assert result is not None
        assert result.server_speed == 3
        assert result.player_name == "OldName"  # 未被更新


class TestGameAccountServiceDelete:
    """刪除遊戲帳號測試."""

    def test_delete_account_success(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試成功刪除帳號."""
        mock_account = GameAccount(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
        )
        mock_db.query.return_value.filter.return_value.first.return_value = mock_account

        result = service.delete_account("acc-123", "user-123")

        assert result is True
        mock_db.delete.assert_called_once_with(mock_account)
        mock_db.commit.assert_called_once()

    def test_delete_account_not_found(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試刪除不存在的帳號."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = service.delete_account("acc-123", "user-123")

        assert result is False
        mock_db.delete.assert_not_called()


class TestGameAccountServiceCount:
    """計算遊戲帳號數量測試."""

    def test_count_accounts_by_user(
        self,
        service: GameAccountService,
        mock_db: MagicMock,
    ) -> None:
        """測試計算用戶帳號數量."""
        mock_db.query.return_value.filter.return_value.count.return_value = 3

        result = service.count_accounts_by_user("user-123")

        assert result == 3
