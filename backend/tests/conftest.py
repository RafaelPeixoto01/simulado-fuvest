import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import criar_app
from tests.utils import aplicar_migrations


@pytest.fixture(autouse=True)
def _zerar_rate_limit():
    """O limiter e unico no processo (como no Meu Controle): zera entre testes."""
    from app.rate_limit import limiter

    limiter.reset()


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


@pytest.fixture(scope="session")
def _pacotes_sinteticos(tmp_path_factory):
    """Gerados uma vez por sessao; cada teste recebe uma copia (pode alterar a vontade)."""
    from tests.fixtures.gerar_pacotes import escrever_pacotes

    destino = tmp_path_factory.mktemp("sinteticos")
    escrever_pacotes(destino)
    return destino


@pytest.fixture
def base_sintetica(sessao, settings, _pacotes_sinteticos):
    """Provas ficticias 2098 e 2099 sincronizadas no banco do app (e figuras em DATA_DIR)."""
    import shutil

    from app.pacote.sincronizar import sincronizar

    shutil.copytree(_pacotes_sinteticos, settings.data_dir)
    sincronizar(sessao, settings.data_dir)
    return settings.data_dir
