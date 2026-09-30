from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao, obter_taxonomia
from app.pacote.assuntos import Taxonomia
from app.rate_limit import limiter
from app.schemas import CorrecaoRequest, CorrecaoResponse
from app.services.correcao import corrigir

router = APIRouter(prefix="/api", tags=["correcoes"])


@router.post("/correcoes")
@limiter.limit("120/minute")  # o Treino corrige 1 questao por chamada
def corrigir_respostas(
    request: Request,  # exigido pelo slowapi
    pedido: CorrecaoRequest,
    sessao: Annotated[Session, Depends(obter_sessao)],
    taxonomia: Annotated[Taxonomia | None, Depends(obter_taxonomia)],
) -> CorrecaoResponse:
    return corrigir(sessao, pedido.respostas, taxonomia)
