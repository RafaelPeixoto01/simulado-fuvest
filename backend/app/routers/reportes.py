from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.dependencias import exigir_acesso, obter_sessao
from app.rate_limit import limiter
from app.schemas import ReporteCreate, ReporteCriado
from app.services.reportes import QuestaoNaoEncontrada, criar_reporte

# Login obrigatorio (CR-006, ADR-012)
router = APIRouter(prefix="/api", tags=["reportes"], dependencies=[Depends(exigir_acesso)])


@router.post("/reportes", status_code=201)
@limiter.limit("10/hour")
def reportar(
    request: Request,  # exigido pelo slowapi
    dados: ReporteCreate,
    sessao: Annotated[Session, Depends(obter_sessao)],
) -> ReporteCriado:
    try:
        return ReporteCriado(id=criar_reporte(sessao, dados))
    except QuestaoNaoEncontrada as erro:
        raise HTTPException(404, detail={
            "codigo": "questao_nao_encontrada", "mensagem": str(erro),
        }) from erro
