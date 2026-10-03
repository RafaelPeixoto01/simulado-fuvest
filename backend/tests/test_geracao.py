"""BT-010 / BT-011 / BT-090 / BT-091 e regras RN-002 a RN-005, RN-009 do servico de geracao."""

import random
from collections import Counter

import pytest

from app.schemas import GerarAno, GerarCompleta, GerarPersonalizado, GerarTreino
from app.services.catalogo import contagens_por_prova, distribuicao_completa
from app.services.geracao import (
    ProvaNaoEncontrada,
    QuestoesInsuficientes,
    gerar_simulado,
    sortear_completa,
)


def test_completa_tem_80_unicas_sem_anuladas_na_distribuicao(sessao, base_sintetica):
    """BT-090 (CR-011): a Prova completa segue o formato da FUVEST 2027."""
    sim = gerar_simulado(sessao, GerarCompleta(modo="completa", semente=7))

    assert len(sim.questoes) == 80
    assert len({q.id for q in sim.questoes}) == 80
    assert not any(q.anulada for q in sim.questoes)
    alvo = distribuicao_completa(contagens_por_prova(sessao))
    assert Counter(q.disciplina for q in sim.questoes) == Counter(alvo)
    assert (sim.tempo_limite_s, sim.pausavel) == (18000, False)


def test_completa_com_base_insuficiente(sessao, base_sintetica):
    from sqlalchemy import delete

    from app.models import Prova, Questao

    sessao.delete(sessao.get(Prova, "2098"))
    # sobra 2099 com as questoes 1 a 81: 81 - 2 anuladas (9 e 45) = 79 validas
    sessao.execute(delete(Questao).where(Questao.numero > 81))
    sessao.commit()

    with pytest.raises(QuestoesInsuficientes) as erro:
        gerar_simulado(sessao, GerarCompleta(modo="completa"))

    assert erro.value.disponiveis == 79


def test_deficit_de_uma_disciplina_e_coberto_pelas_outras():
    rng = random.Random(1)
    por_disciplina = {"fisica": [f"f{i}" for i in range(3)], "quimica": [f"q{i}" for i in range(20)]}

    escolhidas = sortear_completa(por_disciplina, {"fisica": 5, "quimica": 5}, rng)

    assert len(escolhidas) == 10 and len(set(escolhidas)) == 10
    assert sum(e.startswith("f") for e in escolhidas) == 3  # todas as de fisica


def test_mesma_semente_mesmo_simulado(sessao, base_sintetica):
    """BT-010."""
    pedido = GerarCompleta(modo="completa", semente=42)

    primeiro = [q.id for q in gerar_simulado(sessao, pedido).questoes]
    segundo = [q.id for q in gerar_simulado(sessao, pedido).questoes]

    assert primeiro == segundo
    assert primeiro != [q.id for q in gerar_simulado(sessao, GerarCompleta(modo="completa", semente=43)).questoes]


def test_personalizado_respeita_filtros_e_tempo_proporcional(sessao, base_sintetica):
    pedido = GerarPersonalizado(
        modo="personalizado", disciplinas=["fisica", "quimica"], ano_inicio=2099, ano_fim=2099,
        quantidade=10, semente=3,
    )

    sim = gerar_simulado(sessao, pedido)

    assert len(sim.questoes) == 10
    for q in sim.questoes:
        assert q.prova_codigo == "2099" and not q.anulada
        assert {q.disciplina, *q.disciplinas_secundarias} & {"fisica", "quimica"}
    # 225 s por questao: 5 h / 80 (RN-009, CR-011)
    assert (sim.tempo_limite_s, sim.pausavel) == (2250, True)


def test_personalizado_considera_disciplina_secundaria(sessao, base_sintetica):
    candidatas = [
        q for q in base_questoes(sessao)
        if q.disciplinas_secundarias and not q.anulada
    ]
    alvo = candidatas[0].disciplinas_secundarias[0]
    todas = gerar_simulado(sessao, GerarPersonalizado(
        modo="personalizado", disciplinas=[alvo], quantidade=1, semente=1,
    )).disponiveis

    principais = sum(1 for q in base_questoes(sessao) if q.disciplina == alvo and not q.anulada)
    assert todas > principais


def test_personalizado_sem_cronometro(sessao, base_sintetica):
    sim = gerar_simulado(sessao, GerarPersonalizado(
        modo="personalizado", disciplinas=["historia"], quantidade=2, cronometro=False,
    ))

    assert sim.tempo_limite_s is None


