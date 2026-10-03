"""Codigo da prova como chave e ids de ate 12 caracteres (CR-011, ADR-015).

`provas`, `textos_base` e `questoes` sao derivadas do repositorio (ADR-002): a migration
as recria vazias no formato novo e a sincronizacao do start as repovoa. As tabelas de
conta nao sao tocadas; `reportes` so tem a coluna `questao_id` alargada. Localmente,
depois do upgrade, rode `python -m ingestao importar` de novo.

O downgrade recria as tres tabelas no formato anterior (tambem vazias; o codigo anterior
repovoa no start) e volta `reportes.questao_id` para 8 caracteres, o que falha se houver
reporte de questao de simulado ("2027s1-001"): exporte e apague esses reportes antes.

Revision ID: 005
Revises: 004
Create Date: 2026-10-02
"""

import sqlalchemy as sa

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def _drop_derivadas() -> None:
    op.drop_table("questoes")
    op.drop_table("textos_base")
    op.drop_table("provas")


def _colunas_questao() -> list[sa.Column]:
    """Colunas de conteudo da questao, iguais nos dois formatos."""
    return [
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("texto_base_id", sa.String(length=12), nullable=True),
        sa.Column("enunciado", sa.JSON(), nullable=False),
        sa.Column("alternativas", sa.JSON(), nullable=False),
        sa.Column("resposta", sa.String(length=1), nullable=True),
        sa.Column("anulada", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("disciplina", sa.String(length=12), nullable=False),
        sa.Column("disciplinas_secundarias", sa.JSON(), nullable=False),
        sa.Column("assunto", sa.String(length=40), nullable=True),
    ]


def upgrade() -> None:
    _drop_derivadas()
    op.create_table(
        "provas",
        sa.Column("codigo", sa.String(length=8), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("edicao", sa.SmallInteger(), nullable=True),
        sa.Column("versao", sa.String(length=10), nullable=False),
        sa.Column("url_prova", sa.Text(), nullable=False),
        sa.Column("url_gabarito", sa.Text(), nullable=False),
        sa.Column("total_questoes", sa.Integer(), nullable=False),
        sa.Column("sincronizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("codigo"),
    )
    op.create_index("ix_provas_ano", "provas", ["ano"])
    op.create_table(
        "textos_base",
        sa.Column("id", sa.String(length=12), nullable=False),
        sa.Column("prova_codigo", sa.String(length=8), nullable=False),
        sa.Column("conteudo", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["prova_codigo"], ["provas.codigo"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_textos_base_prova_codigo", "textos_base", ["prova_codigo"])
    op.create_table(
        "questoes",
        sa.Column("id", sa.String(length=12), nullable=False),
        sa.Column("prova_codigo", sa.String(length=8), nullable=False),
        *_colunas_questao(),
        sa.ForeignKeyConstraint(["prova_codigo"], ["provas.codigo"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["texto_base_id"], ["textos_base.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prova_codigo", "numero", name="uq_questoes_prova_numero"),
    )
    op.create_index("ix_questoes_prova_codigo", "questoes", ["prova_codigo"])
    op.create_index("ix_questoes_disciplina", "questoes", ["disciplina"])
    op.create_index("ix_questoes_assunto", "questoes", ["assunto"])
    # batch: o SQLite nao altera o tipo da coluna via ALTER (CLAUDE.md, troubleshooting)
    with op.batch_alter_table("reportes") as batch:
        batch.alter_column("questao_id", type_=sa.String(length=12),
                           existing_type=sa.String(length=8), existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("reportes") as batch:
        batch.alter_column("questao_id", type_=sa.String(length=8),
                           existing_type=sa.String(length=12), existing_nullable=False)
    _drop_derivadas()
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
        *_colunas_questao(),
        sa.ForeignKeyConstraint(["prova_ano"], ["provas.ano"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["texto_base_id"], ["textos_base.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prova_ano", "numero", name="uq_questoes_prova_numero"),
    )
    op.create_index("ix_questoes_prova_ano", "questoes", ["prova_ano"])
    op.create_index("ix_questoes_disciplina", "questoes", ["disciplina"])
    op.create_index("ix_questoes_assunto", "questoes", ["assunto"])
