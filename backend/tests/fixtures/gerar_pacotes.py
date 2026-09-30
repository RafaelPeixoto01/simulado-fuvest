"""Pacotes sinteticos validos (anos ficticios 2098/2099) para testes e dev local.

Deterministicos por ano. Cobrem: as 8 disciplinas, anuladas, textos-base (um com
figura), disciplinas secundarias, figuras no enunciado e em alternativa, e um assunto
por questao da taxonomia sintetica (3 temas por disciplina, gravada em assuntos.yaml).

Uso no dev local (site com dados antes de existir prova real curada):
    .venv/Scripts/python -m tests.fixtures.gerar_pacotes ../data/_cache/sinteticos
    .venv/Scripts/python -m ingestao importar --data-dir ../data/_cache/sinteticos
"""

import io
import random
import sys
from pathlib import Path

import yaml
from PIL import Image

from app.disciplinas import NOMES_DISCIPLINAS, Disciplina
from app.pacote.assuntos import ARQUIVO_TAXONOMIA, Taxonomia
from app.pacote.leitura import DIR_FIGURAS, salvar_pacote
from app.pacote.schema import LETRAS, Alternativa, Bloco, Fonte, PacoteProva, Questao, TextoBase

TEXTOS_BASE = {"tb01": [10, 11], "tb02": [30, 31, 32]}
FIGURA_TEXTO_BASE = "tb02-1.webp"
TEMAS = ("tema-a", "tema-b", "tema-c")


def taxonomia_sintetica() -> Taxonomia:
    return Taxonomia.model_validate({
        d.value: [{"slug": s, "nome": f"Tema {s[-1].upper()}"} for s in TEMAS] for d in Disciplina
    })


def escrever_taxonomia(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    texto = yaml.safe_dump(taxonomia_sintetica().model_dump(mode="json"), allow_unicode=True)
    (destino / ARQUIVO_TAXONOMIA).write_text(texto, encoding="utf-8")


def _disciplinas_por_numero(rng: random.Random) -> list[Disciplina]:
    ordem = list(Disciplina)
    # 90 = 2 disciplinas com 12 questoes + 6 com 11
    distribuicao = [d for i, d in enumerate(ordem) for _ in range(12 if i < 2 else 11)]
    rng.shuffle(distribuicao)
    return distribuicao


def gerar_pacote(ano: int) -> PacoteProva:
    rng = random.Random(ano)
    disciplinas = _disciplinas_por_numero(rng)
    anuladas = set(rng.sample(range(1, 91), 1 + ano % 2))
    texto_base_de = {n: tb for tb, numeros in TEXTOS_BASE.items() for n in numeros}

    questoes = []
    for numero in range(1, 91):
        disciplina = disciplinas[numero - 1]
        enunciado = [
            Bloco(texto=f"Questão sintética {numero} de {NOMES_DISCIPLINAS[disciplina]} "
                        f"(FUVEST {ano}).\nSegunda linha do enunciado.")
        ]
        if numero % 15 == 0:
            enunciado += [Bloco(figura=f"q{numero:03d}-1.webp"), Bloco(texto="É correto afirmar:")]
        alternativas = {
            letra: Alternativa(texto=f"Alternativa {letra} da questão {numero}")
            for letra in LETRAS
        }
        if numero == 20:
            alternativas["C"] = Alternativa(figura="q020-c.webp")
        secundarias = []
        if numero % 17 == 0:
            secundarias = [next(d for d in Disciplina if d != disciplina)]
        anulada = numero in anuladas
        questoes.append(
            Questao(
                numero=numero,
                disciplina=disciplina,
                assunto=TEMAS[numero % len(TEMAS)],
                disciplinas_secundarias=secundarias,
                texto_base=texto_base_de.get(numero),
                enunciado=enunciado,
                alternativas=alternativas,
                resposta=None if anulada else rng.choice(LETRAS),
                anulada=anulada,
            )
        )

    textos_base = [
        TextoBase(
            id=tb,
            questoes=numeros,
            conteudo=[Bloco(texto=f"Texto para as questões {' e '.join(map(str, numeros))}.")]
            + ([Bloco(figura=FIGURA_TEXTO_BASE)] if tb == "tb02" else []),
        )
        for tb, numeros in TEXTOS_BASE.items()
    ]
    return PacoteProva(
        ano=ano,
        versao="V1",
        status="publicada",
        fonte=Fonte(
            url_prova=f"https://exemplo.test/{ano}/prova.pdf",
            url_gabarito=f"https://exemplo.test/{ano}/gabarito.pdf",
            familia_layout="sintetica",
        ),
        textos_base=textos_base,
        questoes=questoes,
    )


def figuras_referenciadas(pacote: PacoteProva) -> set[str]:
    blocos = [b for tb in pacote.textos_base for b in tb.conteudo]
    for q in pacote.questoes:
        blocos += [*q.enunciado, *q.alternativas.values()]
    return {b.figura for b in blocos if b.figura}


def _webp_placeholder(nome: str) -> bytes:
    cor = sum(nome.encode()) % 256
    saida = io.BytesIO()
    Image.new("RGB", (80, 40), (cor, 120, 255 - cor)).save(saida, format="WEBP")
    return saida.getvalue()


def escrever_pacotes(destino: Path, anos: tuple[int, ...] = (2098, 2099)) -> list[Path]:
    escrever_taxonomia(destino)
    diretorios = []
    for ano in anos:
        pacote = gerar_pacote(ano)
        dir_prova = destino / str(ano)
        salvar_pacote(pacote, dir_prova)
        (dir_prova / DIR_FIGURAS).mkdir(exist_ok=True)
        for nome in figuras_referenciadas(pacote):
            (dir_prova / DIR_FIGURAS / nome).write_bytes(_webp_placeholder(nome))
        diretorios.append(dir_prova)
    return diretorios


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("uso: python -m tests.fixtures.gerar_pacotes <diretorio-destino>")
    for d in escrever_pacotes(Path(sys.argv[1])):
        print(f"gerado: {d}")
