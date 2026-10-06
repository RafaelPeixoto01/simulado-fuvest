"""BT-105: aba Uso da area de gestao (CR-013, specs/09-gestao.md §2.4)."""

from datetime import UTC, date, datetime, timedelta

import pytest

from app.models import EstatisticaDiaria, EstatisticaGeracao, Prova, SimuladoConcluido, Usuario
from app.services import gestao

AGORA = datetime(2026, 10, 6, 15, 0, tzinfo=UTC)  # terca-feira, 6/10 em Brasilia
HOJE = date(2026, 10, 6)


def _momento(dia: date, hora: int = 12) -> datetime:
    return datetime(dia.year, dia.month, dia.day, hora, tzinfo=UTC)


@pytest.fixture
def dados(sessao):
    ana = Usuario(google_sub="a", email="ana@x.com", criado_em=_momento(date(2026, 10, 1)),
                  ultimo_acesso_em=_momento(HOJE))
    beto = Usuario(google_sub="b", email="beto@x.com", criado_em=_momento(date(2026, 9, 10)),
                   ultimo_acesso_em=_momento(date(2026, 9, 20)))
    caio = Usuario(google_sub="c", email="caio@x.com", criado_em=_momento(date(2026, 8, 1)),
                   ultimo_acesso_em=_momento(date(2026, 8, 1)))
    sessao.add_all([ana, beto, caio])
    sessao.flush()
    diarias = {
        (date(2026, 9, 1), "login"): 5,  # fora dos ultimos 7 dias
        (date(2026, 10, 5), "login"): 2,
        (HOJE, "login"): 1,
        (date(2026, 10, 5), "ativo"): 3,
        (HOJE, "ativo"): 2,
        (date(2026, 10, 4), "conta_excluida"): 1,
        (date(2026, 10, 5), "concluido.completa"): 2,
        (HOJE, "concluido.ano"): 1,
        (HOJE, "prova_ano.2025"): 1,
        (date(2026, 10, 5), "prova_ano.2027s1"): 2,
    }
    sessao.add_all(EstatisticaDiaria(dia=d, metrica=m, total=n) for (d, m), n in diarias.items())
    geracao = {
        (date(2026, 10, 5), "completa"): 4,
        (date(2026, 10, 5), "ano"): 1,
        (date(2026, 10, 5), "treino"): 3,
        (HOJE, "personalizado"): 2,
    }
    sessao.add_all(EstatisticaGeracao(dia=d, modo=m, total=n) for (d, m), n in geracao.items())
    # So a 2025 esta na base: a 2027s1 (saiu, ou codigo forjado) aparece pelo codigo
    sessao.add(Prova(codigo="2025", ano=2025, tipo="vestibular", versao="V1", url_prova="p", url_gabarito="g",
                     total_questoes=90, sincronizado_em=AGORA))
    for i in range(3):
        sessao.add(SimuladoConcluido(usuario_id=ana.id, id=f"a{i}", finalizado_em_ms=i, dados={}))
    sessao.add(SimuladoConcluido(usuario_id=beto.id, id="b0", finalizado_em_ms=1, dados={}))
    sessao.commit()


def test_ultimos_7_dias(sessao, dados):
    uso = gestao.uso(sessao, "7", AGORA)

    assert (uso.inicio, uso.fim, uso.granularidade) == (date(2026, 9, 30), HOJE, "dia")
    assert uso.cartoes.model_dump() == {
        "estudantes": 3,
        "novos": 1,  # Ana, em 1/10
        "ativos_hoje": 2,
        "ativos_media_dia": 0.7,  # 5 em 7 dias
        "ativos_7_dias": 1,  # Ana
        "ativos_30_dias": 2,  # Ana e Beto
        "logins": 3,
        "gerados": 10,
        "concluidos": 3,
        "contas_excluidas": 1,
    }
    assert [p.total for p in uso.series.logins] == [0, 0, 0, 0, 0, 2, 1]
    assert [p.inicio for p in uso.series.logins][0] == date(2026, 9, 30)
    assert [p.total for p in uso.series.cadastros] == [0, 1, 0, 0, 0, 0, 0]
    assert [p.total for p in uso.series.gerados] == [0, 0, 0, 0, 0, 8, 2]
    assert [p.total for p in uso.series.concluidos] == [0, 0, 0, 0, 0, 2, 1]
    assert [(m.modo, m.gerados, m.concluidos, m.taxa_conclusao) for m in uso.modos] == [
        ("completa", 4, 2, 50.0),
        ("personalizado", 2, 0, 0.0),
        ("ano", 1, 1, 100.0),
        ("treino", 3, None, None),
    ]
    assert [(f.faixa, f.estudantes) for f in uso.distribuicao] == [
        ("0", 1), ("1", 1), ("2–5", 1), ("6–20", 0), ("21–50", 0),
    ]
    assert [(p.codigo, p.rotulo, p.concluidos) for p in uso.provas_ano] == [
        ("2027s1", "2027s1", 2),
        ("2025", "FUVEST 2025", 1),
    ]


def test_90_dias_por_semana_com_a_media_dos_ativos(sessao, dados):
    uso = gestao.uso(sessao, "90", AGORA)

    assert uso.granularidade == "semana"
    assert uso.inicio == HOJE - timedelta(days=89)
    inicios = [p.inicio for p in uso.series.ativos]
    assert inicios[0] == uso.inicio and all(d.weekday() == 0 for d in inicios[1:])  # segundas
    # Ultima semana: segunda 5/10 e terca 6/10, ativos 3 e 2: media 2,5 -> 3
    assert uso.series.ativos[-1].model_dump() == {"inicio": date(2026, 10, 5), "total": 3}
    assert uso.series.logins[-1].total == 3  # nos outros, soma
    assert sum(p.total for p in uso.series.logins) == 8  # inclui 1/9


def test_desde_o_inicio_comeca_no_primeiro_dado(sessao, dados):
    uso = gestao.uso(sessao, "tudo", AGORA)

    assert uso.inicio == date(2026, 8, 1)  # cadastro do Caio
    assert uso.cartoes.logins == 8


def test_desde_o_inicio_sem_nenhum_dado(sessao):
    uso = gestao.uso(sessao, "tudo", AGORA)

    assert (uso.inicio, uso.fim, uso.granularidade) == (HOJE, HOJE, "dia")
    assert [p.model_dump() for p in uso.series.cadastros] == [{"inicio": HOJE, "total": 0}]
    assert [(f.faixa, f.estudantes) for f in uso.distribuicao][0] == ("0", 0)


def test_cadastro_as_23h_de_brasilia_conta_no_dia_local(sessao):
    # 02:00 UTC de 6/10 = 23h de 5/10 em Brasilia
    sessao.add(Usuario(google_sub="x", email="x@x.com", criado_em=datetime(2026, 10, 6, 2, tzinfo=UTC),
                       ultimo_acesso_em=AGORA))
    sessao.commit()

    uso = gestao.uso(sessao, "7", AGORA)

    assert [p.total for p in uso.series.cadastros][-2:] == [1, 0]


def test_http_uso_e_periodo_invalido(client_admin):
    resposta = client_admin.get("/api/gestao/uso", params={"periodo": "7"})

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["periodo"] == "7" and len(corpo["series"]["logins"]) == 7
    assert corpo["cartoes"]["estudantes"] == 1 and corpo["cartoes"]["logins"] == 1  # o login da Ana
    assert client_admin.get("/api/gestao/uso").json()["periodo"] == "30"
    assert client_admin.get("/api/gestao/uso", params={"periodo": "15"}).status_code == 422
