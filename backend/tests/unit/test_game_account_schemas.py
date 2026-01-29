"""遊戲帳號 Schema 單元測試."""

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.domain.schemas.game_account import (
    GameAccountCreate,
    GameAccountUpdate,
)
from app.infrastructure.database.models.game_account import TribeType


class TestGameAccountCreate:
    """GameAccountCreate Schema 測試."""

    def test_valid_create(self) -> None:
        """測試有效的建立請求."""
        data = GameAccountCreate(
            server_url="https://ts1.travian.com",
            server_name="Speed 3x",
            server_speed=3,
            tribe=TribeType.ROMANS,
            player_name="TestPlayer",
            alliance_name="TestAlliance",
            server_start_date=date.today() - timedelta(days=10),
        )
        assert data.server_url == "https://ts1.travian.com"
        assert data.server_speed == 3
        assert data.tribe == TribeType.ROMANS

    def test_minimal_create(self) -> None:
        """測試最小必要欄位."""
        data = GameAccountCreate(server_url="https://ts1.travian.com")
        assert data.server_url == "https://ts1.travian.com"
        assert data.server_speed == 1
        assert data.tribe is None

    def test_invalid_server_url_no_protocol(self) -> None:
        """測試無協議的 URL."""
        with pytest.raises(ValidationError) as exc_info:
            GameAccountCreate(server_url="ts1.travian.com")
        assert "伺服器 URL 必須以 http:// 或 https:// 開頭" in str(exc_info.value)

    def test_server_url_http_allowed(self) -> None:
        """測試 http 協議允許."""
        data = GameAccountCreate(server_url="http://ts1.travian.com")
        assert data.server_url == "http://ts1.travian.com"

    def test_server_url_trimmed(self) -> None:
        """測試 URL 前後空白被移除."""
        data = GameAccountCreate(server_url="  https://ts1.travian.com  ")
        assert data.server_url == "https://ts1.travian.com"

    def test_empty_server_url(self) -> None:
        """測試空的 URL."""
        with pytest.raises(ValidationError):
            GameAccountCreate(server_url="")

    def test_server_speed_range(self) -> None:
        """測試伺服器速度範圍."""
        # 有效範圍
        data = GameAccountCreate(server_url="https://ts1.travian.com", server_speed=1)
        assert data.server_speed == 1

        data = GameAccountCreate(server_url="https://ts1.travian.com", server_speed=10)
        assert data.server_speed == 10

        # 無效範圍
        with pytest.raises(ValidationError):
            GameAccountCreate(server_url="https://ts1.travian.com", server_speed=0)

        with pytest.raises(ValidationError):
            GameAccountCreate(server_url="https://ts1.travian.com", server_speed=11)

    def test_server_start_date_valid(self) -> None:
        """測試有效的伺服器開始日期."""
        # 可以是過去的日期
        data = GameAccountCreate(
            server_url="https://ts1.travian.com",
            server_start_date=date.today() - timedelta(days=10),
        )
        assert data.server_start_date == date.today() - timedelta(days=10)

        # 也可以是今天
        data = GameAccountCreate(
            server_url="https://ts1.travian.com",
            server_start_date=date.today(),
        )
        assert data.server_start_date == date.today()


class TestGameAccountUpdate:
    """GameAccountUpdate Schema 測試."""

    def test_partial_update(self) -> None:
        """測試部分更新."""
        data = GameAccountUpdate(player_name="NewName")
        assert data.player_name == "NewName"
        assert data.server_url is None
        assert data.tribe is None

    def test_full_update(self) -> None:
        """測試完整更新."""
        data = GameAccountUpdate(
            server_url="https://ts2.travian.com",
            server_name="New Server",
            server_speed=5,
            tribe=TribeType.GAULS,
            player_name="NewPlayer",
            alliance_name="NewAlliance",
            server_start_date=date.today() - timedelta(days=20),
            is_active=False,
        )
        assert data.server_url == "https://ts2.travian.com"
        assert data.is_active is False

    def test_empty_update(self) -> None:
        """測試空更新."""
        data = GameAccountUpdate()
        assert data.model_dump(exclude_unset=True) == {}

    def test_update_server_url_validation(self) -> None:
        """測試更新時的 URL 驗證."""
        with pytest.raises(ValidationError) as exc_info:
            GameAccountUpdate(server_url="invalid-url")
        assert "伺服器 URL 必須以 http:// 或 https:// 開頭" in str(exc_info.value)

    def test_update_null_server_url_allowed(self) -> None:
        """測試更新時允許 None."""
        data = GameAccountUpdate(server_url=None)
        assert data.server_url is None
