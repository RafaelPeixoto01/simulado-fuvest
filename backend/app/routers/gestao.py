"""Area de gestao (CR-013, ADR-016, specs/09). So o administrador (RN-020): para qualquer
outro, inclusive sem sessao, 404 antes de validar query e corpo. Respostas sem cache."""

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.dependencias import (
    exigir_admin,
    obter_notas_corte,
    obter_sessao,
    obter_taxonomia,
    verificar_origem,
)
from app.pacote.assuntos import Taxonomia
from app.pacote.notas_corte import BaseNotasCorte
from app.rate_limit import limiter
from app.schemas import (
    AprendizadoResponse,
    EstudantesResponse,
    PeriodoGestao,
    QualidadeResponse,
    ReportesGestaoResponse,
    ResolverReportesRequest,
    ResolverReportesResponse,
    UsoResponse,
)
from app.services import gestao
from app.services.reportes import resolver_reportes

router = APIRouter(prefix="/api/gestao", tags=["gestao"], dependencies=[Depends(exigir_admin)])

Sessao = Annotated[Session, Depends(obter_sessao)]


def _sem_cache(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"  # dado pessoal (lista de contas) e agregados


@router.get("/uso")
@limiter.limit("60/minute")
def ler_uso(
    request: Request, response: Response, sessao: Sessao, periodo: PeriodoGestao = "30"
) -> UsoResponse:
    _sem_cache(response)
    return gestao.uso(sessao, periodo, datetime.now(UTC))


@router.get("/aprendizado")
@limiter.limit("60/minute")
def ler_aprendizado(
    request: Request,
    response: Response,
    sessao: Sessao,
    taxonomia: Annotated[Taxonomia | None, Depends(obter_taxonomia)],
    notas_corte: Annotated[BaseNotasCorte, Depends(obter_notas_corte)],
    periodo: PeriodoGestao = "30",
) -> AprendizadoResponse:
    _sem_cache(response)
    return gestao.aprendizado(sessao, periodo, datetime.now(UTC), taxonomia, notas_corte)


@router.get("/qualidade")
@limiter.limit("60/minute")
def ler_qualidade(
    request: Request,
    response: Response,
    sessao: Sessao,
    taxonomia: Annotated[Taxonomia | None, Depends(obter_taxonomia)],
) -> QualidadeResponse:
    _sem_cache(response)
    return gestao.qualidade(sessao, taxonomia)


@router.get("/reportes")
@limiter.limit("60/minute")
def ler_reportes(
    request: Request,
    response: Response,
    sessao: Sessao,
    status: Literal["pendente", "resolvido"] = "pendente",
) -> ReportesGestaoResponse:
    _sem_cache(response)
    return ReportesGestaoResponse(reportes=gestao.reportes(sessao, status))


@router.post("/reportes/resolver", dependencies=[Depends(verificar_origem)])
@limiter.limit("30/minute")
def resolver(
    request: Request, response: Response, pedido: ResolverReportesRequest, sessao: Sessao
) -> ResolverReportesResponse:
    _sem_cache(response)
    resultado = resolver_reportes(sessao, pedido.ids)  # o mesmo servico da CLI
    return ResolverReportesResponse(
        resolvidos=resultado.resolvidos,
        ja_resolvidos=resultado.ja_resolvidos,
        inexistentes=resultado.inexistentes,
    )


@router.get("/estudantes")
@limiter.limit("60/minute")
def ler_estudantes(
    request: Request,
    response: Response,
    sessao: Sessao,
    notas_corte: Annotated[BaseNotasCorte, Depends(obter_notas_corte)],
    busca: Annotated[str | None, Query(max_length=100)] = None,
    ordem: Literal["cadastro", "acesso"] = "cadastro",
    pagina: Annotated[int, Query(ge=1, le=10_000)] = 1,
) -> EstudantesResponse:
    _sem_cache(response)
    return gestao.estudantes(
        sessao, request.app.state.settings, notas_corte, busca, ordem, pagina
    )
