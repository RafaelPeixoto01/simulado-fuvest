from pathlib import Path

from app.config import Settings


def test_defaults_locais_sem_variaveis_de_ambiente():
    s = Settings.from_env({})

    assert s.database_url == "sqlite:///./local.db"
    assert s.environment == "development"
    assert s.allowed_origins == ("http://localhost:5173",)
    assert s.data_dir == Path(__file__).resolve().parents[2] / "data" / "provas"
    assert s.producao is False


def test_le_variaveis_de_ambiente():
    s = Settings.from_env(
        {
            "DATABASE_URL": "postgresql://u:p@host:5432/db",
            "DATA_DIR": "/app/data/provas",
            "ENVIRONMENT": "production",
            "ALLOWED_ORIGINS": " http://a.com , http://b.com ,",
        }
    )

    assert s.database_url == "postgresql://u:p@host:5432/db"
    assert s.data_dir == Path("/app/data/provas")
    assert s.producao is True
    assert s.allowed_origins == ("http://a.com", "http://b.com")
