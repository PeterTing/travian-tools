"""Pytest configuration and fixtures."""

import os

# Settings refuse the public default JWT secret when DEBUG is off (P0-12 B1).
# Give the test process a test-only key before the app (and its settings) load.
os.environ.setdefault(
    "JWT_SECRET_KEY", "test-only-jwt-secret-not-for-production-0123456789"
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)
