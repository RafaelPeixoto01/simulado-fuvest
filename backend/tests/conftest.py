import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url="sqlite://",
        data_dir=tmp_path / "provas",
        environment="test",
    )


@pytest.fixture
def client(settings):
    with TestClient(criar_app(settings)) as c:
        yield c
