"""Alembic env: usa a conexao injetada (testes) ou a DATABASE_URL do Settings.

Sem .env: fora dos testes, a URL vem so da variavel de ambiente DATABASE_URL
(default SQLite local), nunca de um arquivo (ADR-008).
"""

from logging.config import fileConfig

from alembic import context

import app.models  # noqa: F401  (registra os models no metadata)
from app.config import Settings
from app.database import Base, criar_engine

config = context.config

if config.config_file_name is not None and not config.attributes.get("connection"):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _configurar(conexao) -> None:
    context.configure(
        connection=conexao,
        target_metadata=target_metadata,
        render_as_batch=conexao.dialect.name == "sqlite",  # ALTER no SQLite (CLAUDE.md)
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    conexao = config.attributes.get("connection")
    if conexao is not None:
        _configurar(conexao)
        return

    engine = criar_engine(Settings.from_env().database_url)
    with engine.connect() as conexao:
        _configurar(conexao)
        conexao.commit()


if context.is_offline_mode():
    raise RuntimeError("Modo offline nao suportado: rode as migrations com um banco conectado.")

run_migrations_online()
