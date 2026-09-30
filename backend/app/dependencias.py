from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session


def obter_sessao(request: Request) -> Iterator[Session]:
    with request.app.state.fabrica_sessao() as sessao:
        yield sessao
