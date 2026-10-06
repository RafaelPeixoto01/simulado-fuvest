from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.autenticacao import TAMANHO_MAXIMO_TOKEN, nome_cookie_sessao, origem_publica
from app.config import Settings
from app.models import Usuario
from app.pacote.assuntos import Taxonomia, taxonomia_em_uso
from app.pacote.notas_corte import BaseNotasCorte, notas_corte_em_uso
from app.schemas import ModoAcesso
from app.services.contas import usuario_da_sessao
from app.services.estatisticas import registrar_atividade


def obter_sessao(request: Request) -> Iterator[Session]:
    with request.app.state.fabrica_sessao() as sessao:
        yield sessao


def obter_taxonomia(request: Request) -> Taxonomia | None:
    """Taxonomia de assuntos do DATA_DIR (ADR-009); None se faltar ou for invalida."""
    return taxonomia_em_uso(request.app.state.settings.data_dir)


def obter_notas_corte(request: Request) -> BaseNotasCorte:
    """Notas de corte publicadas do DATA_DIR (ADR-014); arquivo invalido fica fora."""
    return notas_corte_em_uso(request.app.state.settings.data_dir)


def obter_usuario(
    request: Request, sessao: Annotated[Session, Depends(obter_sessao)]
) -> Usuario | None:
    """Usuario do cookie de sessao (ADR-010). Desligar o login so impede logins novos: quem ja
    entrou continua podendo sincronizar, sair e excluir a conta (RF-026)."""
    token = request.cookies.get(nome_cookie_sessao(request.app.state.settings))
    if not token or len(token) > TAMANHO_MAXIMO_TOKEN:
        return None
    agora = datetime.now(UTC)
    usuario = usuario_da_sessao(sessao, token, agora)
    if usuario is not None:
        registrar_atividade(sessao, usuario, agora)  # ultimo acesso e `ativo` do dia (CR-013)
    return usuario


def exigir_usuario(usuario: Annotated[Usuario | None, Depends(obter_usuario)]) -> Usuario:
    if usuario is None:
        raise HTTPException(401, detail={
            "codigo": "nao_autenticado",
            "mensagem": "Entre com sua conta Google para continuar.",
        })
    return usuario


NAO_ENCONTRADO = {"codigo": "nao_encontrado", "mensagem": "Página não encontrada."}


def eh_admin(settings: Settings, usuario: Usuario) -> bool:
    return settings.eh_admin(usuario.google_sub)  # RN-020


def exigir_admin(
    request: Request, usuario: Annotated[Usuario | None, Depends(obter_usuario)]
) -> Usuario:
    """Router da gestao (CR-013): para quem nao e admin, inclusive sem sessao, a area nao
    existe (404), e o erro vem antes da validacao de query e corpo."""
    if usuario is None or not eh_admin(request.app.state.settings, usuario):
        raise HTTPException(404, detail=NAO_ENCONTRADO)
    return usuario


def modo_de_acesso(request: Request) -> ModoAcesso:
    """Login obrigatorio (CR-006, ADR-012): com o provedor Google configurado, o site exige
    conta; sem ele, fecha em producao e abre fora dela (desenvolvimento, testes, CI)."""
    if request.app.state.provedor_google is not None:
        return "conta"
    return "indisponivel" if request.app.state.settings.producao else "livre"


def exigir_acesso(request: Request, sessao: Annotated[Session, Depends(obter_sessao)]) -> None:
    """Dependencia dos routers de conteudo (catalogo, simulados, questoes, correcoes, reportes).
    A sessao do usuario so e consultada no modo `conta`."""
    modo = modo_de_acesso(request)
    if modo == "indisponivel":
        raise HTTPException(503, detail={
            "codigo": "site_indisponivel",
            "mensagem": "O site está temporariamente indisponível.",
        })
    if modo == "conta":
        exigir_usuario(obter_usuario(request, sessao))  # 401 nao_autenticado


def verificar_origem(request: Request) -> None:
    """CSRF, alem do SameSite=Lax: POST/DELETE com cookie so da origem do proprio site.
    Sem Origin (cliente que nao e navegador) segue; o navegador sempre o manda nesses metodos."""
    origem = request.headers.get("origin")
    if origem is not None and origem != origem_publica(request.app.state.settings):
        raise HTTPException(403, detail={
            "codigo": "origem_invalida",
            "mensagem": "Origem da requisição não permitida.",
        })
