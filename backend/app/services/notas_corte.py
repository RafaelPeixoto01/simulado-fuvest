"""Notas de corte na API (CR-010, specs/08 §2.4): resposta da consulta e carreira-alvo."""

from app.pacote.notas_corte import BaseNotasCorte, CarreiraCorte
from app.schemas import CarreiraCorteResposta, CortesModalidades, NotasCorteResponse


def carreira_resposta(carreira: CarreiraCorte) -> CarreiraCorteResposta:
    return CarreiraCorteResposta(
        codigo=carreira.codigo,
        nome=carreira.nome,
        vagas=carreira.vagas,
        cortes=CortesModalidades(ac=carreira.ac.corte, ep=carreira.ep.corte, ppi=carreira.ppi.corte),
    )


def notas_corte_resposta(base: BaseNotasCorte, ano: int | None) -> NotasCorteResponse:
    """O ano pedido, se publicado; senao o mais recente (o cliente compara `ano` com o pedido)."""
    devolvido = ano if ano is not None and base.ano(ano) is not None else base.recente
    notas = base.ano(devolvido) if devolvido is not None else None
    return NotasCorteResponse(
        anos=base.anos,
        recente=base.recente,
        ano=devolvido,
        fonte=notas.fonte if notas else None,
        carreiras=[carreira_resposta(c) for c in notas.carreiras] if notas else [],
    )
