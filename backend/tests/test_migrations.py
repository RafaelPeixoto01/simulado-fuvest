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


def test_migration_002_acrescenta_e_remove_o_assunto(tmp_path):
    """BT-047 (CR-004): 001 -> 002 -> 001."""
    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")

    aplicar_migrations(engine, "head")
    colunas = {c["name"] for c in inspect(engine).get_columns("questoes")}
    indices = {i["name"] for i in inspect(engine).get_indexes("questoes")}
    assert "assunto" in colunas and "ix_questoes_assunto" in indices

    aplicar_migrations(engine, "001", downgrade=True)
    inspetor = inspect(engine)
    assert "assunto" not in {c["name"] for c in inspetor.get_columns("questoes")}
    assert "ix_questoes_assunto" not in {i["name"] for i in inspetor.get_indexes("questoes")}
