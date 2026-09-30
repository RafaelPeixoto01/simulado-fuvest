"""BT-020 a BT-024: correcao (RN-002, RN-008) e POST /api/correcoes."""

import pytest

from tests.fixtures.gerar_pacotes import gerar_pacote

LETRAS = "ABCDE"


@pytest.fixture
def q2099():
    return {q.numero: q for q in gerar_pacote(2099).questoes}


def _errada(letra: str) -> str:
    return LETRAS[(LETRAS.index(letra) + 1) % 5]


def _corrigir(client, respostas):
    return client.post("/api/correcoes", json={"respostas": respostas})


def test_correcao_mista(client, base_sintetica, q2099):
    """BT-020: certa, errada, em branco e anulada (conta como acerto)."""
    validas = [n for n, q in q2099.items() if not q.anulada]
    anulada = next(n for n, q in q2099.items() if q.anulada)
    certa, errada, branco = validas[:3]
    respostas = [
        {"questao_id": f"2099-{certa:03d}", "resposta": q2099[certa].resposta},
        {"questao_id": f"2099-{errada:03d}", "resposta": _errada(q2099[errada].resposta)},
        {"questao_id": f"2099-{branco:03d}", "resposta": None},
        {"questao_id": f"2099-{anulada:03d}", "resposta": "A"},
    ]

    dados = _corrigir(client, respostas).json()

    assert [i["acertou"] for i in dados["itens"]] == [True, False, False, True]
    assert dados["itens"][3]["anulada"] is True and dados["itens"][3]["correta"] is None
    assert dados["itens"][1]["correta"] == q2099[errada].resposta
    assert (dados["total"], dados["acertos"], dados["percentual"]) == (4, 2, 50.0)
    assert dados["ignoradas"] == []


def test_desempenho_por_disciplina_do_pior_para_o_melhor(client, base_sintetica, q2099):
    """BT-021."""
    validas = [q for q in q2099.values() if not q.anulada]
    por_disciplina: dict[str, list] = {}
    for q in validas:
        por_disciplina.setdefault(q.disciplina.value, []).append(q)
    a, b, c = sorted(por_disciplina)[:3]
    respostas = (
        [{"questao_id": f"2099-{q.numero:03d}", "resposta": q.resposta} for q in por_disciplina[a][:2]]
        + [{"questao_id": f"2099-{q.numero:03d}", "resposta": None} for q in por_disciplina[b][:2]]
        + [{"questao_id": f"2099-{q.numero:03d}", "resposta": None} for q in por_disciplina[c][:1]]
    )

    dados = _corrigir(client, respostas).json()

    ordem = [(d["disciplina"], d["acertos"], d["total"], d["percentual"]) for d in dados["por_disciplina"]]
    # b e c empatam em 0%: desempate pelo slug
    assert ordem == [(b, 0, 2, 0.0), (c, 0, 1, 0.0), (a, 2, 2, 100.0)]


def test_questao_inexistente_vai_para_ignoradas(client, base_sintetica, q2099):
    """BT-022."""
    dados = _corrigir(client, [
        {"questao_id": "2099-001", "resposta": q2099[1].resposta or "A"},
        {"questao_id": "2050-001", "resposta": "A"},
    ]).json()

    assert dados["ignoradas"] == ["2050-001"]
    assert dados["total"] == 1


def test_ordem_dos_itens_igual_a_do_pedido(client, base_sintetica):
    """BT-024."""
    ids = ["2099-050", "2098-003", "2099-001"]

    dados = _corrigir(client, [{"questao_id": i, "resposta": None} for i in ids]).json()

    assert [i["questao_id"] for i in dados["itens"]] == ids


def test_validacoes_422(client, base_sintetica):
    """BT-023."""
    item = {"questao_id": "2099-001", "resposta": "A"}
    invalidos = [
        [],
        [{"questao_id": f"2099-{n:03d}", "resposta": None} for n in range(1, 91)]
        + [{"questao_id": "2098-001", "resposta": None}],
        [item, item],
        [{"questao_id": "99-1", "resposta": "A"}],
        [{"questao_id": "2099-001", "resposta": "F"}],
    ]
    for respostas in invalidos:
        assert _corrigir(client, respostas).status_code == 422


def test_rate_limit_de_correcao(client, base_sintetica):
    corpo = [{"questao_id": "2099-001", "resposta": None}]
    codigos = [_corrigir(client, corpo).status_code for _ in range(121)]

    assert codigos[119] == 200 and codigos[120] == 429
