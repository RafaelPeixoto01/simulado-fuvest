"""Geracao de simulados nos 4 modos (specs/02 §2.3; RN-002 a RN-005, RN-009).

Sem estado: devolve as questoes sorteadas; quem chama serializa (sem gabarito). As questoes
que o estudante ja fez chegam no pedido (`vistas`) e so vao para o fim da fila (RN-023, CR-015).
Toda consulta e ordenada por id antes do sorteio, entao a mesma semente com a
mesma base gera o mesmo simulado.
"""

import random
import secrets
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.models import Prova, Questao
from app.pacote.validacao import TOTAL_PROVA_COMPLETA
from app.schemas import GerarAno, GerarCompleta, GerarPersonalizado, GerarTreino
from app.services.catalogo import contagens_por_prova, distribuicao_completa

TEMPO_PROVA_S = 18000  # 5 h, em qualquer prova inteira (90 ate 2026, 80 desde 2027)
# Ritmo do formato vigente (RN-009, CR-011): 5 h / 80 = 225 s = 3 min 45 s por questao
TEMPO_POR_QUESTAO_S = TEMPO_PROVA_S // TOTAL_PROVA_COMPLETA
LOTE_TREINO = 20

T = TypeVar("T")


class QuestoesInsuficientes(Exception):
    def __init__(self, disponiveis: int):
        super().__init__(f"Só existem {disponiveis} questões para esses filtros")
        self.disponiveis = disponiveis


class ProvaNaoEncontrada(Exception):
    pass


@dataclass
class SimuladoGerado:
    modo: str
    questoes: list[Questao]
    tempo_limite_s: int | None
    pausavel: bool
    disponiveis: int
    semente: int


def _sem_idade(_: object) -> int | None:
    return None


def priorizar_ineditas(candidatas: Sequence[T], k: int, rng: random.Random,
                       idade: Callable[[T], int | None] = _sem_idade) -> list[T]:
    """RN-023 (CR-015): sorteia k entre as questoes que o estudante ainda nao fez (idade None)
    e, se elas nao bastarem, completa com as vistas ha mais tempo (maior idade). Sem vistas,
    e o mesmo `rng.sample` de antes do CR: a mesma semente gera o mesmo simulado."""
    ineditas: list[T] = []
    vistas: list[tuple[int, T]] = []
    for c in candidatas:
        idade_c = idade(c)
        if idade_c is None:
            ineditas.append(c)
        else:
            vistas.append((idade_c, c))
    if len(ineditas) >= k:
        return rng.sample(ineditas, k)
    vistas.sort(key=lambda par: par[0], reverse=True)  # a vista ha mais tempo primeiro
    return ineditas + [c for _, c in vistas[: k - len(ineditas)]]


def idade_das_vistas(vistas: Sequence[str]) -> Callable[[Questao], int | None]:
    """Posicao da questao em `vistas`, que vem da vista mais recentemente para a mais antiga:
    0 e a mais recente, e None, a inedita. Vale a primeira ocorrencia de um id repetido."""
    idades: dict[str, int] = {}
    for posicao, questao_id in enumerate(vistas):
        idades.setdefault(questao_id, posicao)
    return lambda q: idades.get(q.id)


def sortear_completa(por_disciplina: dict[str, Sequence[T]], alvo: dict[str, int],
                     rng: random.Random,
                     idade: Callable[[T], int | None] = _sem_idade) -> list[T]:
    """RN-003: sorteia o alvo de cada disciplina; o deficit de uma disciplina sem
    questoes suficientes e coberto sorteando do restante. Nos dois, ineditas primeiro (RN-023)."""
    escolhidas: list[T] = []
    sobras: list[T] = []
    for disciplina in sorted(por_disciplina):
        candidatas = list(por_disciplina[disciplina])
        k = min(alvo.get(disciplina, 0), len(candidatas))
        sorteadas = priorizar_ineditas(candidatas, k, rng, idade)
        escolhidas += sorteadas
        sobras += [c for c in candidatas if c not in sorteadas]
    deficit = sum(alvo.values()) - len(escolhidas)
    return escolhidas + priorizar_ineditas(sobras, min(deficit, len(sobras)), rng, idade)


def _ordenar(questoes: list[Questao], rng: random.Random) -> list[Questao]:
    """RN-005: questoes do mesmo texto-base em sequencia (ordem original); grupos embaralhados."""
    grupos: dict[str, list[Questao]] = {}
    for q in sorted(questoes, key=lambda q: (q.prova_codigo, q.numero)):
        grupos.setdefault(q.texto_base_id or q.id, []).append(q)
    ordem = list(grupos.values())
    rng.shuffle(ordem)
    return [q for grupo in ordem for q in grupo]


