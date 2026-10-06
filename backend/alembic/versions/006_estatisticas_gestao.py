"""Contagens anonimas da area de gestao (CR-013, ADR-016, specs/09).

Cria `estatisticas_diarias` (dia de Brasilia x metrica) e `estatisticas_questoes`
(marcacoes por questao, sem FK) e as preenche com o historico ja guardado em
`simulados_concluidos`, pela regra de `services/estatisticas.registrar_conclusoes`, no
dia de Brasilia de `recebido_em`. A regra e repetida aqui de proposito: a migration nao
pode mudar quando o codigo do app mudar (um teste confere que as duas dao o mesmo).
Logins e usuarios ativos nao tem de onde vir: comecam do zero.

O downgrade apaga as duas tabelas: sao so agregados, contas e historicos ficam.

Revision ID: 006
Revises: 005
Create Date: 2026-10-06
"""

import json
from collections import Counter
from datetime import UTC, timedelta, timezone

import sqlalchemy as sa

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None

FUSO_BRASILIA = timezone(timedelta(hours=-3))
TEMPO_MAXIMO_MS = 24 * 60 * 60 * 1000
COLUNAS = ("marcadas_a", "marcadas_b", "marcadas_c", "marcadas_d", "marcadas_e", "em_branco")


def _metricas(dados: dict) -> Counter:
    modo = dados["modo"]
    resultado = dados["resultado"]
    metricas = Counter({
        f"concluido.{modo}": 1,
        f"questoes.{modo}": resultado["total"],
        f"acertos.{modo}": resultado["acertos"],
        f"tempo_ms.{modo}": min(max(dados["tempoGastoMs"], 0), TEMPO_MAXIMO_MS),
    })
    if dados["finalizadoPorTempo"]:
        metricas[f"por_tempo.{modo}"] += 1
    if modo == "ano" and dados["questaoIds"]:
        metricas[f"prova_ano.{dados['questaoIds'][0].split('-')[0]}"] += 1
    return metricas


def _backfill(diarias: sa.Table, questoes: sa.Table) -> None:
    historico = sa.table(
        "simulados_concluidos",
        sa.column("dados", sa.JSON()),
        sa.column("recebido_em", sa.DateTime(timezone=True)),
    )
    contagens: Counter = Counter()
    marcacoes: dict[str, Counter] = {}
    for dados, recebido_em in op.get_bind().execute(
        sa.select(historico.c.dados, historico.c.recebido_em)
    ):
        if isinstance(dados, str):
            dados = json.loads(dados)
        momento = recebido_em if recebido_em.tzinfo else recebido_em.replace(tzinfo=UTC)
        dia = momento.astimezone(FUSO_BRASILIA).date()
        for metrica, total in _metricas(dados).items():
            contagens[(dia, metrica)] += total
        for item in dados["resultado"]["itens"]:
            letra = item["resposta"]
            coluna = f"marcadas_{letra.lower()}" if letra else "em_branco"
            marcacoes.setdefault(item["questao_id"], Counter())[coluna] += 1

    linhas = [
        {"dia": dia, "metrica": metrica, "total": total}
        for (dia, metrica), total in sorted(contagens.items())
        if total
    ]
    if linhas:
        op.bulk_insert(diarias, linhas)
    if marcacoes:
        op.bulk_insert(questoes, [
            {"questao_id": questao_id, **{c: contagem[c] for c in COLUNAS}}
            for questao_id, contagem in sorted(marcacoes.items())
        ])


def upgrade() -> None:
    diarias = op.create_table(
        "estatisticas_diarias",
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("metrica", sa.String(length=40), nullable=False),
        sa.Column("total", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("dia", "metrica"),
    )
    questoes = op.create_table(
        "estatisticas_questoes",
        sa.Column("questao_id", sa.String(length=12), nullable=False),
        *[sa.Column(c, sa.Integer(), nullable=False, server_default="0") for c in COLUNAS],
        sa.PrimaryKeyConstraint("questao_id"),
    )
    _backfill(diarias, questoes)


def downgrade() -> None:
    op.drop_table("estatisticas_questoes")
    op.drop_table("estatisticas_diarias")
