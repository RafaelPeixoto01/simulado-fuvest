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


@pytest.fixture
def base_sintetica(sessao, settings):
    """Provas ficticias 2098 e 2099 sincronizadas no banco do app (e figuras em DATA_DIR)."""
    from app.pacote.sincronizar import sincronizar
    from tests.fixtures.gerar_pacotes import escrever_pacotes

    escrever_pacotes(settings.data_dir)
    sincronizar(sessao, settings.data_dir)
    return settings.data_dir
