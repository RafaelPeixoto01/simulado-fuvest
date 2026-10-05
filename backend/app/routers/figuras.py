"""GET /figuras/{prova}/{arquivo} — figuras das provas sincronizadas (specs/03-SPEC §3.2)."""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencias import obter_sessao
from app.models import Prova
from app.pacote.leitura import DIR_FIGURAS
from app.pacote.schema import PADRAO_CODIGO_PROVA

router = APIRouter(tags=["figuras"])

CODIGO_PROVA = re.compile(PADRAO_CODIGO_PROVA)
ARQUIVO = re.compile(r"^[a-z0-9-]+\.webp$")


@router.get("/figuras/{prova}/{arquivo}")
def figura(
    prova: str,
    arquivo: str,
    request: Request,
    sessao: Annotated[Session, Depends(obter_sessao)],
) -> FileResponse:
    # Validacao antes de tocar o disco: impede path traversal
    if not CODIGO_PROVA.match(prova) or not ARQUIVO.match(arquivo):
        raise HTTPException(404)
    # So provas sincronizadas: rascunho no disco nao e servido
    if sessao.get(Prova, prova) is None:
        raise HTTPException(404)
    caminho = request.app.state.settings.data_dir / prova / DIR_FIGURAS / arquivo
    if not caminho.is_file():
        raise HTTPException(404)
    return FileResponse(
        caminho, media_type="image/webp", headers={"Cache-Control": "public, max-age=86400"}
    )
