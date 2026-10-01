from pathlib import Path

from app.config import Settings


def test_defaults_locais_sem_variaveis_de_ambiente():
    s = Settings.from_env({})

    assert s.database_url == "sqlite:///./local.db"
    assert s.environment == "development"
    assert s.allowed_origins == ("http://localhost:5173",)
    assert s.data_dir == Path(__file__).resolve().parents[2] / "data" / "provas"
    assert s.static_dir == Path(__file__).resolve().parents[1] / "static"
    assert s.producao is False
    assert s.public_url == "http://localhost:5173"
    assert s.login_disponivel is False  # sem GOOGLE_*: login desligado (CR-005)


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


def test_login_exige_id_e_segredo_do_google():
    """CR-005: os dois definidos ligam o login; PUBLIC_URL perde a barra final."""
    s = Settings.from_env({
        "GOOGLE_CLIENT_ID": "id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "segredo",
        "PUBLIC_URL": "https://site.exemplo/",
    })
    so_id = Settings.from_env({"GOOGLE_CLIENT_ID": "id", "GOOGLE_CLIENT_SECRET": ""})

    assert s.login_disponivel is True
    assert s.public_url == "https://site.exemplo"
    assert so_id.login_disponivel is False
