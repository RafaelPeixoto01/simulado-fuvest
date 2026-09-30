"""Schema inicial: provas, textos_base, questoes, reportes, estatisticas_geracao.

Revision ID: 001
Revises:
Create Date: 2026-09-29
"""

import sqlalchemy as sa

from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provas",
        sa.Column("ano", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("versao", sa.String(length=10), nullable=False),
        sa.Column("url_prova", sa.Text(), nullable=False),
        sa.Column("url_gabarito", sa.Text(), nullable=False),
        sa.Column("total_questoes", sa.Integer(), nullable=False),
        sa.Column("sincronizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("ano"),
    )
    op.create_table(
        "textos_base",
        sa.Column("id", sa.String(length=12), nullable=False),
        sa.Column("prova_ano", sa.Integer(), nullable=False),
        sa.Column("conteudo", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["prova_ano"], ["provas.ano"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_textos_base_prova_ano", "textos_base", ["prova_ano"])
    op.create_table(
        "questoes",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.Column("prova_ano", sa.Integer(), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("texto_base_id", sa.String(length=12), nullable=True),
        sa.Column("enunciado", sa.JSON(), nullable=False),
        sa.Column("alternativas", sa.JSON(), nullable=False),
        sa.Column("resposta", sa.String(length=1), nullable=True),
        sa.Column("anulada", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("disciplina", sa.String(length=12), nullable=False),
        sa.Column("disciplinas_secundarias", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["prova_ano"], ["provas.ano"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["texto_base_id"], ["textos_base.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prova_ano", "numero", name="uq_questoes_prova_numero"),
    )
    op.create_index("ix_questoes_prova_ano", "questoes", ["prova_ano"])
    op.create_index("ix_questoes_disciplina", "questoes", ["disciplina"])
    op.create_table(
        "reportes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("questao_id", sa.String(length=8), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("descricao", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=10), server_default="pendente", nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("resolvido_em", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reportes_questao_id", "reportes", ["questao_id"])
    op.create_table(
        "estatisticas_geracao",
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("modo", sa.String(length=12), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("dia", "modo"),
    )


def downgrade() -> None:
    op.drop_table("estatisticas_geracao")
    op.drop_index("ix_reportes_questao_id", table_name="reportes")
    op.drop_table("reportes")
    op.drop_index("ix_questoes_disciplina", table_name="questoes")
    op.drop_index("ix_questoes_prova_ano", table_name="questoes")
    op.drop_table("questoes")
    op.drop_index("ix_textos_base_prova_ano", table_name="textos_base")
    op.drop_table("textos_base")
    op.drop_table("provas")
