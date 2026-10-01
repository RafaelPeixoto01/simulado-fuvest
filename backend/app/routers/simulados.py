from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.dependencias import exigir_acesso, obter_sessao
from app.rate_limit import limiter
from app.schemas import GerarTreino, PedidoSimulado, SimuladoResponse
from app.services.estatisticas import registrar_geracao
from app.services.geracao import ProvaNaoEncontrada, QuestoesInsuficientes, gerar_simulado
from app.services.serializacao import questao_publica, textos_base_publicos

# Login obrigatorio (CR-006, ADR-012)
router = APIRouter(prefix="/api", tags=["simulados"], dependencies=[Depends(exigir_acesso)])


@router.post("/simulados")
@limiter.limit("30/minute")
def gerar(
    request: Request,  # exigido pelo slowapi
    pedido: Annotated[PedidoSimulado, Body()],
    sessao: Annotated[Session, Depends(obter_sessao)],
) -> SimuladoResponse:
    try:
        simulado = gerar_simulado(sessao, pedido)
    except QuestoesInsuficientes as erro:
        raise HTTPException(409, detail={
            "codigo": "questoes_insuficientes",
            "mensagem": str(erro),
            "disponiveis": erro.disponiveis,
        }) from erro
    except ProvaNaoEncontrada as erro:
        raise HTTPException(404, detail={
            "codigo": "prova_nao_encontrada", "mensagem": str(erro),
        }) from erro

    # Treino so conta no inicio da sessao; os lotes seguintes trazem `excluir`
    if not (isinstance(pedido, GerarTreino) and pedido.excluir):
        registrar_geracao(sessao, simulado.modo)

    return SimuladoResponse(
        modo=simulado.modo,
        questoes=[questao_publica(q) for q in simulado.questoes],
        textos_base=textos_base_publicos(sessao, simulado.questoes),
        tempo_limite_s=simulado.tempo_limite_s,
        pausavel=simulado.pausavel,
        disponiveis=simulado.disponiveis,
        semente=simulado.semente,
    )
