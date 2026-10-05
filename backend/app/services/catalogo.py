"""Catalogo da base e distribuicao da prova completa (RF-008, RN-003)."""

from collections import Counter
from fractions import Fraction

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.disciplinas import NOMES_DISCIPLINAS, Disciplina
from app.models import Prova, Questao
from app.pacote.assuntos import Taxonomia
from app.pacote.schema import rotulo_da_prova
from app.pacote.validacao import TOTAL_PROVA_COMPLETA
from app.schemas import (
    AssuntoCatalogo,
    CatalogoResponse,
    DisciplinaCatalogo,
    ProvaCatalogo,
    VitrineResponse,
)


def distribuicao_completa(
    contagens_por_prova: list[dict[str, int]], total: int = TOTAL_PROVA_COMPLETA
) -> dict[str, int]:
    """RN-003: media, entre as provas, da proporcao de cada disciplina, vezes o total da
    Prova completa (80 desde o CR-011), arredondada pelo maior resto para somar o total.

    Proporcao, e nao contagem: as provas tem 90 (ate 2026) ou 80 questoes (desde 2027).
    Empate de resto -> ordem alfabetica do slug (determinismo).
    """
    # (contagem, total da prova); prova sem questoes nao tem proporcao (protege a divisao)
    provas = [(c, sum(c.values())) for c in contagens_por_prova]
    provas = [(c, n) for c, n in provas if n > 0]
    if not provas:
        return {}
    disciplinas = sorted({d for contagem, _ in provas for d in contagem})
    medias = {
        d: sum((Fraction(c.get(d, 0), n) for c, n in provas), Fraction(0)) * total / len(provas)
        for d in disciplinas
    }
    alvo = {d: int(m) for d, m in medias.items()}
    faltam = total - sum(alvo.values())
    por_resto = sorted(disciplinas, key=lambda d: (-(medias[d] - alvo[d]), d))
    for d in por_resto[:faltam]:
        alvo[d] += 1
    return alvo


def contagens_por_prova(sessao: Session) -> list[dict[str, int]]:
    """Questoes por disciplina principal em cada prova (todas, inclusive anuladas: o
    formato real da prova)."""
    por_prova: dict[str, Counter] = {}
    for codigo, disciplina in sessao.execute(select(Questao.prova_codigo, Questao.disciplina)):
        por_prova.setdefault(codigo, Counter())[disciplina] += 1
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
    # Ano decrescente; no mesmo ano, codigo decrescente (2027s2, 2027s1)
    provas = sessao.scalars(select(Prova).order_by(Prova.ano.desc(), Prova.codigo.desc())).all()
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
                codigo=p.codigo, ano=p.ano, tipo=p.tipo, edicao=p.edicao,
                rotulo=rotulo_da_prova(p.ano, p.edicao), versao=p.versao,
                total_questoes=p.total_questoes, url_prova=p.url_prova, url_gabarito=p.url_gabarito,
            )
            for p in provas
        ],
        disciplinas=disciplinas,
        total_questoes=total,
        distribuicao_completa=distribuicao_completa(contagens_por_prova(sessao)),
        completa_disponivel=total >= TOTAL_PROVA_COMPLETA,
    )


def obter_vitrine(sessao: Session) -> VitrineResponse:
    """Totais da base para a apresentacao, publicos (CR-007): os mesmos numeros do catalogo.

    As questoes dos simulados oficiais entram no total; `anos` e so dos vestibulares (CR-011,
    P4): a apresentacao conta provas e periodo dos vestibulares."""
    total = sessao.scalar(
        select(func.count()).select_from(Questao).where(Questao.anulada.is_(False))
    )
    anos = sessao.scalars(
        select(Prova.ano).where(Prova.tipo == "vestibular").distinct().order_by(Prova.ano)
    ).all()
    return VitrineResponse(total_questoes=total, anos=list(anos))
