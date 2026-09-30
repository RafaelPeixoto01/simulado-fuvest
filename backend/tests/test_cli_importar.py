from sqlalchemy import func, select

from app.database import criar_engine, criar_fabrica_sessao
from app.models import Questao
from app.pacote.leitura import carregar_pacote, salvar_pacote
from ingestao.cli import main
from tests.fixtures.gerar_pacotes import escrever_pacotes
from tests.utils import aplicar_migrations


def _banco_migrado(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'local.db').as_posix()}"
    engine = criar_engine(url)
    aplicar_migrations(engine)
    monkeypatch.setenv("DATABASE_URL", url)
    return engine


def test_importar_sincroniza_no_banco_local(tmp_path, monkeypatch, capsys):
    engine = _banco_migrado(tmp_path, monkeypatch)
    escrever_pacotes(tmp_path / "provas")

    assert main(["importar", "--data-dir", str(tmp_path / "provas")]) == 0

    with criar_fabrica_sessao(engine)() as s:
        assert s.scalar(select(func.count()).select_from(Questao)) == 180
    assert "2098" in capsys.readouterr().out


def test_importar_incluindo_rascunhos(tmp_path, monkeypatch):
    engine = _banco_migrado(tmp_path, monkeypatch)
    d2098, _ = escrever_pacotes(tmp_path / "provas")
    pacote = carregar_pacote(d2098)
    pacote.status = "rascunho"
    salvar_pacote(pacote, d2098)

    assert main(["importar", "--incluir-rascunhos", "--data-dir", str(tmp_path / "provas")]) == 0

    with criar_fabrica_sessao(engine)() as s:
        assert s.scalar(select(func.count()).select_from(Questao)) == 180


def test_incluir_rascunhos_recusado_fora_do_sqlite(tmp_path, monkeypatch, capsys):
    """IT-012 / ADR-008: rascunho nunca chega a producao."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@railway.example:5432/prod")

    codigo = main(["importar", "--incluir-rascunhos", "--data-dir", str(tmp_path)])

    assert codigo == 1
    assert "SQLite" in capsys.readouterr().err


def test_importar_sem_migrations_falha_com_orientacao(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{(tmp_path / 'vazio.db').as_posix()}")
    escrever_pacotes(tmp_path / "provas", anos=(2098,))

    assert main(["importar", "--data-dir", str(tmp_path / "provas")]) == 1
    assert "alembic upgrade head" in capsys.readouterr().err
