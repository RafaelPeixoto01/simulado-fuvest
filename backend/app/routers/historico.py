"""Historico da conta (CR-005, ADR-011, specs/07). Toda consulta e do usuario da sessao."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.dependencias import exigir_usuario, obter_sessao, verificar_origem
from app.models import Usuario
from app.rate_limit import limiter
from app.schemas import HistoricoRequest, HistoricoResponse
from app.services import historico

router = APIRouter(prefix="/api", tags=["historico"])


@router.get("/historico")
@limiter.limit("60/minute")
def listar_historico(
    request: Request,  # exigido pelo slowapi
    response: Response,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
) -> HistoricoResponse:
    response.headers["Cache-Control"] = "no-store"
    return HistoricoResponse(entradas=historico.listar(sessao, usuario.id))


@router.post("/historico", dependencies=[Depends(verificar_origem)])
@limiter.limit("30/minute")
def enviar_historico(
    request: Request,
    response: Response,
    pedido: HistoricoRequest,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
) -> HistoricoResponse:
    response.headers["Cache-Control"] = "no-store"
    recusadas = historico.gravar(sessao, usuario.id, pedido.entradas)
    return HistoricoResponse(entradas=historico.listar(sessao, usuario.id), rejeitadas=recusadas)


@router.delete("/historico", status_code=204, dependencies=[Depends(verificar_origem)])
@limiter.limit("10/minute")
def limpar_historico(
    request: Request,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
) -> Response:
    historico.limpar(sessao, usuario.id)
    return Response(status_code=204)
