import pytest

from app.database import normalizar_database_url


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        # Railway entrega o prefixo antigo postgres:// (licao do Meu Controle)
        ("postgres://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgresql://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgresql+psycopg://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("sqlite:///./local.db", "sqlite:///./local.db"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_normaliza_database_url(entrada, esperado):
    assert normalizar_database_url(entrada) == esperado
