"""Carreira-alvo das notas de corte na conta (CR-010, specs/08).

So acrescenta duas colunas opcionais: o codigo anterior as ignora. O downgrade apaga as
carreiras-alvo escolhidas (contas e historicos ficam): em producao, so com backup
(05-DEPLOY-GUIDE §6).

Revision ID: 004
Revises: 003
Create Date: 2026-10-02
"""

import sqlalchemy as sa

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # batch: o SQLite nao altera tabela via ALTER em todos os casos (CLAUDE.md, troubleshooting)
    with op.batch_alter_table("usuarios") as batch:
        batch.add_column(sa.Column("carreira_alvo_ano", sa.SmallInteger(), nullable=True))
        batch.add_column(sa.Column("carreira_alvo_codigo", sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("usuarios") as batch:
        batch.drop_column("carreira_alvo_codigo")
        batch.drop_column("carreira_alvo_ano")