def test_personalizado_insuficiente_informa_disponiveis(sessao, base_sintetica):
    with pytest.raises(QuestoesInsuficientes) as erro:
        gerar_simulado(sessao, GerarPersonalizado(
            modo="personalizado", disciplinas=["ingles"], ano_inicio=2098, ano_fim=2098,
            quantidade=90,
        ))

    disponiveis = sum(
        1 for q in base_questoes(sessao)
        if q.prova_codigo == "2098" and not q.anulada
        and "ingles" in (q.disciplina, *q.disciplinas_secundarias)
    )
    assert erro.value.disponiveis == disponiveis


def test_prova_de_um_ano_na_ordem_original_com_anuladas(sessao, base_sintetica):
    sim = gerar_simulado(sessao, GerarAno(modo="ano", prova="2099"))

    assert [q.numero for q in sim.questoes] == list(range(1, 91))
    assert sum(q.anulada for q in sim.questoes) == 2
    assert (sim.tempo_limite_s, sim.pausavel) == (18000, False)


def test_prova_de_ano_inexistente(sessao, base_sintetica):
    with pytest.raises(ProvaNaoEncontrada):
        gerar_simulado(sessao, GerarAno(modo="ano", prova="2001"))


def test_treino_exclui_vistas_e_limita_o_lote(sessao, base_sintetica):
    vistas = [q.id for q in base_questoes(sessao)[:100]]

    sim = gerar_simulado(sessao, GerarTreino(modo="treino", excluir=vistas, semente=5))

    assert len(sim.questoes) == 20
    assert not {q.id for q in sim.questoes} & set(vistas)
    assert sim.tempo_limite_s is None


def test_treino_sem_questoes_restantes(sessao, base_sintetica):
    todas = [q.id for q in base_questoes(sessao)]

    sim = gerar_simulado(sessao, GerarTreino(modo="treino", excluir=todas))

    assert sim.questoes == [] and sim.disponiveis == 0


def test_questoes_do_mesmo_texto_base_ficam_em_sequencia(sessao, base_sintetica):
    """BT-011 / RN-005."""
    disponiveis = sum(1 for q in base_questoes(sessao) if q.prova_codigo == "2099" and not q.anulada)
    sim = gerar_simulado(sessao, GerarPersonalizado(
        modo="personalizado", disciplinas=[d for d in DISCIPLINAS], ano_inicio=2099,
        ano_fim=2099, quantidade=disponiveis, semente=11,
    ))

    ordem = [q.id for q in sim.questoes]
    for grupo in (["2099-010", "2099-011"], ["2099-030", "2099-031", "2099-032"]):
        presentes = [i for i in grupo if i in ordem]
        inicio = ordem.index(presentes[0])
        assert ordem[inicio : inicio + len(presentes)] == presentes


def test_simulado_oficial_inteiro_com_o_seu_total(sessao, base_com_simulado):
    """BT-091 (CR-011): a prova de um ano pelo codigo, com o total dela (80), anuladas incluidas."""
    sim = gerar_simulado(sessao, GerarAno(modo="ano", prova="2099s1"))

    assert [q.id for q in sim.questoes] == [f"2099s1-{n:03d}" for n in range(1, 81)]
    assert sum(q.anulada for q in sim.questoes) == 2
    assert (sim.tempo_limite_s, sim.pausavel) == (18000, False)


def test_filtro_de_anos_inclui_o_simulado_pelo_ano_de_referencia(sessao, base_com_simulado):
    """CR-011, P4: o simulado de 2099 entra no intervalo 2099-2099 com o vestibular de 2099."""
    sim = gerar_simulado(sessao, GerarPersonalizado(
        modo="personalizado", disciplinas=DISCIPLINAS, ano_inicio=2099, ano_fim=2099,
        quantidade=1, semente=1,
    ))

    validas = [q for q in base_questoes(sessao) if q.prova_codigo in ("2099", "2099s1") and not q.anulada]
    assert sim.disponiveis == len(validas)


def test_completa_mistura_vestibulares_e_simulado(sessao, base_com_simulado):
    """D1 do CR-011: as questoes do simulado entram no sorteio da Prova completa."""
    codigos = set()
    for semente in range(5):
        sim = gerar_simulado(sessao, GerarCompleta(modo="completa", semente=semente))
        codigos |= {q.prova_codigo for q in sim.questoes}

    assert codigos == {"2098", "2099", "2099s1"}


DISCIPLINAS = ["biologia", "fisica", "geografia", "historia", "ingles", "matematica", "portugues", "quimica"]


def base_questoes(sessao):
    from sqlalchemy import select

    from app.models import Questao

    return sessao.scalars(select(Questao).order_by(Questao.id)).all()
