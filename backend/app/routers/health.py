from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao
from app.models import Prova

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health(sessao: Annotated[Session, Depends(obter_sessao)]) -> dict:
    provas = sessao.scalar(select(func.count()).select_from(Prova))
    return {"status": "ok", "provas": provas}
