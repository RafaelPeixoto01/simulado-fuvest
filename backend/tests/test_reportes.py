"""BT-030 a BT-035: reporte de erro (RF-021) e CLI do curador (RF-007, ADR-008)."""

import pytest
from sqlalchemy import select

from app.database import criar_engine, criar_fabrica_sessao
from app.models import Reporte
from ingestao.cli import main
from tests.utils import aplicar_migrations


def _reportar(client, **corpo):
    return client.post("/api/reportes", json=corpo)


def test_reporte_valido(client, sessao, base_sintetica):
    """BT-030: descricao so com espacos vira null."""
    resposta = _reportar(client, questao_id="2099-010", tipo="figura", descricao="  Não abre  ")
    em_branco = _reportar(client, questao_id="2099-011", tipo="outro", descricao="   ")

    assert resposta.status_code == 201
    reporte = sessao.get(Reporte, resposta.json()["id"])
    assert (reporte.questao_id, reporte.tipo, reporte.status) == ("2099-010", "figura", "pendente")
    assert reporte.descricao == "Não abre"
    assert sessao.get(Reporte, em_branco.json()["id"]).descricao is None


def test_questao_inexistente_404(client, base_sintetica):
    """BT-031."""
    resposta = _reportar(client, questao_id="2050-001", tipo="outro")

    assert resposta.status_code == 404
    assert resposta.json()["detail"]["codigo"] == "questao_nao_encontrada"


def test_validacoes_422(client, base_sintetica):
    """BT-032."""
    assert _reportar(client, questao_id="2099-001", tipo="outro", descricao="x" * 501).status_code == 422
    assert _reportar(client, questao_id="2099-001", tipo="spam").status_code == 422
    assert _reportar(client, questao_id="99", tipo="outro").status_code == 422


def test_rate_limit_de_reportes(client, base_sintetica):
    """BT-033: 10 por hora por IP."""
    codigos = [_reportar(client, questao_id="2099-001", tipo="outro").status_code for _ in range(11)]

    assert codigos[:10] == [201] * 10 and codigos[10] == 429


@pytest.fixture
def banco_arquivo(tmp_path):
    url = f"sqlite:///{(tmp_path / 'prod-simulado.db').as_posix()}"
    engine = criar_engine(url)
    aplicar_migrations(engine)
    with criar_fabrica_sessao(engine)() as s:
        s.add_all([
            Reporte(questao_id="2099-010", tipo="figura", descricao="figura cortada"),
            Reporte(questao_id="2099-020", tipo="gabarito"),
        ])
        s.commit()
    return url, engine


def test_cli_listar_e_resolver(banco_arquivo, capsys):
    """BT-034."""
    url, engine = banco_arquivo

    assert main(["reportes", "listar", "--database-url", url]) == 0
    saida = capsys.readouterr().out
    assert "Banco:" in saida and "2099-010" in saida and "figura cortada" in saida

    assert main(["reportes", "resolver", "--database-url", url, "1"]) == 0
    with criar_fabrica_sessao(engine)() as s:
        status = {r.id: r.status for r in s.scalars(select(Reporte))}
        resolvido = s.get(Reporte, 1).resolvido_em
    assert status == {1: "resolvido", 2: "pendente"} and resolvido is not None

    assert main(["reportes", "resolver", "--database-url", url, "1", "99"]) == 1
    assert "99" in capsys.readouterr().out


def test_cli_nao_mostra_a_senha_do_banco(capsys, monkeypatch):
    url = "postgresql://postgres:segredo123@proxy.rlwy.net:5432/railway"
    import ingestao.cli as cli

    monkeypatch.setattr(cli, "_executar_reportes", lambda *a, **k: 0)

    main(["reportes", "listar", "--database-url", url])

    saida = capsys.readouterr().out
    assert "proxy.rlwy.net/railway" in saida and "segredo123" not in saida


def test_cli_exige_database_url_explicita(monkeypatch):
    """BT-035: nunca le a URL do ambiente (licao do CR-049 do Meu Controle)."""
    monkeypatch.setenv("DATABASE_URL", "sqlite://")

    with pytest.raises(SystemExit):
        main(["reportes", "listar"])
