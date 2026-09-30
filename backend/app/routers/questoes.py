import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao
from app.models import Questao
from app.schemas import QuestoesResponse
from app.services.serializacao import questao_publica, textos_base_publicos

router = APIRouter(prefix="/api", tags=["questoes"])

ID_QUESTAO = re.compile(r"^\d{4}-\d{3}$")
MAX_IDS = 90


@router.get("/questoes")
def questoes_por_id(
    ids: Annotated[str, Query(description="1 a 90 ids AAAA-NNN separados por vírgula")],
    sessao: Annotated[Session, Depends(obter_sessao)],
) -> QuestoesResponse:
    pedidos = list(dict.fromkeys(i.strip() for i in ids.split(",") if i.strip()))
    if not 1 <= len(pedidos) <= MAX_IDS or not all(ID_QUESTAO.match(i) for i in pedidos):
        raise HTTPException(422, detail="Informe de 1 a 90 ids válidos")

    encontradas = {q.id: q for q in sessao.scalars(select(Questao).where(Questao.id.in_(pedidos)))}
    na_ordem = [encontradas[i] for i in pedidos if i in encontradas]
    return QuestoesResponse(
        questoes=[questao_publica(q) for q in na_ordem],
        textos_base=textos_base_publicos(sessao, na_ordem),
        nao_encontradas=[i for i in pedidos if i not in encontradas],
    )
