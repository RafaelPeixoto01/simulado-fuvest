"""Sincroniza os pacotes do repositorio com o banco (ADR-002, specs/01 §2.4).

O banco e um indice derivado de data/provas: depois de sincronizar, ele contem
exatamente os pacotes publicados e validos. Idempotente e em uma transacao.

Uso no start do container: `python -m app.pacote.sincronizar`
"""

import logging
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao
from app.models import Prova, Questao, TextoBase
from app.pacote.leitura import DIR_FIGURAS, PacoteInvalido, carregar_pacote, listar_pacotes
from app.pacote.schema import Alternativa, Bloco, PacoteProva
from app.pacote.validacao import TOTAL_QUESTOES, validar_pacote

log = logging.getLogger("sincronizar")


@dataclass
class ResumoSincronizacao:
    sincronizadas: list[int] = field(default_factory=list)
    ignoradas: dict[str, str] = field(default_factory=dict)  # diretorio -> motivo
    removidas: list[int] = field(default_factory=list)


def _selecionar(
    data_dir: Path, incluir_rascunhos: bool, resumo: ResumoSincronizacao
) -> dict[int, PacoteProva]:
    selecionados: dict[int, PacoteProva] = {}
    for dir_prova in listar_pacotes(data_dir):
        nome = dir_prova.name
        try:
            pacote = carregar_pacote(dir_prova)
        except PacoteInvalido as erro:
            resumo.ignoradas[nome] = f"YAML inválido: {erro.detalhe}"
            log.error("%s ignorado: YAML inválido", nome)
            continue
        if nome != str(pacote.ano):
            resumo.ignoradas[nome] = f"diretório {nome} não corresponde ao ano {pacote.ano}"
            log.error("%s ignorado: %s", nome, resumo.ignoradas[nome])
            continue
        bloqueantes = [
            p for p in validar_pacote(pacote, dir_prova / DIR_FIGURAS) if p.bloqueante
        ]
        publicada = pacote.status == "publicada"
        if bloqueantes:
            resumo.ignoradas[nome] = f"{len(bloqueantes)} pendência(s) bloqueante(s)"
            # Publicada com pendencia nao deveria passar do CI; rascunho incompleto e normal
            log.log(logging.ERROR if publicada else logging.INFO, "%s ignorado: %s",
                    nome, resumo.ignoradas[nome])
            continue
        if not publicada and not incluir_rascunhos:
            resumo.ignoradas[nome] = "rascunho (não publicado)"
            continue
        selecionados[pacote.ano] = pacote
    return selecionados


def _bloco(bloco: Bloco | Alternativa) -> dict:
    return bloco.model_dump(exclude_none=True)


def _gravar(sessao: Session, pacote: PacoteProva, agora: datetime) -> None:
    ano = pacote.ano
    # IDs naturais e estaveis (ADR-006): recriar o conteudo nao quebra referencias
    sessao.execute(delete(Questao).where(Questao.prova_ano == ano))
    sessao.execute(delete(TextoBase).where(TextoBase.prova_ano == ano))

    prova = sessao.get(Prova, ano) or Prova(ano=ano)
    prova.versao = pacote.versao
    prova.url_prova = str(pacote.fonte.url_prova)
    prova.url_gabarito = str(pacote.fonte.url_gabarito)
    prova.total_questoes = TOTAL_QUESTOES
    prova.sincronizado_em = agora
    sessao.add(prova)

    for tb in pacote.textos_base:
        sessao.add(
            TextoBase(
                id=f"{ano}-{tb.id}",
                prova_ano=ano,
                conteudo=[_bloco(b) for b in tb.conteudo],
            )
        )
    for q in pacote.questoes:
        sessao.add(
            Questao(
                id=f"{ano}-{q.numero:03d}",
                prova_ano=ano,
                numero=q.numero,
                texto_base_id=f"{ano}-{q.texto_base}" if q.texto_base else None,
                enunciado=[_bloco(b) for b in q.enunciado],
                alternativas={letra: _bloco(alt) for letra, alt in q.alternativas.items()},
                resposta=q.resposta,
                anulada=q.anulada,
                disciplina=q.disciplina.value,
                disciplinas_secundarias=[d.value for d in q.disciplinas_secundarias],
            )
        )


def sincronizar(
    sessao: Session, data_dir: Path, *, incluir_rascunhos: bool = False
) -> ResumoSincronizacao:
    resumo = ResumoSincronizacao()
    selecionados = _selecionar(data_dir, incluir_rascunhos, resumo)
    agora = datetime.now(UTC)
    try:
        existentes = set(sessao.scalars(select(Prova.ano)))
        for ano in sorted(existentes - selecionados.keys()):
            # ON DELETE CASCADE leva questoes e textos-base; reportes nao tem FK (ADR-006)
            sessao.delete(sessao.get(Prova, ano))
            resumo.removidas.append(ano)
        for ano in sorted(selecionados):
            _gravar(sessao, selecionados[ano], agora)
            resumo.sincronizadas.append(ano)
        sessao.commit()
    except SQLAlchemyError:
        sessao.rollback()
        raise
    return resumo


def formatar_resumo(resumo: ResumoSincronizacao) -> str:
    linhas = [
        f"Sincronizadas: {resumo.sincronizadas or 'nenhuma'}",
        f"Removidas: {resumo.removidas or 'nenhuma'}",
    ]
    linhas += [f"Ignorada {nome}: {motivo}" for nome, motivo in sorted(resumo.ignoradas.items())]
    return "\n".join(linhas)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    settings = Settings.from_env()
    fabrica = criar_fabrica_sessao(criar_engine(settings.database_url))
    try:
        with fabrica() as sessao:
            resumo = sincronizar(sessao, settings.data_dir)
    except SQLAlchemyError:
        log.exception("Falha de banco na sincronização")
        return 1
    print(formatar_resumo(resumo))
    return 0


if __name__ == "__main__":
    sys.exit(main())
