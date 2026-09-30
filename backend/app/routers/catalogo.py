from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao
from app.schemas import CatalogoResponse
from app.services.catalogo import obter_catalogo

router = APIRouter(prefix="/api", tags=["catalogo"])


@router.get("/catalogo")
def catalogo(sessao: Annotated[Session, Depends(obter_sessao)]) -> CatalogoResponse:
    return obter_catalogo(sessao)
