"""Questao do banco -> formato publico (sem gabarito; figura vira URL)."""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Questao, TextoBase
from app.pacote.schema import rotulo_da_prova
from app.schemas import AlternativaPublica, BlocoPublico, QuestaoPublica, TextoBasePublico


def _url(codigo: str, bloco: dict) -> dict:
    if bloco.get("figura"):
        return {**bloco, "figura": f"/figuras/{codigo}/{bloco['figura']}"}
    return bloco


def questao_publica(q: Questao) -> QuestaoPublica:
    # q.prova: many-to-one, carregado uma vez por prova na sessao (identity map)
    return QuestaoPublica(
        id=q.id,
        prova=q.prova_codigo,
        origem=rotulo_da_prova(q.prova.ano, q.prova.edicao),
        ano=q.prova.ano,
        numero=q.numero,
        disciplina=q.disciplina,
        disciplinas_secundarias=q.disciplinas_secundarias,
        texto_base_id=q.texto_base_id,
        enunciado=[BlocoPublico(**_url(q.prova_codigo, b)) for b in q.enunciado],
        alternativas={
            letra: AlternativaPublica(**_url(q.prova_codigo, alt))
            for letra, alt in q.alternativas.items()
        },
    )


def textos_base_publicos(sessao: Session, questoes: Iterable[Questao]) -> dict[str, TextoBasePublico]:
    """So os textos-base referenciados pelas questoes."""
    ids = {q.texto_base_id for q in questoes if q.texto_base_id}
    if not ids:
        return {}
    textos = sessao.scalars(select(TextoBase).where(TextoBase.id.in_(ids)))
    return {
        tb.id: TextoBasePublico(
            id=tb.id, conteudo=[BlocoPublico(**_url(tb.prova_codigo, b)) for b in tb.conteudo]
        )
        for tb in textos
    }
