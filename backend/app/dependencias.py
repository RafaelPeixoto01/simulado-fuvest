from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.autenticacao import TAMANHO_MAXIMO_TOKEN, nome_cookie_sessao, origem_publica
from app.models import Usuario
from app.pacote.assuntos import Taxonomia, taxonomia_em_uso
from app.services.contas import usuario_da_sessao


def obter_sessao(request: Request) -> Iterator[Session]:
    with request.app.state.fabrica_sessao() as sessao:
        yield sessao


def obter_taxonomia(request: Request) -> Taxonomia | None:
    """Taxonomia de assuntos do DATA_DIR (ADR-009); None se faltar ou for invalida."""
    return taxonomia_em_uso(request.app.state.settings.data_dir)


def obter_usuario(
    request: Request, sessao: Annotated[Session, Depends(obter_sessao)]
) -> Usuario | None:
    """Usuario do cookie de sessao (ADR-010). Desligar o login so impede logins novos: quem ja
    entrou continua podendo sincronizar, sair e excluir a conta (RF-026)."""
    token = request.cookies.get(nome_cookie_sessao(request.app.state.settings))
    if not token or len(token) > TAMANHO_MAXIMO_TOKEN:
        return None
    return usuario_da_sessao(sessao, token, datetime.now(UTC))


def exigir_usuario(usuario: Annotated[Usuario | None, Depends(obter_usuario)]) -> Usuario:
    if usuario is None:
        raise HTTPException(401, detail={
            "codigo": "nao_autenticado",
            "mensagem": "Entre com sua conta Google para continuar.",
        })
    return usuario


ModoAcesso = Literal["conta", "livre", "indisponivel"]


def modo_de_acesso(request: Request) -> ModoAcesso:
    """Login obrigatorio (CR-006, ADR-012): com o provedor Google configurado, o site exige
    conta; sem ele, fecha em producao e abre fora dela (desenvolvimento, testes, CI)."""
    if request.app.state.provedor_google is not None:
        return "conta"
    return "indisponivel" if request.app.state.settings.producao else "livre"


def exigir_acesso(
    request: Request, usuario: Annotated[Usuario | None, Depends(obter_usuario)]
) -> None:
    """Dependencia dos routers de conteudo (catalogo, simulados, questoes, correcoes, reportes)."""
    modo = modo_de_acesso(request)
    if modo == "indisponivel":
        raise HTTPException(503, detail={
            "codigo": "site_indisponivel",
            "mensagem": "O site está temporariamente indisponível.",
        })
    if modo == "conta" and usuario is None:
        exigir_usuario(usuario)  # 401 nao_autenticado


def verificar_origem(request: Request) -> None:
    """CSRF, alem do SameSite=Lax: POST/DELETE com cookie so da origem do proprio site.
    Sem Origin (cliente que nao e navegador) segue; o navegador sempre o manda nesses metodos."""
    origem = request.headers.get("origin")
    if origem is not None and origem != origem_publica(request.app.state.settings):
        raise HTTPException(403, detail={
            "codigo": "origem_invalida",
            "mensagem": "Origem da requisição não permitida.",
        })
