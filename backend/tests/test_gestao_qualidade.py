"""BT-107 e BT-108: aba Qualidade e reportes da area de gestao (CR-013, RN-022, specs/09 §2.4)."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.models import EstatisticaQuestao, Prova, Questao, Reporte
from app.pacote.assuntos import taxonomia_em_uso
from app.services import gestao

ORIGEM = {"Origin": "http://localhost:5173"}
LETRAS = "abcde"


def _marcar(sessao, questao_id, em_branco=0, **marcadas):
    sessao.add(EstatisticaQuestao(
        questao_id=questao_id, em_branco=em_branco,
        **{f"marcadas_{letra}": marcadas.get(letra, 0) for letra in LETRAS},
    ))


def test_saude_da_base(sessao, base_sintetica):
    qualidade = gestao.qualidade(sessao, taxonomia_em_uso(base_sintetica))

    validas = sessao.scalar(select(func.count()).select_from(Questao).where(Questao.anulada.is_(False)))
    assert qualidade.base.model_dump(exclude={"sincronizado_em"}) == {
        "provas": 2, "questoes": validas, "anuladas": 3, "sem_assunto": 0,
    }
    assert qualidade.base.sincronizado_em is not None
    assert [(p.codigo, p.rotulo, p.questoes, p.anuladas) for p in qualidade.provas] == [
        ("2099", "FUVEST 2099", 90, 2),
        ("2098", "FUVEST 2098", 90, 1),
    ]
    assert sum(d.questoes for d in qualidade.disciplinas) == validas
    assert [d.disciplina for d in qualidade.disciplinas][0] == "biologia"  # pelo nome


def test_questoes_suspeitas_pelos_limiares(sessao, base_sintetica):
    # 2099-001: gabarito C; 2099-002: D; 2099-003: E; 2099-004: E; 2099-005: B
    _marcar(sessao, "2099-001", a=19)  # 19 respostas: fora (minimo de 20)
    _marcar(sessao, "2099-002", d=2, a=10, b=8)  # 10%: acerto baixo e a A atrai
    _marcar(sessao, "2099-003", e=12, c=15, a=3)  # 40%, mas a C (15) passa a correta
    _marcar(sessao, "2099-004", e=3, a=3, b=3, c=3, d=3, em_branco=5)  # 15%: nao e abaixo de 15
    _marcar(sessao, "2099-005", b=1, em_branco=19)  # 5%: so acerto baixo (em branco nao atrai)
    _marcar(sessao, "2099-009", a=30)  # anulada: fora
    sessao.commit()

    suspeitas = gestao.qualidade(sessao, taxonomia_em_uso(base_sintetica)).suspeitas

    assert [(s.questao_id, s.percentual, s.motivos) for s in suspeitas] == [
        ("2099-005", 5.0, ["acerto_baixo"]),
        ("2099-002", 10.0, ["acerto_baixo", "alternativa_atrai"]),
        ("2099-003", 40.0, ["alternativa_atrai"]),
    ]
    segunda = suspeitas[1]
    assert (segunda.prova, segunda.numero, segunda.gabarito, segunda.respostas, segunda.acertos) == (
        "FUVEST 2099", 2, "D", 20, 2,
    )
    assert segunda.marcacoes.model_dump() == {"a": 10, "b": 8, "c": 0, "d": 2, "e": 0, "em_branco": 0}


@pytest.fixture
def reportes(sessao, base_sintetica):
    agora = datetime(2026, 10, 6, 12, tzinfo=UTC)
    lista = [
        Reporte(questao_id="2099-010", tipo="figura", descricao="cortada", criado_em=agora),
        Reporte(questao_id="2097-001", tipo="gabarito", criado_em=agora.replace(hour=13)),  # fora da base
        Reporte(questao_id="2099-020", tipo="outro", status="resolvido", criado_em=agora.replace(hour=9),
                resolvido_em=agora.replace(hour=10)),
    ]
    sessao.add_all(lista)
    sessao.commit()
    return lista


def test_resumo_dos_reportes(sessao, reportes, base_sintetica):
    resumo = gestao.qualidade(sessao, None).reportes
    validas = sessao.scalar(select(func.count()).select_from(Questao).where(Questao.anulada.is_(False)))

    assert resumo.model_dump() == {
        "pendentes": 2,
        "resolvidos": 1,
        "questoes_com_reporte_resolvido": 1,
        "indice_resolvidos": round(1 / validas * 100, 1),
    }


def test_lista_de_reportes_por_status(client_admin, reportes, sessao):
    pendentes = client_admin.get("/api/gestao/reportes").json()["reportes"]

    assert [r["questao_id"] for r in pendentes] == ["2099-010", "2097-001"]  # do mais antigo
    assert pendentes[0]["questao"] == {
        "prova": "FUVEST 2099", "numero": 10, "disciplina": sessao.get(Questao, "2099-010").disciplina,
        "gabarito": sessao.get(Questao, "2099-010").resposta, "anulada": False,
    }
    assert pendentes[0]["criado_em"].startswith("2026-10-06T12:00:00")
    assert pendentes[1]["questao"] is None

    resolvidos = client_admin.get("/api/gestao/reportes", params={"status": "resolvido"}).json()["reportes"]
    assert [(r["questao_id"], r["status"]) for r in resolvidos] == [("2099-020", "resolvido")]
    assert client_admin.get("/api/gestao/reportes", params={"status": "todos"}).status_code == 422


def test_resolver_reportes(client_admin, reportes, sessao):
    pendente, _, resolvido = reportes

    resposta = client_admin.post(
        "/api/gestao/reportes/resolver", json={"ids": [pendente.id, resolvido.id, 999]}, headers=ORIGEM
    )

    assert resposta.json() == {"resolvidos": [pendente.id], "ja_resolvidos": [resolvido.id], "inexistentes": [999]}
    sessao.expire_all()
    assert sessao.get(Reporte, pendente.id).status == "resolvido"
    assert sessao.get(Reporte, pendente.id).resolvido_em is not None


@pytest.mark.parametrize(
    "corpo",
    [{}, {"ids": []}, {"ids": [1, 1]}, {"ids": [0]}, {"ids": [1], "extra": True}, {"ids": list(range(1, 102))}],
)
def test_resolver_com_corpo_invalido(client_admin, corpo):
    assert client_admin.post("/api/gestao/reportes/resolver", json=corpo, headers=ORIGEM).status_code == 422


def test_http_qualidade(client_admin, base_sintetica, sessao):
    corpo = client_admin.get("/api/gestao/qualidade").json()

    assert corpo["base"]["provas"] == sessao.scalar(select(func.count()).select_from(Prova))
    assert corpo["suspeitas"] == [] and corpo["reportes"]["pendentes"] == 0
