"""Correcao sem estado (RN-002, RN-008; ADR-004/ADR-005)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Questao
from app.pacote.assuntos import Taxonomia
from app.schemas import (
    CorrecaoResponse,
    DesempenhoAssunto,
    DesempenhoDisciplina,
    ItemCorrigido,
    RespostaItem,
)


def _percentual(acertos: int, total: int) -> float:
    return round(100 * acertos / total, 1) if total else 0.0


def _por_assunto(
    disciplina: str, itens: list[ItemCorrigido], taxonomia: Taxonomia | None
) -> list[DesempenhoAssunto]:
    """CR-004: itens sem assunto ficam fora do detalhe (continuam na disciplina)."""
    grupos: dict[str, list[ItemCorrigido]] = {}
    for item in itens:
        if item.assunto is not None:
            grupos.setdefault(item.assunto, []).append(item)
    assuntos = []
    for slug, lista in grupos.items():
        acertos = sum(i.acertou for i in lista)
        nome = taxonomia.nome(disciplina, slug) if taxonomia else None
        assuntos.append(DesempenhoAssunto(
            assunto=slug,
            nome=nome or slug,
            total=len(lista),
            acertos=acertos,
            percentual=_percentual(acertos, len(lista)),
        ))
    assuntos.sort(key=lambda a: (a.percentual, a.assunto))
    return assuntos


def corrigir(
    sessao: Session, respostas: list[RespostaItem], taxonomia: Taxonomia | None
) -> CorrecaoResponse:
    ids = [r.questao_id for r in respostas]
    questoes = {q.id: q for q in sessao.scalars(select(Questao).where(Questao.id.in_(ids)))}

    itens = []
    for r in respostas:
        q = questoes.get(r.questao_id)
        if q is None:
            continue
        itens.append(ItemCorrigido(
            questao_id=q.id,
            resposta=r.resposta,
            correta=q.resposta,
            anulada=q.anulada,
            # Anulada: ponto para todos (RN-002). Em branco conta como erro (RN-008).
            acertou=q.anulada or (r.resposta is not None and r.resposta == q.resposta),
            disciplina=q.disciplina,
            assunto=q.assunto,
        ))

    por_disciplina: dict[str, list[ItemCorrigido]] = {}
    for item in itens:
        por_disciplina.setdefault(item.disciplina, []).append(item)
    desempenho = [
        DesempenhoDisciplina(
            disciplina=d,
            total=len(lista),
            acertos=sum(i.acertou for i in lista),
            percentual=_percentual(sum(i.acertou for i in lista), len(lista)),
            assuntos=_por_assunto(d, lista, taxonomia),
        )
        for d, lista in por_disciplina.items()
    ]
    desempenho.sort(key=lambda d: (d.percentual, d.disciplina))

    acertos = sum(i.acertou for i in itens)
    return CorrecaoResponse(
        itens=itens,
        total=len(itens),
        acertos=acertos,
        percentual=_percentual(acertos, len(itens)),
        por_disciplina=desempenho,
        ignoradas=[i for i in ids if i not in questoes],
    )
