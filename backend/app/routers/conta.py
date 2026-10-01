"""Sessao atual, sair e excluir a conta (CR-005, specs/07)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.autenticacao import apagar_cookie_sessao, nome_cookie_sessao
from app.dependencias import (
    exigir_usuario,
    modo_de_acesso,
    obter_sessao,
    obter_usuario,
    verificar_origem,
)
from app.models import Usuario
from app.rate_limit import limiter
from app.schemas import SessaoResponse, UsuarioPublico
from app.services import contas

router = APIRouter(prefix="/api", tags=["conta"])


@router.get("/sessao")
def ler_sessao(
    request: Request,
    response: Response,
    usuario: Annotated[Usuario | None, Depends(obter_usuario)],
) -> SessaoResponse:
    response.headers["Cache-Control"] = "no-store"
    return SessaoResponse(
        login_disponivel=request.app.state.provedor_google is not None,
        usuario=(
            UsuarioPublico(id=usuario.id, email=usuario.email, nome=usuario.nome)
            if usuario
            else None
        ),
        acesso=modo_de_acesso(request),
    )


@router.delete("/sessao", status_code=204, dependencies=[Depends(verificar_origem)])
def sair(request: Request, sessao: Annotated[Session, Depends(obter_sessao)]) -> Response:
    settings = request.app.state.settings
    token = request.cookies.get(nome_cookie_sessao(settings))
    if token:
        contas.sair(sessao, token)
    resposta = Response(status_code=204)
    apagar_cookie_sessao(resposta, settings)
    return resposta


@router.delete("/conta", status_code=204, dependencies=[Depends(verificar_origem)])
@limiter.limit("10/minute")
def excluir_conta(
    request: Request,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
) -> Response:
    contas.excluir_conta(sessao, usuario.id)
    resposta = Response(status_code=204)
    apagar_cookie_sessao(resposta, request.app.state.settings)
    return resposta
