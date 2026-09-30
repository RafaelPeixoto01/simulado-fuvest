from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
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
        return create_engine(url, **opcoes)
    return create_engine(url, pool_pre_ping=True)


def criar_fabrica_sessao(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def sessoes(fabrica: sessionmaker[Session]) -> Iterator[Session]:
    with fabrica() as sessao:
        yield sessao
