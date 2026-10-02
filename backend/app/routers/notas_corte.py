from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencias import exigir_acesso, obter_notas_corte
from app.pacote.notas_corte import BaseNotasCorte
from app.schemas import NotasCorteResponse
from app.services.notas_corte import notas_corte_resposta

# Conteudo: login obrigatorio (CR-006, ADR-012); nao entra na vitrine publica (CR-010)
router = APIRouter(prefix="/api", tags=["notas-corte"], dependencies=[Depends(exigir_acesso)])


@router.get("/notas-corte")
def notas_corte(
    base: Annotated[BaseNotasCorte, Depends(obter_notas_corte)],
    ano: Annotated[int | None, Query(ge=1977, le=2100)] = None,
) -> NotasCorteResponse:
    return notas_corte_resposta(base, ano)
