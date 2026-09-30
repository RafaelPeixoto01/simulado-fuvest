from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine

BACKEND = Path(__file__).resolve().parents[1]


def aplicar_migrations(engine: Engine, revisao: str = "head", *, downgrade: bool = False) -> None:
    """Roda as migrations reais do Alembic na conexao do engine de teste."""
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    with engine.begin() as conn:
        cfg.attributes["connection"] = conn
        if downgrade:
            command.downgrade(cfg, revisao)
        else:
            command.upgrade(cfg, revisao)
