"""Assunto da questao (CR-004, RN-014).

Nullable porque a migration roda antes da sincronizacao no start do container; a
sincronizacao regrava as questoes com o assunto e a V11 garante que toda questao
publicada tem um (02-ARCHITECTURE §4, ADR-009).

Revision ID: 002
Revises: 001
Create Date: 2026-09-30
"""

import sqlalchemy as sa

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # batch: o SQLite nao altera tabela com FK via ALTER (CLAUDE.md, troubleshooting)
    with op.batch_alter_table("questoes") as batch:
        batch.add_column(sa.Column("assunto", sa.String(length=40), nullable=True))
        batch.create_index("ix_questoes_assunto", ["assunto"])


def downgrade() -> None:
    with op.batch_alter_table("questoes") as batch:
        batch.drop_index("ix_questoes_assunto")
        batch.drop_column("assunto")
