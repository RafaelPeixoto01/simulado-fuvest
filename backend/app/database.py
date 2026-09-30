from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


def normalizar_database_url(url: str) -> str:
    """Railway entrega `postgres://`; o SQLAlchemy 2 exige o driver explicito."""
    for prefixo in ("postgres://", "postgresql://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url[len(prefixo):]
    return url


def criar_engine(url: str) -> Engine:
    url = normalizar_database_url(url)
    if url.startswith("sqlite"):
        opcoes = {"connect_args": {"check_same_thread": False}}
        if url in ("sqlite://", "sqlite:///:memory:"):
            # Banco em memoria compartilhado entre conexoes (testes)
            opcoes["poolclass"] = StaticPool
        engine = create_engine(url, **opcoes)
        event.listen(engine, "connect", _ligar_foreign_keys_sqlite)
        return engine
    return create_engine(url, pool_pre_ping=True)


def _ligar_foreign_keys_sqlite(conexao_dbapi, _registro) -> None:
    # Sem este PRAGMA o SQLite ignora ON DELETE CASCADE (paridade com o Postgres)
    cursor = conexao_dbapi.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def criar_fabrica_sessao(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def sessoes(fabrica: sessionmaker[Session]) -> Iterator[Session]:
    with fabrica() as sessao:
        yield sessao
