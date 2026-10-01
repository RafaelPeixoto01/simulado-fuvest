"""Contas com Google e historico sincronizado (CR-005, ADR-010, ADR-011).

So cria tabelas: o codigo anterior as ignora. O downgrade e destrutivo (apaga contas,
sessoes e historicos): rodar so com backup (05-DEPLOY-GUIDE §6).

Revision ID: 003
Revises: 002
Create Date: 2026-10-01
"""

import sqlalchemy as sa

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("nome", sa.String(length=200), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "ultimo_acesso_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("google_sub", name="uq_usuarios_google_sub"),
    )
    op.create_table(
        "sessoes",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("token_hash"),
    )
    op.create_index("ix_sessoes_usuario_id", "sessoes", ["usuario_id"])
    op.create_table(
        "simulados_concluidos",
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("finalizado_em_ms", sa.BigInteger(), nullable=False),
        sa.Column("dados", sa.JSON(), nullable=False),
        sa.Column(
            "recebido_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("usuario_id", "id"),
    )
    op.create_index(
        "ix_simulados_concluidos_usuario_finalizado",
        "simulados_concluidos",
        ["usuario_id", "finalizado_em_ms"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_simulados_concluidos_usuario_finalizado", table_name="simulados_concluidos"
    )
    op.drop_table("simulados_concluidos")
    op.drop_index("ix_sessoes_usuario_id", table_name="sessoes")
    op.drop_table("sessoes")
    op.drop_table("usuarios")
