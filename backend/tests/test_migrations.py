from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from app.database import Base, criar_engine
from tests.utils import aplicar_migrations

TABELAS = {"provas", "textos_base", "questoes", "reportes", "estatisticas_geracao"}


def test_upgrade_head_cria_todas_as_tabelas(tmp_path):
    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")

    aplicar_migrations(engine, "head")

    assert TABELAS <= set(inspect(engine).get_table_names())


def test_downgrade_base_remove_as_tabelas(tmp_path):
    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")
    aplicar_migrations(engine, "head")

    aplicar_migrations(engine, "base", downgrade=True)

    assert TABELAS.isdisjoint(inspect(engine).get_table_names())


def test_models_em_sincronia_com_a_migration(tmp_path):
    import app.models  # noqa: F401  (registra os models no Base.metadata)

    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")
    aplicar_migrations(engine, "head")

    with engine.connect() as conn:
        diferencas = compare_metadata(MigrationContext.configure(conn), Base.metadata)

    assert diferencas == []
