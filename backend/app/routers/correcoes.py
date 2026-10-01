from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.dependencias import exigir_acesso, obter_sessao, obter_taxonomia, verificar_origem
from app.pacote.assuntos import Taxonomia
from app.rate_limit import limiter
from app.schemas import CorrecaoRequest, CorrecaoResponse
from app.services.correcao import corrigir

# Login obrigatorio (CR-006, ADR-012)
router = APIRouter(
    prefix="/api",
    tags=["correcoes"],
    dependencies=[Depends(verificar_origem), Depends(exigir_acesso)],
)


@router.post("/correcoes")
@limiter.limit("120/minute")  # o Treino corrige 1 questao por chamada
def corrigir_respostas(
    request: Request,  # exigido pelo slowapi
    pedido: CorrecaoRequest,
    sessao: Annotated[Session, Depends(obter_sessao)],
    taxonomia: Annotated[Taxonomia | None, Depends(obter_taxonomia)],
) -> CorrecaoResponse:
    return corrigir(sessao, pedido.respostas, taxonomia)
