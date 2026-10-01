"""Historico de simulados concluidos da conta (CR-005, ADR-011, RN-016)."""

from typing import Any

from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session

from app.models import SimuladoConcluido
from app.schemas import EntradaHistorico

LIMITE_HISTORICO = 50  # D4: o mesmo limite do navegador

_MAIS_RECENTE_PRIMEIRO = (SimuladoConcluido.finalizado_em_ms.desc(), SimuladoConcluido.id.desc())


def listar(sessao: Session, usuario_id: int) -> list[dict[str, Any]]:
    return list(sessao.scalars(
        select(SimuladoConcluido.dados)
        .where(SimuladoConcluido.usuario_id == usuario_id)
        .order_by(*_MAIS_RECENTE_PRIMEIRO)
    ))


def inserir_sem_conflito(nome_dialeto: str, linhas: list[dict[str, Any]]):
    """INSERT ... ON CONFLICT DO NOTHING: duas abas enviando a mesma entrada nao dao erro."""
    dialeto = postgresql if nome_dialeto == "postgresql" else sqlite
    return (
        dialeto.insert(SimuladoConcluido)
        .values(linhas)
        .on_conflict_do_nothing(index_elements=["usuario_id", "id"])
    )


def _id_recusado(bruta: dict[str, Any]) -> str:
    ident = bruta.get("id")
    return ident if isinstance(ident, str) and len(ident) <= 64 else "?"


def gravar(sessao: Session, usuario_id: int, entradas: list[dict[str, Any]]) -> list[str]:
    """Insere as entradas novas (as ja gravadas nao mudam: o resultado e imutavel) e mantem
    as LIMITE_HISTORICO mais recentes. Devolve os ids das entradas recusadas."""
    validas: dict[str, EntradaHistorico] = {}
    recusadas: list[str] = []
    for bruta in entradas:
        try:
            entrada = EntradaHistorico.model_validate(bruta)
        except ValidationError:
            recusadas.append(_id_recusado(bruta))
            continue
        validas.setdefault(entrada.id, entrada)

    if validas:
        sessao.execute(inserir_sem_conflito(sessao.get_bind().dialect.name, [
            {
                "usuario_id": usuario_id,
                "id": e.id,
                "finalizado_em_ms": e.finalizado_em,
                # A entrada volta como chegou: campos ausentes continuam ausentes
                "dados": e.model_dump(mode="json", by_alias=True, exclude_unset=True),
            }
            for e in validas.values()
        ]))
        excedentes = list(sessao.scalars(
            select(SimuladoConcluido.id)
            .where(SimuladoConcluido.usuario_id == usuario_id)
            .order_by(*_MAIS_RECENTE_PRIMEIRO)
            .offset(LIMITE_HISTORICO)
        ))
        if excedentes:
            sessao.execute(delete(SimuladoConcluido).where(
                SimuladoConcluido.usuario_id == usuario_id,
                SimuladoConcluido.id.in_(excedentes),
            ))
        sessao.commit()
    return recusadas


def limpar(sessao: Session, usuario_id: int) -> None:
    sessao.execute(delete(SimuladoConcluido).where(SimuladoConcluido.usuario_id == usuario_id))
    sessao.commit()
