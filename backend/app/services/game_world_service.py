"""遊戲世界服務（P0-02）."""

from sqlalchemy.orm import Session

from app.domain.schemas.game_world import GameWorldUpdate
from app.infrastructure.database.models.game_world import GameWorld
from app.utils.world_url import normalize_server_url


class GameWorldService:
    """每個網站使用者 × 伺服器網址一筆世界資料."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    def get_or_create(self, user_id: str, server_url: str) -> GameWorld:
        """找這個使用者在這個世界的資料，沒有就建一筆（不 commit）."""
        url = normalize_server_url(server_url)
        world = (
            self.db.query(GameWorld)
            .filter(GameWorld.user_id == user_id, GameWorld.server_url == url)
            .first()
        )
        if world is None:
            world = GameWorld(user_id=user_id, server_url=url)
            self.db.add(world)
            self.db.flush()
        return world

    def list_worlds(self, user_id: str) -> list[GameWorld]:
        """列出使用者的世界（依網址排序）."""
        return (
            self.db.query(GameWorld)
            .filter(GameWorld.user_id == user_id)
            .order_by(GameWorld.server_url)
            .all()
        )

    def get_world(self, world_id: str, user_id: str) -> GameWorld | None:
        """取得自己的世界；別人的回傳 None."""
        return (
            self.db.query(GameWorld)
            .filter(GameWorld.world_id == world_id, GameWorld.user_id == user_id)
            .first()
        )

    def update_world(
        self, world_id: str, user_id: str, data: GameWorldUpdate
    ) -> GameWorld | None:
        """手動修改世界設定（目前只有 UTC 時差）."""
        world = self.get_world(world_id, user_id)
        if world is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(world, field, value)
        self.db.commit()
        self.db.refresh(world)
        return world
