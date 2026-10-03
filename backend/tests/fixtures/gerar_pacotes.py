"""Pacotes sinteticos validos (anos ficticios 2098/2099) para testes e dev local.

Deterministicos por codigo. Cobrem: as 8 disciplinas, anuladas, textos-base (um com
figura), disciplinas secundarias, figuras no enunciado e em alternativa, e um assunto
por questao da taxonomia sintetica (3 temas por disciplina, gravada em assuntos.yaml).
Gravam tambem as notas de corte sinteticas de cada ano (notas_corte/AAAA.yaml, CR-010).
Os vestibulares tem 90 questoes; o simulado oficial sintetico `2099s1` (CR-011), 80. Os
testes so recebem o simulado quando pedem (`simulados=`); o dev local o recebe sempre.

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
from app.pacote.notas_corte import (
    DIRETORIO_NOTAS_CORTE,
    CarreiraCorte,
    Modalidade,
    NotasCorteAno,
    salvar_ano,
)
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


# codigo, nome e (vagas, convocados, corte, maximo) de ac, ep e ppi
CARREIRAS_SINTETICAS = (
    (101, "Ciências Biológicas (São Paulo)", (40, 120, 60, 80), (20, 70, 45, 70), (10, 30, 33, 60)),
    (102, "Medicina (São Paulo, Ribeirão Preto)", (100, 400, 79, 88), (40, 160, 71, 86), (20, 80, 60, 83)),
    (103, "Música (Ribeirão Preto)", (15, 40, 27, 70), (8, 10, 27, 55), (4, 0, None, None)),
    (104, "Física (São Carlos)", (30, 90, 27, 75), (12, 30, 27, 60), (6, 12, 27, 50)),
)


def notas_corte_sinteticas(ano: int) -> NotasCorteAno:
    """Cortes publicados com uma modalidade sem convocados; o corte muda um pouco com o ano."""
    ajuste = ano % 3

    def modalidade(vagas, convocados, corte, maximo) -> Modalidade:
        return Modalidade(
            vagas=vagas,
            convocados=convocados,
            corte=None if corte is None else corte + ajuste,
            maximo=maximo,
        )

    return NotasCorteAno(
        ano=ano,
        status="publicada",
        fonte=f"https://www.fuvest.br/wp-content/uploads/fuvest_{ano}_notas_de_corte.pdf",
        pendencias=[],
        carreiras=[
            CarreiraCorte(codigo=codigo, nome=nome, ac=modalidade(*ac), ep=modalidade(*ep), ppi=modalidade(*ppi))
            for codigo, nome, ac, ep, ppi in CARREIRAS_SINTETICAS
        ],
    )


def escrever_notas_corte(destino: Path, anos: tuple[int, ...] = (2098, 2099)) -> list[Path]:
    caminhos = []
    for ano in anos:
        caminho = destino / DIRETORIO_NOTAS_CORTE / f"{ano}.yaml"
        salvar_ano(notas_corte_sinteticas(ano), caminho)
        caminhos.append(caminho)
    return caminhos


def _disciplinas_por_numero(rng: random.Random, total: int) -> list[Disciplina]:
    ordem = list(Disciplina)
    # 90 = 2 disciplinas com 12 questoes + 6 com 11; 80 = 10 por disciplina
    if total == 90:
        distribuicao = [d for i, d in enumerate(ordem) for _ in range(12 if i < 2 else 11)]
    else:
        distribuicao = [d for d in ordem for _ in range(total // len(ordem))]
    rng.shuffle(distribuicao)
    return distribuicao


def gerar_pacote(ano: int, edicao: int | None = None) -> PacoteProva:
    """Vestibular de 90 questoes ou, com `edicao`, simulado oficial de 80 (CR-011)."""
    total = 90 if edicao is None else 80
    rng = random.Random(ano if edicao is None else ano * 10 + edicao)
    disciplinas = _disciplinas_por_numero(rng, total)
    anuladas = set(rng.sample(range(1, total + 1), 1 + ano % 2))
    texto_base_de = {n: tb for tb, numeros in TEXTOS_BASE.items() for n in numeros}
    origem = f"FUVEST {ano}" if edicao is None else f"Simulado FUVEST {ano}, {edicao}ª edição"

    questoes = []
    for numero in range(1, total + 1):
        disciplina = disciplinas[numero - 1]
        enunciado = [
            Bloco(texto=f"Questão sintética {numero} de {NOMES_DISCIPLINAS[disciplina]} "
                        f"({origem}).\nSegunda linha do enunciado.")
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
    codigo = f"{ano}" if edicao is None else f"{ano}s{edicao}"
    return PacoteProva(
        ano=ano,
        tipo="vestibular" if edicao is None else "simulado",
        edicao=edicao,
        versao="V1" if edicao is None else "S1",
        total_questoes=total,
        status="publicada",
        fonte=Fonte(
            url_prova=f"https://exemplo.test/{codigo}/prova.pdf",
            url_gabarito=f"https://exemplo.test/{codigo}/gabarito.pdf",
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


def escrever_pacotes(
    destino: Path,
    anos: tuple[int, ...] = (2098, 2099),
    simulados: tuple[tuple[int, int], ...] = (),
) -> list[Path]:
    """Um diretorio por prova: os vestibulares de `anos` e os simulados (ano, edicao)."""
    escrever_taxonomia(destino)
    escrever_notas_corte(destino, anos)
    diretorios = []
    for ano, edicao in [(a, None) for a in anos] + list(simulados):
        pacote = gerar_pacote(ano, edicao)
        dir_prova = destino / pacote.codigo
        salvar_pacote(pacote, dir_prova)
        (dir_prova / DIR_FIGURAS).mkdir(exist_ok=True)
        for nome in figuras_referenciadas(pacote):
            (dir_prova / DIR_FIGURAS / nome).write_bytes(_webp_placeholder(nome))
        diretorios.append(dir_prova)
    return diretorios


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("uso: python -m tests.fixtures.gerar_pacotes <diretorio-destino>")
    for d in escrever_pacotes(Path(sys.argv[1]), simulados=((2099, 1),)):
        print(f"gerado: {d}")
