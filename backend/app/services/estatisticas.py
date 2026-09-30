"""Contador anonimo de simulados gerados por dia e modo (metrica do PRD §2)."""

import logging
from datetime import UTC, datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import EstatisticaGeracao

log = logging.getLogger(__name__)


def registrar_geracao(sessao: Session, modo: str) -> None:
    """Falha aqui nunca derruba a geracao do simulado: so registra no log."""
    dia = datetime.now(UTC).date()
    try:
        linha = sessao.get(EstatisticaGeracao, (dia, modo))
        if linha is None:
            sessao.add(EstatisticaGeracao(dia=dia, modo=modo, total=1))
        else:
            linha.total += 1
        sessao.commit()
    except SQLAlchemyError:
        sessao.rollback()
        log.exception("Falha ao registrar estatística de geração (%s)", modo)
