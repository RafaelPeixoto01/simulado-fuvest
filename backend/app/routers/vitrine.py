from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao
from app.schemas import VitrineResponse
from app.services.catalogo import obter_vitrine

# Publica em qualquer modo de acesso, como o health (CR-007, emenda a D2 do CR-006):
# so os totais da base, para a apresentacao. Sem exigir_acesso de proposito
router = APIRouter(prefix="/api", tags=["vitrine"])


@router.get("/vitrine")
def vitrine(sessao: Annotated[Session, Depends(obter_sessao)]) -> VitrineResponse:
    return obter_vitrine(sessao)
