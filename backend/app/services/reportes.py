"""Reportes de erro em questoes (RF-021) e resolucao pelo curador (RF-007)."""

from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Questao, Reporte
from app.schemas import ReporteCreate


class QuestaoNaoEncontrada(Exception):
    pass


def criar_reporte(sessao: Session, dados: ReporteCreate) -> int:
    if sessao.get(Questao, dados.questao_id) is None:
        raise QuestaoNaoEncontrada(f"Questão {dados.questao_id} não está na base")
    # Nada do cliente alem do corpo e gravado (nem IP): RNF-005
    reporte = Reporte(questao_id=dados.questao_id, tipo=dados.tipo, descricao=dados.descricao)
    sessao.add(reporte)
    sessao.commit()
    return reporte.id


def listar_reportes(sessao: Session, status: str | None) -> list[Reporte]:
    consulta = select(Reporte).order_by(Reporte.criado_em, Reporte.id)
    if status:
        consulta = consulta.where(Reporte.status == status)
    return list(sessao.scalars(consulta))


@dataclass
class ResultadoResolucao:
    resolvidos: list[int] = field(default_factory=list)
    ja_resolvidos: list[int] = field(default_factory=list)
    inexistentes: list[int] = field(default_factory=list)


def resolver_reportes(sessao: Session, ids: list[int]) -> ResultadoResolucao:
    resultado = ResultadoResolucao()
    agora = datetime.now(UTC)
    for id_ in ids:
        reporte = sessao.get(Reporte, id_)
        if reporte is None:
            resultado.inexistentes.append(id_)
        elif reporte.status == "resolvido":
            resultado.ja_resolvidos.append(id_)
        else:
            reporte.status = "resolvido"
            reporte.resolvido_em = agora
            resultado.resolvidos.append(id_)
    sessao.commit()
    return resultado
