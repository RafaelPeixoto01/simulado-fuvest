"""BT-109 e BT-110: lista de estudantes e comando `contas` (CR-013, specs/09-gestao.md §2.4)."""

from datetime import UTC, datetime, timedelta

from app.database import criar_engine, criar_fabrica_sessao
from app.models import SimuladoConcluido, Usuario
from ingestao.cli import main
from tests.utils import aplicar_migrations

BASE = datetime(2026, 10, 1, 12, tzinfo=UTC)


def _conta(sessao, sub, nome, email, dia, acesso=None, **extra):
    usuario = Usuario(google_sub=sub, nome=nome, email=email, criado_em=BASE + timedelta(days=dia),
                      ultimo_acesso_em=BASE + timedelta(days=acesso if acesso is not None else dia), **extra)
    sessao.add(usuario)
    sessao.flush()
    return usuario


def _estudantes(client, **params):
    resposta = client.get("/api/gestao/estudantes", params=params)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_lista_com_simulados_carreira_e_admin(client_admin, sessao, base_sintetica):
    bruno = _conta(sessao, "b", "Bruno 100%", "bruno@x.com", 1, carreira_alvo_ano=2099, carreira_alvo_codigo=102)
    _conta(sessao, "c", "Carla_x", "carla@x.com", 2, acesso=-5, carreira_alvo_ano=2098, carreira_alvo_codigo=999)
    for i in range(3):
        sessao.add(SimuladoConcluido(usuario_id=bruno.id, id=f"s{i}", finalizado_em_ms=i, dados={}))
    sessao.commit()

    corpo = _estudantes(client_admin)

    assert (corpo["total"], corpo["pagina"], corpo["por_pagina"]) == (3, 1, 50)
    por_email = {e["email"]: e for e in corpo["estudantes"]}
    assert por_email["bruno@x.com"]["simulados"] == 3
    assert por_email["bruno@x.com"]["carreira_alvo"] == "Medicina (São Paulo, Ribeirão Preto)"
    assert por_email["carla@x.com"]["carreira_alvo"] == "2098 · código 999"  # fora da lista
    assert por_email["ana@exemplo.com"]["admin"] is True and por_email["bruno@x.com"]["admin"] is False
    assert por_email["bruno@x.com"]["criado_em"].startswith("2026-10-02T12:00:00")
    # ordem padrao: cadastro mais recente (a Ana entrou agora)
    assert [e["email"] for e in corpo["estudantes"]] == ["ana@exemplo.com", "carla@x.com", "bruno@x.com"]
    acesso = _estudantes(client_admin, ordem="acesso")["estudantes"]
    assert [e["email"] for e in acesso] == ["ana@exemplo.com", "bruno@x.com", "carla@x.com"]


def test_busca_sem_diferenciar_maiusculas_e_com_curingas_literais(client_admin, sessao):
    _conta(sessao, "b", "Bruno 100%", "bruno@x.com", 1)
    _conta(sessao, "c", "Carla_x", "carla@x.com", 2)
    _conta(sessao, "d", "Carlax", "dora@x.com", 3)
    sessao.commit()

    def emails(busca):
        return sorted(e["email"] for e in _estudantes(client_admin, busca=busca)["estudantes"])

    assert emails("ANA") == ["ana@exemplo.com"]
    assert emails("%") == ["bruno@x.com"]  # so quem tem % no nome
    assert emails("a_x") == ["carla@x.com"]  # "_" nao casa qualquer letra (Carlax fica fora)
    assert emails("dora@") == ["dora@x.com"]  # pelo e-mail
    assert emails("  ") == sorted(["ana@exemplo.com", "bruno@x.com", "carla@x.com", "dora@x.com"])
    assert _estudantes(client_admin, busca="ninguém")["total"] == 0


def test_paginacao(client_admin, sessao):
    for i in range(55):
        _conta(sessao, f"s{i}", f"Aluno {i}", f"aluno{i}@x.com", i)
    sessao.commit()

    primeira, segunda = _estudantes(client_admin), _estudantes(client_admin, pagina=2)

    assert primeira["total"] == segunda["total"] == 56
    assert len(primeira["estudantes"]) == 50 and len(segunda["estudantes"]) == 6
    assert _estudantes(client_admin, pagina=3)["estudantes"] == []


def test_parametros_invalidos(client_admin):
    for params in ({"pagina": 0}, {"pagina": 10_001}, {"ordem": "nome"}, {"busca": "x" * 101}):
        assert client_admin.get("/api/gestao/estudantes", params=params).status_code == 422, params


# --- BT-110: comando contas ---


def test_cli_contas_mostra_o_sub(tmp_path, capsys):
    url = f"sqlite:///{(tmp_path / 'prod.db').as_posix()}"
    engine = criar_engine(url)
    aplicar_migrations(engine)
    with criar_fabrica_sessao(engine)() as s:
        s.add(Usuario(google_sub="1234567890", email="Rafael@Exemplo.com", nome="Rafael"))
        s.commit()

    assert main(["contas", "--email", "rafael@exemplo.com", "--database-url", url]) == 0
    saida = capsys.readouterr().out
    assert "Banco:" in saida and "sub: 1234567890 | Rafael" in saida and "ADMIN_GOOGLE_SUBS" in saida

    assert main(["contas", "--email", "outro@exemplo.com", "--database-url", url]) == 1
    assert "Nenhuma conta" in capsys.readouterr().out