def _validas(sessao: Session, ano_inicio: int | None = None,
             ano_fim: int | None = None) -> list[Questao]:
    """Nao anuladas; o intervalo e pelo ano FUVEST de referencia da prova (simulados
    oficiais de 2027 entram em 2027 — CR-011, P4)."""
    # contains_eager: a prova do join ja serve a serializacao (origem), sem consulta extra
    consulta = (
        select(Questao).join(Questao.prova).options(contains_eager(Questao.prova))
        .where(Questao.anulada.is_(False)).order_by(Questao.id)
    )
    if ano_inicio:
        consulta = consulta.where(Prova.ano >= ano_inicio)
    if ano_fim:
        consulta = consulta.where(Prova.ano <= ano_fim)
    return list(sessao.scalars(consulta))


def _da_disciplina(questoes: list[Questao], disciplinas: list[str], *,
                   secundarias: bool) -> list[Questao]:
    """Pela principal; com `secundarias`, tambem as interdisciplinares que tocam uma das
    escolhidas (Personalizado). O Treino conta so a principal (CR-016)."""
    if not disciplinas:
        return questoes
    alvo = set(disciplinas)
    if secundarias:
        return [q for q in questoes if alvo & {q.disciplina, *q.disciplinas_secundarias}]
    return [q for q in questoes if q.disciplina in alvo]


def _completa(sessao: Session, pedido: GerarCompleta, rng: random.Random,
              semente: int) -> SimuladoGerado:
    validas = _validas(sessao)
    if len(validas) < TOTAL_PROVA_COMPLETA:
        raise QuestoesInsuficientes(len(validas))
    por_disciplina: dict[str, list[Questao]] = {}
    for q in validas:
        por_disciplina.setdefault(q.disciplina, []).append(q)
    alvo = distribuicao_completa(contagens_por_prova(sessao))
    escolhidas = sortear_completa(por_disciplina, alvo, rng, idade_das_vistas(pedido.vistas))
    return SimuladoGerado("completa", _ordenar(escolhidas, rng), TEMPO_PROVA_S, False,
                          len(validas), semente)


def _personalizado(sessao: Session, pedido: GerarPersonalizado, rng: random.Random,
                   semente: int) -> SimuladoGerado:
    candidatas = _da_disciplina(
        _validas(sessao, pedido.ano_inicio, pedido.ano_fim), pedido.disciplinas, secundarias=True
    )
    if len(candidatas) < pedido.quantidade:
        raise QuestoesInsuficientes(len(candidatas))
    escolhidas = priorizar_ineditas(candidatas, pedido.quantidade, rng,
                                    idade_das_vistas(pedido.vistas))
    tempo = pedido.quantidade * TEMPO_POR_QUESTAO_S if pedido.cronometro else None
    return SimuladoGerado("personalizado", _ordenar(escolhidas, rng), tempo, True,
                          len(candidatas), semente)


def _ano(sessao: Session, pedido: GerarAno, semente: int) -> SimuladoGerado:
    if sessao.get(Prova, pedido.prova) is None:
        raise ProvaNaoEncontrada(f"Prova {pedido.prova} não está na base")
    # Todas as questoes da prova (90 ou 80), na ordem original e com as anuladas
    # (RN-002: contam como acerto)
    questoes = list(sessao.scalars(
        select(Questao).options(joinedload(Questao.prova))
        .where(Questao.prova_codigo == pedido.prova).order_by(Questao.numero)
    ))
    return SimuladoGerado("ano", questoes, TEMPO_PROVA_S, False, len(questoes), semente)


def _treino(sessao: Session, pedido: GerarTreino, rng: random.Random,
            semente: int) -> SimuladoGerado:
    mostradas = set(pedido.excluir)
    candidatas = [
        q for q in _da_disciplina(_validas(sessao, pedido.ano_inicio, pedido.ano_fim),
                                  pedido.disciplinas, secundarias=False)
        if q.id not in mostradas
    ]
    # `excluir` tira as ja mostradas nesta sessao; `vistas`, as feitas em simulados, so vao
    # para o fim da fila (CR-015)
    lote = priorizar_ineditas(candidatas, min(LOTE_TREINO, len(candidatas)), rng,
                              idade_das_vistas(pedido.vistas))
    return SimuladoGerado("treino", _ordenar(lote, rng), None, False, len(candidatas), semente)


def gerar_simulado(
    sessao: Session, pedido: GerarCompleta | GerarPersonalizado | GerarAno | GerarTreino
) -> SimuladoGerado:
    semente = getattr(pedido, "semente", None)
    if semente is None:
        semente = secrets.randbelow(2**31)
    rng = random.Random(semente)
    match pedido:
        case GerarCompleta():
            return _completa(sessao, pedido, rng, semente)
        case GerarPersonalizado():
            return _personalizado(sessao, pedido, rng, semente)
        case GerarAno():
            return _ano(sessao, pedido, semente)
        case GerarTreino():
            return _treino(sessao, pedido, rng, semente)
    raise ValueError(f"modo desconhecido: {pedido}")
