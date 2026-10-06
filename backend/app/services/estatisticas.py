"""Contadores anonimos: simulados gerados (metrica do PRD §2) e, desde o CR-013 (ADR-016,
RN-021), logins, usuarios ativos, contas excluidas, simulados concluidos e as marcacoes de
cada questao. Nada aqui guarda quem fez o que: so totais por dia de Brasilia.

Falha num contador nunca derruba a operacao principal (geracao, login, sincronizacao,
pedido com sessao): o erro vai para o log.
"""

import logging
from collections import Counter
from collections.abc import Iterable
from datetime import UTC, date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import update
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import set_committed_value

from app.models import EstatisticaDiaria, EstatisticaGeracao, EstatisticaQuestao, Usuario

log = logging.getLogger(__name__)

# O Brasil nao tem horario de verao desde 2019: offset fixo, sem depender do pacote tzdata
FUSO_BRASILIA = timezone(timedelta(hours=-3))
# Um simulado nunca soma mais de um dia: protege o total de um tempo forjado (RN-021)
TEMPO_MAXIMO_MS = 24 * 60 * 60 * 1000
# Coluna de estatisticas_questoes pela letra marcada (None = em branco)
COLUNA_MARCACAO = {
    "A": "marcadas_a",
    "B": "marcadas_b",
    "C": "marcadas_c",
    "D": "marcadas_d",
    "E": "marcadas_e",
    None: "em_branco",
}


def dia_local(agora: datetime) -> date:
    """Dia de Brasilia de um instante com fuso."""
    return agora.astimezone(FUSO_BRASILIA).date()


def inicio_do_dia(dia: date) -> datetime:
    """00:00 de Brasilia do dia, em UTC."""
    return datetime.combine(dia, time(), FUSO_BRASILIA).astimezone(UTC)


def como_utc(momento: datetime) -> datetime:
    # O SQLite devolve datetime sem fuso; o Postgres, com
    return momento if momento.tzinfo else momento.replace(tzinfo=UTC)


def registrar_geracao(sessao: Session, modo: str) -> None:
    """Falha aqui nunca derruba a geracao do simulado: so registra no log."""
    dia = dia_local(datetime.now(UTC))  # dia de Brasilia desde o CR-013 (antes, UTC)
    try:
        linha = sessao.get(EstatisticaGeracao, (dia, modo))
        if linha is None:
            sessao.add(EstatisticaGeracao(dia=dia, modo=modo, total=1))
        else:
            linha.total += 1
        sessao.commit()
    except SQLAlchemyError:
        sessao.rollback()
        log.exception("Falha ao registrar estatística de geração (%s)", modo)


def _dialeto(sessao: Session):
    return postgresql if sessao.get_bind().dialect.name == "postgresql" else sqlite


def _executar(sessao: Session, comando) -> None:
    """Num savepoint: o erro desfaz so a contagem, e quem chamou segue e faz o commit."""
    try:
        with sessao.begin_nested():
            sessao.execute(comando)
    except SQLAlchemyError:
        log.exception("Falha ao registrar contagem anônima")


def incrementar(sessao: Session, dia: date, contagens: dict[str, int]) -> None:
    """Soma as contagens do dia (upsert: duas requisicoes juntas nao perdem nenhuma)."""
    linhas = [{"dia": dia, "metrica": m, "total": n} for m, n in sorted(contagens.items()) if n]
    if not linhas:
        return
    insercao = _dialeto(sessao).insert(EstatisticaDiaria).values(linhas)
    _executar(sessao, insercao.on_conflict_do_update(
        index_elements=["dia", "metrica"],
        set_={"total": EstatisticaDiaria.total + insercao.excluded.total},
    ))


def registrar_atividade(sessao: Session, usuario: Usuario, agora: datetime) -> None:
    """Primeiro pedido do dia: ultimo acesso e `ativo` +1 (RN-021). A checagem em memoria
    evita a escrita na maioria dos pedidos; o UPDATE condicional faz duas abas no mesmo
    instante contarem uma vez so."""
    hoje = dia_local(agora)
    inicio = inicio_do_dia(hoje)
    if como_utc(usuario.ultimo_acesso_em) >= inicio:
        return
    try:
        resultado = sessao.execute(
            update(Usuario)
            .where(Usuario.id == usuario.id, Usuario.ultimo_acesso_em < inicio)
            .values(ultimo_acesso_em=agora)
            .execution_options(synchronize_session=False)
        )
        if resultado.rowcount == 1:
            incrementar(sessao, hoje, {"ativo": 1})
        sessao.commit()
    except SQLAlchemyError:
        sessao.rollback()
        log.exception("Falha ao registrar o acesso do dia")
        return
    # O objeto da sessao passa a refletir o banco, sem nova escrita no proximo commit
    set_committed_value(usuario, "ultimo_acesso_em", agora)


def metricas_da_entrada(dados: dict[str, Any]) -> Counter[str]:
    """Metricas de um simulado concluido, a partir do HistoricoEntry como e guardado
    (camelCase). A migration 006 repete esta regra no backfill."""
    modo = dados["modo"]
    resultado = dados["resultado"]
    metricas: Counter[str] = Counter({
        f"concluido.{modo}": 1,
        f"questoes.{modo}": resultado["total"],
        f"acertos.{modo}": resultado["acertos"],
        f"tempo_ms.{modo}": min(max(dados["tempoGastoMs"], 0), TEMPO_MAXIMO_MS),
    })
    if dados["finalizadoPorTempo"]:
        metricas[f"por_tempo.{modo}"] += 1
    if modo == "ano" and dados["questaoIds"]:
        # Codigo da prova: o prefixo do id ("2025-037", "2027s1-001")
        metricas[f"prova_ano.{dados['questaoIds'][0].split('-')[0]}"] += 1
    return metricas


def marcacoes_da_entrada(dados: dict[str, Any]) -> list[tuple[str, str]]:
    """(questao_id, coluna) de cada item do resultado: a letra marcada ou em branco."""
    return [(i["questao_id"], COLUNA_MARCACAO[i["resposta"]]) for i in dados["resultado"]["itens"]]


def registrar_conclusoes(sessao: Session, entradas: Iterable[dict[str, Any]], agora: datetime) -> None:
    """Simulados que acabaram de chegar a uma conta (so os inseridos: reenvio nao conta)."""
    metricas: Counter[str] = Counter()
    marcacoes: dict[str, Counter[str]] = {}
    for dados in entradas:
        metricas.update(metricas_da_entrada(dados))
        for questao_id, coluna in marcacoes_da_entrada(dados):
            marcacoes.setdefault(questao_id, Counter())[coluna] += 1
    if not metricas:
        return
    incrementar(sessao, dia_local(agora), dict(metricas))

    colunas = list(COLUNA_MARCACAO.values())
    linhas = [
        {"questao_id": questao_id, **{c: contagem[c] for c in colunas}}
        for questao_id, contagem in sorted(marcacoes.items())
    ]
    if not linhas:
        return
    insercao = _dialeto(sessao).insert(EstatisticaQuestao).values(linhas)
    _executar(sessao, insercao.on_conflict_do_update(
        index_elements=["questao_id"],
        set_={c: getattr(EstatisticaQuestao, c) + getattr(insercao.excluded, c) for c in colunas},
    ))
