"""BT-003 a BT-009, BT-012, BT-013, BT-016, BT-017 (specs/02 §6)."""

from sqlalchemy import select

from app.models import EstatisticaGeracao, Prova


def _chaves(obj) -> set[str]:
    if isinstance(obj, dict):
        return set(obj) | {k for v in obj.values() for k in _chaves(v)}
    if isinstance(obj, list):
        return {k for v in obj for k in _chaves(v)}
    return set()


def _gerar(client, **corpo):
    return client.post("/api/simulados", json=corpo)


def test_completa_sem_gabarito_no_json(client, base_sintetica):
    resposta = _gerar(client, modo="completa", semente=1)

    assert resposta.status_code == 200
    dados = resposta.json()
    assert len(dados["questoes"]) == 80
    assert (dados["tempo_limite_s"], dados["pausavel"], dados["semente"]) == (18000, False, 1)
    assert not {"resposta", "anulada"} & _chaves(dados)  # BT-017


def test_completa_insuficiente_409(client, sessao, base_sintetica):
    from sqlalchemy import delete

    from app.models import Questao

    sessao.delete(sessao.get(Prova, "2098"))
    sessao.execute(delete(Questao).where(Questao.numero > 81))  # 2099: 81 - 2 anuladas = 79
    sessao.commit()

    resposta = _gerar(client, modo="completa")

    assert resposta.status_code == 409
    assert resposta.json()["detail"]["codigo"] == "questoes_insuficientes"
    assert resposta.json()["detail"]["disponiveis"] == 79


def test_personalizado(client, base_sintetica):
    dados = _gerar(client, modo="personalizado", disciplinas=["fisica"], quantidade=5,
                   cronometro=True, semente=2).json()

    assert len(dados["questoes"]) == 5
    assert dados["tempo_limite_s"] == 1125 and dados["pausavel"] is True  # 5 x 225 s
    assert dados["disponiveis"] >= 5


def test_personalizado_insuficiente_409_com_disponiveis(client, base_sintetica):
    resposta = _gerar(client, modo="personalizado", disciplinas=["ingles"], quantidade=90,
                      ano_inicio=2098, ano_fim=2098)

    assert resposta.status_code == 409
    assert 0 < resposta.json()["detail"]["disponiveis"] < 90


def test_prova_de_um_ano_com_textos_base_e_figuras_como_url(client, base_sintetica):
    dados = _gerar(client, modo="ano", prova="2099").json()

    assert [q["numero"] for q in dados["questoes"]] == list(range(1, 91))
    assert {(q["prova"], q["origem"]) for q in dados["questoes"]} == {("2099", "FUVEST 2099")}
    assert set(dados["textos_base"]) == {"2099-tb01", "2099-tb02"}
    assert {"texto": None, "figura": "/figuras/2099/tb02-1.webp"} in dados["textos_base"]["2099-tb02"]["conteudo"]
    q30 = next(q for q in dados["questoes"] if q["numero"] == 30)
    assert q30["texto_base_id"] == "2099-tb02"


def test_prova_de_ano_inexistente_404(client, base_sintetica):
    resposta = _gerar(client, modo="ano", prova="2001")

    assert resposta.status_code == 404
    assert resposta.json()["detail"]["codigo"] == "prova_nao_encontrada"


def test_prova_de_um_ano_com_codigo_invalido_422(client, base_sintetica):
    """CR-011: so codigos AAAA ou AAAAsN; o campo antigo `ano` nao e mais aceito."""
    for corpo in ({"prova": "2099S1"}, {"prova": "99"}, {"prova": "2099s0"}, {"ano": 2099}):
        assert _gerar(client, modo="ano", **corpo).status_code == 422


def test_treino_exclui_vistas(client, base_sintetica):
    primeiro = _gerar(client, modo="treino", semente=1).json()
    vistas = [q["id"] for q in primeiro["questoes"]]

    segundo = _gerar(client, modo="treino", excluir=vistas, semente=1).json()

    assert len(vistas) == 20
    assert not {q["id"] for q in segundo["questoes"]} & set(vistas)


def test_validacoes_422(client, base_sintetica):
    invalidos = [
        {"modo": "personalizado", "disciplinas": ["fisica"], "quantidade": 0},
        {"modo": "personalizado", "disciplinas": ["astrologia"], "quantidade": 5},
        {"modo": "personalizado", "disciplinas": [], "quantidade": 5},
        {"modo": "personalizado", "disciplinas": ["fisica"], "quantidade": 5,
         "ano_inicio": 2099, "ano_fim": 2098},
        {"modo": "surpresa"},
        {"modo": "treino", "excluir": ["nao-e-id"]},
    ]
    for corpo in invalidos:
        assert client.post("/api/simulados", json=corpo).status_code == 422, corpo


def test_contador_de_geracao_por_modo(client, sessao, base_sintetica):
    """BT-016: treino so conta no inicio da sessao (excluir vazio)."""
    _gerar(client, modo="completa")
    _gerar(client, modo="ano", prova="2098")
    _gerar(client, modo="treino")
    _gerar(client, modo="treino", excluir=["2098-001"])

    contagem = {e.modo: e.total for e in sessao.scalars(select(EstatisticaGeracao))}
    assert contagem == {"completa": 1, "ano": 1, "treino": 1}


def test_rate_limit_de_geracao(client, base_sintetica):
    """BT-013: 30 por minuto por IP."""
    codigos = [_gerar(client, modo="ano", prova="2098").status_code for _ in range(31)]

    assert codigos[:30] == [200] * 30
    assert codigos[30] == 429
