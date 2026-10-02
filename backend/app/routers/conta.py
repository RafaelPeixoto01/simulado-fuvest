"""Sessao atual, sair, excluir a conta (CR-005, specs/07) e carreira-alvo (CR-010, specs/08)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.autenticacao import apagar_cookie_sessao, nome_cookie_sessao
from app.dependencias import (
    exigir_acesso,
    exigir_usuario,
    modo_de_acesso,
    obter_notas_corte,
    obter_sessao,
    obter_usuario,
    verificar_origem,
)
from app.models import Usuario
from app.pacote.notas_corte import BaseNotasCorte
from app.rate_limit import limiter
from app.schemas import CarreiraAlvo, CarreiraAlvoRequest, SessaoResponse, UsuarioPublico
from app.services import contas
from app.services.notas_corte import (
    CarreiraInvalida,
    definir_carreira_alvo,
    remover_carreira_alvo,
    resolver_carreira_alvo,
)

router = APIRouter(prefix="/api", tags=["conta"])


@router.get("/sessao")
def ler_sessao(
    request: Request,
    response: Response,
    usuario: Annotated[Usuario | None, Depends(obter_usuario)],
    notas_corte: Annotated[BaseNotasCorte, Depends(obter_notas_corte)],
) -> SessaoResponse:
    response.headers["Cache-Control"] = "no-store"
    return SessaoResponse(
        login_disponivel=request.app.state.provedor_google is not None,
        usuario=(
            UsuarioPublico(
                id=usuario.id,
                email=usuario.email,
                nome=usuario.nome,
                carreira_alvo=resolver_carreira_alvo(notas_corte, usuario),
            )
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


# Carreira-alvo (CR-010): conteudo como as notas de corte (503 com o site fechado), mas sempre
# com conta (401 tambem no modo livre); so a carreira, nunca a modalidade (D4)
@router.put(
    "/conta/carreira-alvo", dependencies=[Depends(exigir_acesso), Depends(verificar_origem)]
)
@limiter.limit("30/minute")
def definir_alvo(
    request: Request,
    response: Response,
    pedido: CarreiraAlvoRequest,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
    notas_corte: Annotated[BaseNotasCorte, Depends(obter_notas_corte)],
) -> CarreiraAlvo:
    response.headers["Cache-Control"] = "no-store"
    try:
        return definir_carreira_alvo(sessao, usuario, notas_corte, pedido.ano, pedido.codigo)
    except CarreiraInvalida:
        raise HTTPException(422, detail={
            "codigo": "carreira_invalida",
            "mensagem": "Escolha uma carreira da lista mais recente de notas de corte.",
        }) from None


@router.delete(
    "/conta/carreira-alvo",
    status_code=204,
    dependencies=[Depends(exigir_acesso), Depends(verificar_origem)],
)
@limiter.limit("30/minute")
def remover_alvo(
    request: Request,
    sessao: Annotated[Session, Depends(obter_sessao)],
    usuario: Annotated[Usuario, Depends(exigir_usuario)],
) -> Response:
    remover_carreira_alvo(sessao, usuario)
    return Response(status_code=204)
