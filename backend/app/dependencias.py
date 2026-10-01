from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.pacote.assuntos import Taxonomia, taxonomia_em_uso


def obter_sessao(request: Request) -> Iterator[Session]:
    with request.app.state.fabrica_sessao() as sessao:
        yield sessao


def obter_taxonomia(request: Request) -> Taxonomia | None:
    """Taxonomia de assuntos do DATA_DIR (ADR-009); None se faltar ou for invalida."""
    return taxonomia_em_uso(request.app.state.settings.data_dir)
