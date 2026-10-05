"""POST /statistics/snapshot/upload — manual map.sql upload for snapshots."""

import gzip
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.statistics import router
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.models.user import User

app = FastAPI()
app.include_router(router)

LINE = (
    "INSERT INTO `x_world` VALUES (1,0,0,1,10,'A',1,'P',0,'',100,NULL,TRUE,"
    "NULL,NULL,NULL);\n"
)


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: User(
        user_id="u1", username="u", email="u@example.com", password_hash="x"
    )
    app.dependency_overrides[get_db] = lambda: MagicMock()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _post(client: TestClient, payload: bytes):  # noqa: ANN202
    return client.post(
        "/statistics/snapshot/upload",
        data={"server_url": "https://ts1.travian.com/"},
        files={"file": ("map.sql.gz", payload, "application/gzip")},
    )


@patch("app.api.v1.endpoints.statistics.SnapshotService")
def test_upload_ingests_without_network(svc: MagicMock, client: TestClient) -> None:
    svc.return_value.ingest.return_value = {"snapshot_id": "s1", "total_villages": 1}
    response = _post(client, gzip.compress(LINE.encode()))
    assert response.status_code == 200
    assert response.json()["snapshot_id"] == "s1"
    server_url, content = svc.return_value.ingest.call_args.args
    assert server_url == "https://ts1.travian.com"
    assert "x_world" in content
    svc.return_value.fetch_and_ingest.assert_not_called()


@patch("app.api.v1.endpoints.statistics.SnapshotService")
def test_upload_empty_map_is_400(svc: MagicMock, client: TestClient) -> None:
    svc.return_value.ingest.return_value = None
    assert _post(client, b"nothing here").status_code == 400


def test_old_trigger_endpoint_is_gone(client: TestClient) -> None:
    response = client.post("/statistics/snapshot/trigger", params={"server_url": "x"})
    assert response.status_code in (404, 405)
