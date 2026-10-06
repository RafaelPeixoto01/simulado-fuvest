"""BT-097 a BT-103: contagens anonimas da area de gestao (CR-013, specs/09-gestao.md §2.4)."""

import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import OperationalError

from app.models import EstatisticaDiaria, EstatisticaGeracao, EstatisticaQuestao, Usuario
from app.services import contas, estatisticas
from app.services.estatisticas import dia_local, inicio_do_dia, registrar_atividade
from tests.contas import ANA, entrada_historico, entrar

ORIGEM = {"Origin": "http://localhost:5173"}


def _contagens(sessao, dia: date | None = None) -> dict[str, int]:
    dia = dia or dia_local(datetime.now(UTC))
    linhas = sessao.execute(
        select(EstatisticaDiaria.metrica, EstatisticaDiaria.total).where(EstatisticaDiaria.dia == dia)
    )
    return dict(linhas.all())


def _marcacoes(sessao) -> dict[str, tuple[int, ...]]:
    linhas = sessao.execute(select(
        EstatisticaQuestao.questao_id,
        EstatisticaQuestao.marcadas_a, EstatisticaQuestao.marcadas_b, EstatisticaQuestao.marcadas_c,
        EstatisticaQuestao.marcadas_d, EstatisticaQuestao.marcadas_e, EstatisticaQuestao.em_branco,
    ))
    return {linha[0]: tuple(linha[1:]) for linha in linhas}


def _ana(sessao) -> Usuario:
    return sessao.scalar(select(Usuario).where(Usuario.google_sub == ANA.sub))


# --- BT-097: dia de Brasilia ---


def test_dia_local_vira_as_tres_da_manha_utc():
    assert dia_local(datetime(2026, 10, 6, 2, 59, tzinfo=UTC)) == date(2026, 10, 5)
    assert dia_local(datetime(2026, 10, 6, 3, 0, tzinfo=UTC)) == date(2026, 10, 6)
    assert inicio_do_dia(date(2026, 10, 6)) == datetime(2026, 10, 6, 3, 0, tzinfo=UTC)


# --- BT-098: upsert e falha isolada ---


def test_incrementar_soma_em_linhas_novas_e_existentes(sessao):
    dia = date(2026, 10, 6)
    estatisticas.incrementar(sessao, dia, {"login": 1, "ativo": 2, "zero": 0})
    estatisticas.incrementar(sessao, dia, {"login": 3})
    sessao.commit()

    assert _contagens(sessao, dia) == {"login": 4, "ativo": 2}  # zero nao vira linha


def test_falha_na_contagem_nao_derruba_o_login(sessao, monkeypatch, caplog):
    original = sessao.execute

    def falha_nas_estatisticas(comando, *args, **kwargs):
        if "estatisticas_diarias" in str(comando):
            raise OperationalError("INSERT", {}, Exception("banco fora"))
        return original(comando, *args, **kwargs)

    monkeypatch.setattr(sessao, "execute", falha_nas_estatisticas)
    with caplog.at_level(logging.ERROR):
        token = contas.entrar(sessao, ANA, datetime.now(UTC), None)
    monkeypatch.undo()

    assert token
    assert _ana(sessao) is not None  # a conta e a sessao foram gravadas
    assert _contagens(sessao) == {}
    assert "Falha ao registrar contagem anônima" in caplog.text


# --- BT-099: login ---


def test_login_conta_login_e_ativo_uma_vez_por_dia(client, provedor_falso, sessao):
    assert entrar(client).status_code == 302  # conta nova: ativo
    assert entrar(client).status_code == 302  # segundo login no mesmo dia: so login
    assert entrar(client, "codigo-beto").status_code == 302

    assert _contagens(sessao) == {"login": 3, "ativo": 2}


def test_primeiro_login_do_dia_de_conta_antiga_conta_ativo(client, provedor_falso, sessao):
    entrar(client)
    ontem = datetime.now(UTC) - timedelta(days=1)
    sessao.execute(update(Usuario).values(ultimo_acesso_em=ontem))
    sessao.commit()

    entrar(client)

    assert _contagens(sessao) == {"login": 2, "ativo": 2}


# --- BT-100: acesso do dia ---


def test_atividade_conta_uma_vez_por_dia_e_de_novo_no_dia_seguinte(sessao):
    agora = datetime(2026, 10, 6, 15, 0, tzinfo=UTC)
    usuario = Usuario(google_sub="s", email="a@b.c", ultimo_acesso_em=agora - timedelta(days=2))
    sessao.add(usuario)
    sessao.commit()

    registrar_atividade(sessao, usuario, agora)
    registrar_atividade(sessao, usuario, agora + timedelta(hours=1))
    amanha = agora + timedelta(days=1)
    registrar_atividade(sessao, usuario, amanha)

    assert _contagens(sessao, date(2026, 10, 6)) == {"ativo": 1}
    assert _contagens(sessao, date(2026, 10, 7)) == {"ativo": 1}
    sessao.expire_all()
    assert estatisticas.como_utc(sessao.get(Usuario, usuario.id).ultimo_acesso_em) == amanha


