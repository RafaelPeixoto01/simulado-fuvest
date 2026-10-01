"""Regras V01-V11 que decidem se um pacote pode ser publicado (RN-007, specs/01 §2.4)."""

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from app.disciplinas import NOMES_DISCIPLINAS
from app.pacote.assuntos import Taxonomia
from app.pacote.schema import LETRAS, Alternativa, Bloco, PacoteProva

TOTAL_QUESTOES = 90
NOME_FIGURA = re.compile(r"^[a-z0-9-]+\.webp$")


@dataclass(frozen=True)
class Pendencia:
    codigo: str
    questao: int | None  # None = pendencia da prova (ou de um texto-base)
    mensagem: str
    bloqueante: bool = True


def tem_bloqueante(pendencias: list[Pendencia]) -> bool:
    return any(p.bloqueante for p in pendencias)


def _vazio(texto: str | None) -> bool:
    return texto is None or not texto.strip()


def _figuras(blocos: list[Bloco | Alternativa]) -> list[str]:
    return [b.figura for b in blocos if b.figura is not None]


def _v01_numeracao(pacote: PacoteProva) -> list[Pendencia]:
    pendencias = []
    numeros = [q.numero for q in pacote.questoes]
    if len(numeros) != TOTAL_QUESTOES:
        pendencias.append(
            Pendencia("V01", None, f"Esperadas {TOTAL_QUESTOES} questões, encontradas {len(numeros)}")
        )
    for numero, vezes in sorted(Counter(numeros).items()):
        if vezes > 1:
            pendencias.append(Pendencia("V01", numero, f"Número {numero} repetido {vezes} vezes"))
    faltando = sorted(set(range(1, TOTAL_QUESTOES + 1)) - set(numeros))
    if faltando:
        lista = ", ".join(map(str, faltando))
        pendencias.append(Pendencia("V01", None, f"Faltam as questões: {lista}"))
    return pendencias


def _validar_questoes(
    pacote: PacoteProva, existentes: set[str], taxonomia: Taxonomia | None
) -> list[Pendencia]:
    ids_textos_base = {tb.id for tb in pacote.textos_base}
    pendencias = []
    for q in pacote.questoes:
        n = q.numero

        if not q.enunciado or any(b.texto is not None and _vazio(b.texto) for b in q.enunciado):
            pendencias.append(Pendencia("V02", n, "Enunciado vazio ou com bloco de texto em branco"))

        faltando = [letra for letra in LETRAS if letra not in q.alternativas]
        vazias = [
            letra for letra, alt in q.alternativas.items() if alt.figura is None and _vazio(alt.texto)
        ]
        if faltando or vazias:
            pendencias.append(
                Pendencia("V03", n, f"Alternativas faltando {faltando} ou vazias {vazias}")
            )

        if q.anulada and q.resposta is not None:
            pendencias.append(Pendencia("V04", n, "Questão anulada não pode ter resposta"))
        if not q.anulada and q.resposta is None:
            pendencias.append(Pendencia("V04", n, "Questão sem resposta do gabarito"))

        if q.disciplina is None:
            pendencias.append(Pendencia("V05", n, "Disciplina não definida"))

        if q.assunto is None:
            pendencias.append(Pendencia("V11", n, "Assunto não definido"))
        elif (
            taxonomia is not None
            and q.disciplina is not None
            and not taxonomia.contem(q.disciplina, q.assunto)
        ):
            pendencias.append(
                Pendencia(
                    "V11",
                    n,
                    f"Assunto '{q.assunto}' não existe na taxonomia de "
                    f"{NOMES_DISCIPLINAS[q.disciplina]}",
                )
            )

        for nome in _figuras([*q.enunciado, *q.alternativas.values()]):
            if not NOME_FIGURA.match(nome) or nome not in existentes:
                pendencias.append(Pendencia("V06", n, f"Figura inválida ou inexistente: {nome}"))

        if q.texto_base is not None and q.texto_base not in ids_textos_base:
            pendencias.append(Pendencia("V07", n, f"Texto-base inexistente: {q.texto_base}"))

        for texto in q.pendencias:
            pendencias.append(Pendencia("V08", n, f"Pendência do parser: {texto}"))

        secundarias = q.disciplinas_secundarias
        if len(set(secundarias)) != len(secundarias) or q.disciplina in secundarias:
            pendencias.append(
                Pendencia("V09", n, "Disciplinas secundárias repetidas ou iguais à principal")
            )
    return pendencias


def _validar_textos_base(pacote: PacoteProva, existentes: set[str]) -> list[Pendencia]:
    pendencias = []
    for tb in pacote.textos_base:
        usam = {q.numero for q in pacote.questoes if q.texto_base == tb.id}
        if set(tb.questoes) != usam:
            pendencias.append(
                Pendencia(
                    "V07",
                    None,
                    f"{tb.id}: lista questões {sorted(tb.questoes)}, "
                    f"mas é referenciado por {sorted(usam)}",
                )
            )
        if not tb.conteudo or any(b.texto is not None and _vazio(b.texto) for b in tb.conteudo):
            pendencias.append(Pendencia("V02", None, f"{tb.id}: conteúdo vazio ou em branco"))
        for nome in _figuras(tb.conteudo):
            if not NOME_FIGURA.match(nome) or nome not in existentes:
                pendencias.append(
                    Pendencia("V06", None, f"{tb.id}: figura inválida ou inexistente: {nome}")
                )
    return pendencias


def _v10_orfas(pacote: PacoteProva, existentes: set[str]) -> list[Pendencia]:
    referenciadas = {
        nome
        for tb in pacote.textos_base
        for nome in _figuras(tb.conteudo)
    } | {
        nome
        for q in pacote.questoes
        for nome in _figuras([*q.enunciado, *q.alternativas.values()])
    }
    return [
        Pendencia("V10", None, f"Figura não referenciada: {nome}", bloqueante=False)
        for nome in sorted(existentes - referenciadas)
    ]


def validar_pacote(
    pacote: PacoteProva, dir_figuras: Path, taxonomia: Taxonomia | None
) -> list[Pendencia]:
    """Com `taxonomia=None` a V11 so confere se o assunto existe (o `extrair` usa assim: o
    rascunho recem-extraido ainda nao tem assunto). `validar`, `importar` e a sincronizacao
    passam a taxonomia carregada, e entao a V11 confere tambem a disciplina."""
    existentes = (
        {f.name for f in dir_figuras.iterdir() if f.is_file()} if dir_figuras.is_dir() else set()
    )
    return (
        _v01_numeracao(pacote)
        + _validar_questoes(pacote, existentes, taxonomia)
        + _validar_textos_base(pacote, existentes)
        + _v10_orfas(pacote, existentes)
    )


def formatar_relatorio(pacote: PacoteProva, pendencias: list[Pendencia]) -> str:
    bloqueantes = [p for p in pendencias if p.bloqueante]
    cabecalho = f"== {pacote.ano} ({pacote.status})"
    if not pendencias:
        return f"{cabecalho} — OK"
    linhas = [f"{cabecalho} — {len(bloqueantes)} pendência(s) bloqueante(s), "
              f"{len(pendencias) - len(bloqueantes)} aviso(s)"]
    for p in pendencias:
        onde = f"Q{p.questao:03d}: " if p.questao is not None else ""
        tipo = "" if p.bloqueante else "aviso "
        linhas.append(f"  {tipo}[{p.codigo}] {onde}{p.mensagem}")
    return "\n".join(linhas)
