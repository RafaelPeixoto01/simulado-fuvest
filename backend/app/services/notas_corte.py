"""Notas de corte na API (CR-010, specs/08 §2.4): resposta da consulta e carreira-alvo."""

from sqlalchemy.orm import Session

from app.models import Usuario
from app.pacote.notas_corte import BaseNotasCorte, CarreiraCorte
from app.schemas import CarreiraAlvo, CarreiraCorteResposta, CortesModalidades, NotasCorteResponse


class CarreiraInvalida(Exception):
    """O par (ano, codigo) nao e uma carreira da lista mais recente (RN-019)."""


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


def resolver_carreira_alvo(base: BaseNotasCorte, usuario: Usuario) -> CarreiraAlvo | None:
    """A carreira-alvo com os cortes do ano dela; `carreira` None se saiu dos cortes publicados."""
    ano, codigo = usuario.carreira_alvo_ano, usuario.carreira_alvo_codigo
    if ano is None or codigo is None:
        return None
    carreira = base.carreira(ano, codigo)
    return CarreiraAlvo(ano=ano, codigo=codigo, carreira=carreira_resposta(carreira) if carreira else None)


def definir_carreira_alvo(
    sessao: Session, usuario: Usuario, base: BaseNotasCorte, ano: int, codigo: int
) -> CarreiraAlvo:
    """So da lista mais recente: com os codigos mudando todo ano, nada e migrado (RN-019)."""
    if ano != base.recente or base.carreira(ano, codigo) is None:
        raise CarreiraInvalida
    usuario.carreira_alvo_ano = ano
    usuario.carreira_alvo_codigo = codigo
    sessao.commit()
    return resolver_carreira_alvo(base, usuario)


def remover_carreira_alvo(sessao: Session, usuario: Usuario) -> None:
    usuario.carreira_alvo_ano = None
    usuario.carreira_alvo_codigo = None
    sessao.commit()
