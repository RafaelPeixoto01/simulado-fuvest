import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app
from tests.utils import aplicar_migrations


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url="sqlite://",
        data_dir=tmp_path / "provas",
        environment="test",
    )


@pytest.fixture
def app(settings):
    """App com banco SQLite em memoria e as migrations reais aplicadas."""
    aplicacao = criar_app(settings)
    aplicar_migrations(aplicacao.state.engine)
    return aplicacao


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sessao(app):
    with app.state.fabrica_sessao() as s:
        yield s
