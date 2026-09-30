"""Parser de prova da familia 2025 (specs/01-ingestao.md §2.4, ADR-003).

Layout (FUVEST 2025, V1): A4; cabecalho acima de y=35; duas colunas separadas no
meio da pagina, com trechos em largura total em algumas paginas; numero da
questao com 2 digitos em 13pt; alternativas "(A)".."(E)"; textos-base
introduzidos por "TEXTO PARA AS QUESTOES ...".

Tambem cobre 2020 e 2022-2024 (T-028): muda so a fonte do numero da questao
(Gadugi-Bold/Gadugi,Bold, Arial, BrandonGrotesque-Black) e o "#####" no fim de
cada questao, que so existe a partir de 2025 (sem ele, o proximo marcador fecha
a questao).

O que nao da para extrair com seguranca vira pendencia na questao (V08), para o
curador resolver no prova.yaml: nada e descartado em silencio.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber

from app.pacote.schema import LETRAS, Alternativa, Bloco, Questao, TextoBase
from ingestao.figuras import para_webp
from ingestao.layouts.base import ResultadoExtracao
from ingestao.pdf_util import Linha, juntar_linhas, limpar_texto, renderizar_pagina

TOPO = 35.0  # abaixo do cabecalho "Concurso Vestibular FUVEST 2025 – Prova V1"
BASE = 805.0  # acima do fio do rodape
VAO_SEGMENTO = 15.0  # vao horizontal que separa trechos de colunas diferentes
TOLERANCIA_LINHA = 3.0
TAMANHO_MINIMO = 7.5  # abaixo disso: indice/expoente
MARGEM_FIGURA = 2.0
ESCALA = 2.0
MIN_VETORES = 3  # objetos vetoriais numa questao a partir do qual vira pendencia

# Alertas viram pendencias agrupadas por tipo e pagina: "rotulo na pagina P, y≈A, B: acao"
FONTE_PEQUENA = "Índice/expoente em fonte pequena"
SIMBOLOS = "Texto com símbolos não extraídos (fórmula?)"
SUBLINHADO = "Texto sublinhado"
ACOES = {
    FONTE_PEQUENA: "conferir o texto",
    SIMBOLOS: "recortar como figura",
    SUBLINHADO: "formatação perdida no texto puro",
}

TEXTO_BASE = re.compile(r"^TEXTO PARA AS QUEST(?:ÕES|OES|ÃO|AO)\b", re.IGNORECASE)
ALTERNATIVA = re.compile(r"^\(([A-E])\)\s*")
CID = re.compile(r"\(cid:(\d+)\)")


@dataclass
class Elemento:
    pagina: int
    tipo: str  # linha | marcador | imagem | separador | texto_base | alerta | vetor
    lado: str  # esq | dir | total
    x0: float
    top: float
    x1: float
    bottom: float
    texto: str = ""
    numero: int = 0
    numeros: list[int] = field(default_factory=list)
    x_direita: float = 0.0

    def bbox(self) -> tuple[float, float, float, float]:
        return (self.x0, self.top, self.x1, self.bottom)


def numeros_texto_base(cabecalho: str) -> list[int]:
    """'... 10 E 11' -> [10, 11]; '... DE 27 A 29' -> [27, 28, 29]; '10, 11 E 12' -> [10, 11, 12]."""
    numeros = [int(n) for n in re.findall(r"\d+", cabecalho)]
    if len(numeros) == 2 and re.search(r"\d+\s+A\s+\d+", cabecalho, re.IGNORECASE):
        return list(range(numeros[0], numeros[1] + 1))
    return numeros


def _lado(x0: float, x1: float, meio: float) -> str:
    if x0 < meio - 10 and x1 > meio + 10:
        return "total"
    return "esq" if (x0 + x1) / 2 < meio else "dir"


def _dentro(obj: dict, caixas: list[tuple], margem: float = MARGEM_FIGURA) -> bool:
    cx, cy = (obj["x0"] + obj["x1"]) / 2, (obj["top"] + obj["bottom"]) / 2
    return any(
        x0 - margem <= cx <= x1 + margem and t - margem <= cy <= b + margem
        for x0, t, x1, b in caixas
    )


def _agrupar_em_linhas(palavras: list[dict]) -> list[list[dict]]:
    linhas: list[list[dict]] = []
    for palavra in sorted(palavras, key=lambda w: (round(w["top"]), w["x0"])):
        if linhas and abs(palavra["top"] - linhas[-1][0]["top"]) <= TOLERANCIA_LINHA:
            linhas[-1].append(palavra)
        else:
            linhas.append([palavra])
    return [sorted(linha, key=lambda w: w["x0"]) for linha in linhas]


def _segmentos(linha: list[dict], meio: float) -> list[list[dict]]:
    segmentos = [[linha[0]]]
    for anterior, atual in zip(linha, linha[1:]):
        vao = atual["x0"] - anterior["x1"]
        cruza_meio = anterior["x1"] <= meio <= atual["x0"]
        if vao > VAO_SEGMENTO or (cruza_meio and vao > 5):
            segmentos.append([atual])
        else:
            segmentos[-1].append(atual)
    return segmentos


def _alerta(pagina: int, top: float, rotulo: str) -> Elemento:
    return Elemento(pagina, "alerta", "esq", 0, top, 0, top, texto=rotulo)


def _elementos_de_texto(pagina: int, palavras: list[dict], meio: float) -> list[Elemento]:
    elementos = []
    for linha in _agrupar_em_linhas(palavras):
        for segmento in _segmentos(linha, meio):
            normais = [w for w in segmento if w["size"] >= TAMANHO_MINIMO]
            if len(normais) < len(segmento):
                elementos.append(_alerta(pagina, segmento[0]["top"], FONTE_PEQUENA))
            if not normais:
                continue
            bruto = " ".join(w["text"] for w in normais)
            if any(int(c) != 3 for c in CID.findall(bruto)):
                elementos.append(_alerta(pagina, segmento[0]["top"], SIMBOLOS))
            texto = limpar_texto(bruto)
            if not texto:
                continue
            x0, x1 = normais[0]["x0"], normais[-1]["x1"]
            top = min(w["top"] for w in normais)
            bottom = max(w["bottom"] for w in normais)
            lado = _lado(x0, x1, meio)
            if texto == "#####":
                elementos.append(Elemento(pagina, "separador", lado, x0, top, x1, bottom))
            elif TEXTO_BASE.match(texto):
                elementos.append(Elemento(pagina, "texto_base", lado, x0, top, x1, bottom,
                                          texto=texto, numeros=numeros_texto_base(texto)))
            else:
                elementos.append(Elemento(pagina, "linha", lado, x0, top, x1, bottom, texto=texto))
    return elementos


def _elementos_vetoriais(page, pagina: int, palavras: list[dict], imagens: list[tuple],
                         meio: float) -> list[Elemento]:
    elementos = []
    for obj in page.rects + page.lines + page.curves:
        largura, altura = obj["x1"] - obj["x0"], obj["bottom"] - obj["top"]
        if not (TOPO <= obj["top"] and obj["bottom"] <= BASE):
            continue
        if largura > 0.8 * float(page.width) or altura > 0.5 * float(page.height):
            continue  # fios do cabecalho/rodape e divisor de colunas
        if _dentro(obj, imagens):
            continue
        if altura <= 1.5 and largura > 150:
            continue  # fio separador entre questoes
        if altura <= 1.5:
            sublinha = any(
                obj["top"] - 3 <= w["bottom"] <= obj["top"] + 1.5
                and w["x0"] < obj["x1"] and w["x1"] > obj["x0"]
                for w in palavras
            )
            if sublinha:
                elementos.append(_alerta(pagina, obj["top"], SUBLINHADO))
                continue
        lado = _lado(obj["x0"], obj["x1"], meio)
        elementos.append(Elemento(pagina, "vetor", lado, obj["x0"], obj["top"], obj["x1"],
                                  obj["bottom"]))
    return elementos


def _posicao(e: Elemento) -> float:
    # Imagem pelo centro vertical: a de uma alternativa costuma comecar um pouco
    # acima do rotulo "(A)" e, pelo topo, cairia antes dele (Q60 de 2025)
    return (e.top + e.bottom) / 2 if e.tipo == "imagem" else e.top


def _ordem_de_leitura(elementos: list[Elemento]) -> list[Elemento]:
    """Faixas de duas colunas (esquerda inteira, depois direita) entre elementos de largura total."""
    totais = sorted((e for e in elementos if e.lado == "total"), key=lambda e: e.top)
    colunas = [e for e in elementos if e.lado != "total"]
    saida, inicio = [], float("-inf")
    for limite in [*totais, None]:
        fim = limite.top if limite else float("inf")
        faixa = [e for e in colunas if inicio <= e.top < fim]
        for lado in ("esq", "dir"):
            saida += sorted((e for e in faixa if e.lado == lado), key=_posicao)
        if limite:
            saida.append(limite)
            inicio = limite.top
    return saida


def _elementos_da_pagina(page, pagina: int) -> list[Elemento]:
    meio = float(page.width) / 2
    imagens = [
        (i["x0"], i["top"], i["x1"], i["bottom"])
        for i in page.images
        if i["x1"] - i["x0"] >= 10 and i["bottom"] - i["top"] >= 10 and i["bottom"] > TOPO
    ]
    palavras = [
        w for w in page.extract_words(extra_attrs=["fontname", "size"])
        if TOPO <= w["top"] and w["bottom"] <= BASE
    ]
    # Numero da questao: 2 digitos em 12-14pt (a fonte muda de ano para ano)
    marcadores = [
        w for w in palavras
        if w["text"].isdigit() and len(w["text"]) == 2 and 12 <= w["size"] <= 14
    ]
    chaves = [w for w in palavras if w["text"] in "{}" and w["size"] < TAMANHO_MINIMO + 1]
    texto = [
        w for w in palavras
        if w not in marcadores and w not in chaves and not _dentro(w, imagens)
    ]

    elementos = [
        Elemento(pagina, "marcador", _lado(w["x0"], w["x1"], meio), w["x0"], w["top"], w["x1"],
                 w["bottom"], numero=int(w["text"]))
        for w in marcadores
    ]
    elementos += [
        Elemento(pagina, "imagem", _lado(x0, x1, meio), x0, t, x1, b) for x0, t, x1, b in imagens
    ]
    elementos += _elementos_de_texto(pagina, texto, meio)
    elementos += _elementos_vetoriais(page, pagina, texto, imagens, meio)

    # Borda direita de cada coluna (para distinguir linha cheia de linha curta)
    for lado in ("esq", "dir", "total"):
        linhas = [e for e in elementos if e.tipo == "linha" and e.lado == lado]
        borda = max((e.x1 for e in linhas), default=float(page.width) - 34)
        for e in linhas:
            e.x_direita = borda
    return _ordem_de_leitura(elementos)


@dataclass
class _Bruto:
    """Itens (em ordem de leitura) de uma questao ou texto-base antes da montagem."""

    itens: list[Elemento] = field(default_factory=list)
    numeros: list[int] = field(default_factory=list)  # so texto-base


def _segmentar(elementos: list[Elemento]) -> tuple[dict[int, _Bruto], list[_Bruto]]:
    questoes: dict[int, _Bruto] = {}
    textos_base: list[_Bruto] = []
    alvo: _Bruto | None = None
    for e in elementos:
        if e.tipo == "marcador":
            alvo = questoes.setdefault(e.numero, _Bruto())
        elif e.tipo == "texto_base":
            alvo = _Bruto(numeros=e.numeros)
            textos_base.append(alvo)
        elif e.tipo == "separador":
            alvo = None
        elif alvo is not None:
            alvo.itens.append(e)
    return questoes, textos_base


def _linha(e: Elemento, texto: str | None = None) -> Linha:
    return Linha(texto if texto is not None else e.texto, e.x0, e.x1, e.top, e.bottom, e.x_direita)


def _uniao(caixas: list[tuple]) -> tuple:
    return (min(c[0] for c in caixas), min(c[1] for c in caixas),
            max(c[2] for c in caixas), max(c[3] for c in caixas))


class _Montador:
    def __init__(self) -> None:
        self.recortes: dict[str, tuple[int, tuple]] = {}  # nome -> (pagina, bbox)

    def _figura(self, nome: str, e: Elemento | list[Elemento]) -> str:
        itens = e if isinstance(e, list) else [e]
        self.recortes[nome] = (itens[0].pagina, _uniao([i.bbox() for i in itens]))
        return nome

    def blocos(self, itens: list[Elemento], prefixo: str) -> list[Bloco]:
        blocos: list[Bloco] = []
        linhas: list[Linha] = []
        for e in itens:
            if e.tipo == "linha":
                linhas.append(_linha(e))
            elif e.tipo == "imagem":
                if linhas:
                    blocos.append(Bloco(texto=juntar_linhas(linhas, e.x_direita)))
                    linhas = []
                k = sum(1 for b in blocos if b.figura) + 1
                blocos.append(Bloco(figura=self._figura(f"{prefixo}-{k}.webp", e)))
        if linhas:
            blocos.append(Bloco(texto=juntar_linhas(linhas, 0)))
        return blocos

    @staticmethod
    def pendencias(itens: list[Elemento]) -> list[str]:
        grupos: dict[tuple[str, int], list[int]] = {}
        for e in itens:
            if e.tipo == "alerta":
                grupos.setdefault((e.texto, e.pagina), []).append(round(e.top))
        pendencias = [
            f"{rotulo} na página {pagina}, y≈{', '.join(map(str, sorted(set(ys))))}: "
            f"{ACOES[rotulo]}"
            for (rotulo, pagina), ys in grupos.items()
        ]
        vetores = [e for e in itens if e.tipo == "vetor"]
        for pagina in sorted({v.pagina for v in vetores}):
            da_pagina = [v for v in vetores if v.pagina == pagina]
            if len(da_pagina) >= MIN_VETORES:
                y0 = round(min(v.top for v in da_pagina))
                y1 = round(max(v.bottom for v in da_pagina))
                pendencias.append(
                    f"Possível figura vetorial (tabela/gráfico) na página {pagina}, y≈{y0}–{y1}"
                )
        textos = [e.texto for e in itens if e.tipo == "linha"]
        if any("�" in t for t in textos):
            pendencias.append("Texto com caractere inválido (\\ufffd): conferir a codificação")
        return pendencias

    def questao(self, numero: int, bruto: _Bruto) -> Questao:
        conteudo = [e for e in bruto.itens if e.tipo in ("linha", "imagem")]
        inicios: dict[str, int] = {}
        for i, e in enumerate(conteudo):
            proxima = LETRAS[len(inicios)] if len(inicios) < len(LETRAS) else None
            m = ALTERNATIVA.match(e.texto) if e.tipo == "linha" else None
            if proxima and m and m.group(1) == proxima:
                inicios[proxima] = i

        fim_enunciado = min(inicios.values(), default=len(conteudo))
        enunciado = self.blocos(conteudo[:fim_enunciado], f"q{numero:03d}")
        limites = [*sorted(inicios.values()), len(conteudo)]
        alternativas = {}
        for letra, (ini, fim) in zip(inicios, zip(limites, limites[1:])):
            itens = conteudo[ini:fim]
            linhas = [
                _linha(e, ALTERNATIVA.sub("", e.texto) if j == 0 else None)
                for j, e in enumerate(itens) if e.tipo == "linha"
            ]
            linhas = [linha for linha in linhas if linha.texto]
            imagens = [e for e in itens if e.tipo == "imagem"]
            texto = juntar_linhas(linhas, 0) if linhas else None
            figura = self._figura(f"q{numero:03d}-{letra.lower()}.webp", imagens) if imagens else None
            alternativas[letra] = (
                Alternativa(texto=texto, figura=figura) if (texto or figura) else Alternativa(texto="")
            )

        pendencias = self.pendencias(bruto.itens)
        if len(alternativas) < len(LETRAS):
            pendencias.append(f"Só {len(alternativas)} alternativa(s) detectada(s)")
        if not enunciado:
            pendencias.append("Enunciado vazio")
        return Questao(numero=numero, enunciado=enunciado, alternativas=alternativas,
                       pendencias=pendencias)


class ParserLayout2025:
    nome = "familia_2025"

    def extrair(self, pdf_path: Path) -> ResultadoExtracao:
        with pdfplumber.open(pdf_path) as pdf:
            elementos = [
                e for n, page in enumerate(pdf.pages, start=1) for e in _elementos_da_pagina(page, n)
            ]
        brutos_q, brutos_tb = _segmentar(elementos)

        montador = _Montador()
        questoes = {n: montador.questao(n, b) for n, b in sorted(brutos_q.items())}
        textos_base = []
        for i, bruto in enumerate(brutos_tb, start=1):
            tb_id = f"tb{i:02d}"
            conteudo = montador.blocos(bruto.itens, tb_id)
            textos_base.append(TextoBase(id=tb_id, questoes=bruto.numeros,
                                         conteudo=conteudo or [Bloco(texto="")]))
            referenciadas = [questoes[n] for n in bruto.numeros if n in questoes]
            for q in referenciadas:
                q.texto_base = tb_id
            if referenciadas:
                referenciadas[0].pendencias += [
                    f"Texto-base {tb_id}: {p}" for p in montador.pendencias(bruto.itens)
                ]

        return ResultadoExtracao(
            questoes=list(questoes.values()),
            textos_base=textos_base,
            figuras=_renderizar(pdf_path, montador.recortes),
        )


def _renderizar(pdf_path: Path, recortes: dict[str, tuple[int, tuple]]) -> dict[str, bytes]:
    figuras: dict[str, bytes] = {}
    for pagina in sorted({p for p, _ in recortes.values()}):
        imagem = renderizar_pagina(pdf_path, pagina, ESCALA)
        largura, altura = imagem.width / ESCALA, imagem.height / ESCALA
        for nome, (p, (x0, t, x1, b)) in recortes.items():
            if p != pagina:
                continue
            caixa = (max(0, x0 - MARGEM_FIGURA), max(0, t - MARGEM_FIGURA),
                     min(largura, x1 + MARGEM_FIGURA), min(altura, b + MARGEM_FIGURA))
            figuras[nome] = para_webp(imagem.crop(tuple(round(c * ESCALA) for c in caixa)))
    return figuras
