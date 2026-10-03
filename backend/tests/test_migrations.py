from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from app.database import Base, criar_engine
from tests.utils import aplicar_migrations

TABELAS_CONTA = {"usuarios", "sessoes", "simulados_concluidos"}
TABELAS = {"provas", "textos_base", "questoes", "reportes", "estatisticas_geracao"} | TABELAS_CONTA


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


def test_migration_004_acrescenta_e_remove_a_carreira_alvo(tmp_path):
    """BT-047 (CR-010): 003 -> 004 -> 003, sem perder as contas."""
    from sqlalchemy import text

    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")
    aplicar_migrations(engine, "head")
    colunas = {c["name"] for c in inspect(engine).get_columns("usuarios")}
    assert {"carreira_alvo_ano", "carreira_alvo_codigo"} <= colunas
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO usuarios (google_sub, email, carreira_alvo_ano, carreira_alvo_codigo) "
            "VALUES ('sub', 'a@b.c', 2025, 111)"
        ))

    aplicar_migrations(engine, "003", downgrade=True)

    colunas = {c["name"] for c in inspect(engine).get_columns("usuarios")}
    assert "carreira_alvo_ano" not in colunas and "carreira_alvo_codigo" not in colunas
    with engine.connect() as conn:
        assert conn.execute(text("SELECT email FROM usuarios")).scalar() == "a@b.c"


def test_migration_003_cria_e_remove_as_tabelas_de_conta(tmp_path):
    """BT-047 (CR-005): 002 -> 003 -> 002, sem tocar nas tabelas anteriores."""
    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")

    aplicar_migrations(engine, "head")
    inspetor = inspect(engine)
    assert TABELAS_CONTA <= set(inspetor.get_table_names())
    assert "ix_simulados_concluidos_usuario_finalizado" in {
        i["name"] for i in inspetor.get_indexes("simulados_concluidos")
    }

    aplicar_migrations(engine, "002", downgrade=True)
    restantes = set(inspect(engine).get_table_names())
    assert TABELAS_CONTA.isdisjoint(restantes)
    assert "questoes" in restantes


def test_migration_005_troca_a_chave_da_prova_sem_perder_contas_e_reportes(tmp_path):
    """BT-087 (CR-011): 004 -> 005 -> 004. As tabelas derivadas voltam vazias (a sincronizacao
    repovoa); contas, historicos e reportes ficam."""
    from sqlalchemy import text

    engine = criar_engine(f"sqlite:///{tmp_path / 'm.db'}")
    aplicar_migrations(engine, "004")
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO provas (ano, versao, url_prova, url_gabarito, total_questoes, sincronizado_em) "
            "VALUES (2025, 'V1', 'p', 'g', 90, CURRENT_TIMESTAMP)"
        ))
        conn.execute(text("INSERT INTO usuarios (google_sub, email) VALUES ('sub', 'a@b.c')"))
        conn.execute(text(
            "INSERT INTO simulados_concluidos (usuario_id, id, finalizado_em_ms, dados) "
            "VALUES (1, 'sim-1', 1, '{}')"
        ))
        conn.execute(text("INSERT INTO reportes (questao_id, tipo) VALUES ('2025-001', 'outro')"))

    aplicar_migrations(engine, "005")

    inspetor = inspect(engine)
    assert {c["name"] for c in inspetor.get_columns("provas")} >= {"codigo", "ano", "tipo", "edicao"}
    assert inspetor.get_pk_constraint("provas")["constrained_columns"] == ["codigo"]
    assert "prova_codigo" in {c["name"] for c in inspetor.get_columns("questoes")}
    with engine.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM provas")).scalar() == 0
        assert conn.execute(text("SELECT email FROM usuarios")).scalar() == "a@b.c"
        assert conn.execute(text("SELECT id FROM simulados_concluidos")).scalar() == "sim-1"
        assert conn.execute(text("SELECT questao_id FROM reportes")).scalar() == "2025-001"
        conn.execute(text(
            "INSERT INTO provas (codigo, ano, tipo, edicao, versao, url_prova, url_gabarito, "
            "total_questoes, sincronizado_em) "
            "VALUES ('2027s1', 2027, 'simulado', 1, 'S1', 'p', 'g', 80, CURRENT_TIMESTAMP)"
        ))

    aplicar_migrations(engine, "004", downgrade=True)

    inspetor = inspect(engine)
    assert inspetor.get_pk_constraint("provas")["constrained_columns"] == ["ano"]
    assert "prova_ano" in {c["name"] for c in inspetor.get_columns("questoes")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM provas")).scalar() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM simulados_concluidos")).scalar() == 1
        assert conn.execute(text("SELECT questao_id FROM reportes")).scalar() == "2025-001"
