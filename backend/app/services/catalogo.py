"""Catalogo da base e distribuicao da prova completa (RF-008, RN-003)."""

from collections import Counter
from fractions import Fraction

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.disciplinas import NOMES_DISCIPLINAS, Disciplina
from app.models import Prova, Questao
from app.pacote.assuntos import Taxonomia
from app.pacote.validacao import TOTAL_QUESTOES
from app.schemas import (
    AssuntoCatalogo,
    CatalogoResponse,
    DisciplinaCatalogo,
    ProvaCatalogo,
    VitrineResponse,
)


def distribuicao_completa(contagens_por_prova: list[dict[str, int]]) -> dict[str, int]:
    """RN-003: media das provas por disciplina, arredondada pelo maior resto para somar 90.

    Empate de resto -> ordem alfabetica do slug (determinismo).
    """
    if not contagens_por_prova:
        return {}
    n = len(contagens_por_prova)
    disciplinas = sorted({d for contagem in contagens_por_prova for d in contagem})
    medias = {d: Fraction(sum(c.get(d, 0) for c in contagens_por_prova), n) for d in disciplinas}
    alvo = {d: int(m) for d, m in medias.items()}
    faltam = TOTAL_QUESTOES - sum(alvo.values())
    por_resto = sorted(disciplinas, key=lambda d: (-(medias[d] - alvo[d]), d))
    for d in por_resto[:faltam]:
        alvo[d] += 1
    return alvo


def contagens_por_prova(sessao: Session) -> list[dict[str, int]]:
    """Questoes por disciplina principal em cada prova (todas as 90, inclusive anuladas)."""
    por_prova: dict[int, Counter] = {}
    for ano, disciplina in sessao.execute(select(Questao.prova_ano, Questao.disciplina)):
        por_prova.setdefault(ano, Counter())[disciplina] += 1
    return [dict(c) for _, c in sorted(por_prova.items())]


def _assuntos_catalogo(
    taxonomia: Taxonomia | None, disciplina: Disciplina, por_assunto: Counter
) -> list[AssuntoCatalogo]:
    if taxonomia is None:
        return []
    return [
        AssuntoCatalogo(
            slug=a.slug, nome=a.nome, total_questoes=por_assunto[(disciplina.value, a.slug)]
        )
        for a in taxonomia.assuntos(disciplina)
    ]


def obter_catalogo(sessao: Session, taxonomia: Taxonomia | None) -> CatalogoResponse:
    provas = sessao.scalars(select(Prova).order_by(Prova.ano.desc())).all()
    # Questoes nao anuladas por (disciplina, assunto): uma consulta serve as duas contagens
    por_assunto = Counter(
        (disciplina, assunto)
        for disciplina, assunto in sessao.execute(
            select(Questao.disciplina, Questao.assunto).where(Questao.anulada.is_(False))
        )
    )
    validas: Counter = Counter()
    for (disciplina, _assunto), n in por_assunto.items():
        validas[disciplina] += n
    total = sum(validas.values())
    disciplinas = sorted(
        (
            DisciplinaCatalogo(
                slug=d,
                nome=NOMES_DISCIPLINAS[d],
                total_questoes=validas.get(d, 0),
                assuntos=_assuntos_catalogo(taxonomia, d, por_assunto),
            )
            for d in Disciplina
        ),
        key=lambda d: d.nome,
    )
    return CatalogoResponse(
        provas=[
            ProvaCatalogo(
                ano=p.ano, versao=p.versao, total_questoes=p.total_questoes,
                url_prova=p.url_prova, url_gabarito=p.url_gabarito,
            )
            for p in provas
        ],
        disciplinas=disciplinas,
        total_questoes=total,
        distribuicao_completa=distribuicao_completa(contagens_por_prova(sessao)),
        completa_disponivel=total >= TOTAL_QUESTOES,
    )


def obter_vitrine(sessao: Session) -> VitrineResponse:
    """Totais da base para a apresentacao, publicos (CR-007): os mesmos numeros do catalogo."""
    total = sessao.scalar(
        select(func.count()).select_from(Questao).where(Questao.anulada.is_(False))
    )
    anos = sessao.scalars(select(Prova.ano).order_by(Prova.ano)).all()
    return VitrineResponse(total_questoes=total, anos=list(anos))
