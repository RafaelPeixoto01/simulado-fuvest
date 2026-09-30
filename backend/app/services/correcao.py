"""Correcao sem estado (RN-002, RN-008; ADR-004/ADR-005)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Questao
from app.schemas import CorrecaoResponse, DesempenhoDisciplina, ItemCorrigido, RespostaItem


def _percentual(acertos: int, total: int) -> float:
    return round(100 * acertos / total, 1) if total else 0.0


def corrigir(sessao: Session, respostas: list[RespostaItem]) -> CorrecaoResponse:
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