def test_duas_abas_no_mesmo_instante_contam_uma_vez(app):
    agora = datetime(2026, 10, 6, 15, 0, tzinfo=UTC)
    with app.state.fabrica_sessao() as s:
        s.add(Usuario(google_sub="s", email="a@b.c", ultimo_acesso_em=agora - timedelta(days=1)))
        s.commit()
    with app.state.fabrica_sessao() as aba1, app.state.fabrica_sessao() as aba2:
        u1, u2 = aba1.scalar(select(Usuario)), aba2.scalar(select(Usuario))  # os dois veem ontem
        registrar_atividade(aba1, u1, agora)
        registrar_atividade(aba2, u2, agora)

        assert _contagens(aba1, date(2026, 10, 6)) == {"ativo": 1}


def test_pedido_com_sessao_registra_o_acesso_do_dia(client_logado, sessao):
    client_logado.get("/api/sessao")
    assert _contagens(sessao)["ativo"] == 1  # o login ja contou; o pedido no mesmo dia nao

    sessao.execute(update(Usuario).values(ultimo_acesso_em=datetime.now(UTC) - timedelta(days=1)))
    sessao.commit()
    client_logado.get("/api/sessao")

    assert _contagens(sessao)["ativo"] == 2
    sessao.expire_all()
    assert estatisticas.como_utc(_ana(sessao).ultimo_acesso_em) >= inicio_do_dia(dia_local(datetime.now(UTC)))


# --- BT-101: conta excluida ---


def test_excluir_conta_conta_conta_excluida(client_logado, sessao):
    assert client_logado.delete("/api/conta", headers=ORIGEM).status_code == 204

    assert _contagens(sessao)["conta_excluida"] == 1


# --- BT-102: simulados concluidos ---


def _completa_por_tempo(ident: str) -> dict:
    entrada = entrada_historico(ident, 2_000_000)
    entrada.update(modo="completa", finalizadoPorTempo=True, tempoGastoMs=2**40, questaoIds=["2098-005"])
    item = entrada["resultado"]["itens"][0]
    item.update(questao_id="2098-005", resposta=None)
    return entrada


def test_historico_conta_modo_prova_e_marcacoes_so_do_que_chegou(client_logado, sessao):
    invalida = {**entrada_historico("ruim"), "modo": "treino"}
    resposta = client_logado.post(
        "/api/historico",
        json={"entradas": [entrada_historico("sim-1"), _completa_por_tempo("sim-2"), invalida]},
        headers=ORIGEM,
    )
    assert resposta.status_code == 200 and resposta.json()["rejeitadas"] == ["ruim"]
    # reenviar (outra aba, outro dispositivo) nao conta de novo
    client_logado.post("/api/historico", json={"entradas": [entrada_historico("sim-1")]}, headers=ORIGEM)

    contagens = _contagens(sessao)
    assert {k: v for k, v in contagens.items() if k not in ("login", "ativo")} == {
        "concluido.ano": 1,
        "questoes.ano": 1,  # sem acertos: contagem zero nao vira linha
        "tempo_ms.ano": 60_000,
        "prova_ano.2099": 1,
        "concluido.completa": 1,
        "questoes.completa": 1,
        "tempo_ms.completa": estatisticas.TEMPO_MAXIMO_MS,  # limitado a 24 h
        "por_tempo.completa": 1,
    }
    assert _marcacoes(sessao) == {"2099-001": (1, 0, 0, 0, 0, 0), "2098-005": (0, 0, 0, 0, 0, 1)}


def test_marcacoes_somam_entre_envios(client_logado, sessao):
    client_logado.post("/api/historico", json={"entradas": [entrada_historico("sim-1")]}, headers=ORIGEM)
    client_logado.post("/api/historico", json={"entradas": [entrada_historico("sim-2")]}, headers=ORIGEM)

    assert _marcacoes(sessao) == {"2099-001": (2, 0, 0, 0, 0, 0)}
    assert _contagens(sessao)["concluido.ano"] == 2


# --- BT-103: geracao no dia de Brasilia ---


def test_geracao_usa_o_dia_de_brasilia(sessao, monkeypatch):
    class Relogio(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 10, 6, 1, 0, tzinfo=UTC)  # 22h do dia 5 em Brasilia

    monkeypatch.setattr(estatisticas, "datetime", Relogio)
    estatisticas.registrar_geracao(sessao, "completa")

    assert [(e.dia, e.total) for e in sessao.scalars(select(EstatisticaGeracao))] == [(date(2026, 10, 5), 1)]


def test_exclusao_repetida_conta_uma_vez(sessao):
    """Revisao de codigo: a segunda de duas exclusoes simultaneas nao apaga nada e nao conta."""
    contas.entrar(sessao, ANA, datetime.now(UTC), None)
    usuario_id = _ana(sessao).id

    contas.excluir_conta(sessao, usuario_id)
    contas.excluir_conta(sessao, usuario_id)

    assert _contagens(sessao)["conta_excluida"] == 1
