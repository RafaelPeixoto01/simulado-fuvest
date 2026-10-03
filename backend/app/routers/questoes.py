import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencias import exigir_acesso, obter_sessao
from app.models import Questao
from app.schemas import PADRAO_ID_QUESTAO, QuestoesResponse
from app.services.serializacao import questao_publica, textos_base_publicos

# Login obrigatorio (CR-006, ADR-012)
router = APIRouter(prefix="/api", tags=["questoes"], dependencies=[Depends(exigir_acesso)])

ID_QUESTAO = re.compile(PADRAO_ID_QUESTAO)
MAX_IDS = 90


@router.get("/questoes")
def questoes_por_id(
    ids: Annotated[str, Query(description="1 a 90 ids CODIGO-NNN separados por vírgula")],
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
