"""Utilitarios de PDF comuns a todas as familias de layout (ADR-003).

Coordenadas sempre em pontos PDF com origem no topo-esquerdo (convencao do
pdfplumber): bbox = (x0, top, x1, bottom). Paginas numeradas a partir de 1.
"""

import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image

BBox = tuple[float, float, float, float]

_CID_ESPACO = re.compile(r"\(cid:3\)")
_CID_OUTROS = re.compile(r"\(cid:\d+\)")
_ESPACOS = re.compile(r"[ \t]+")


@dataclass(frozen=True)
class Linha:
    texto: str
    x0: float
    x1: float
    top: float
    bottom: float


def limpar_texto(texto: str) -> str:
    """Remove artefatos de fonte (`(cid:N)`, ex.: prova de 2015) e normaliza espacos."""
    texto = _CID_ESPACO.sub(" ", texto)
    texto = _CID_OUTROS.sub("", texto)
    return _ESPACOS.sub(" ", texto).strip()


def juntar_linhas(linhas: list[Linha], x_direita: float, tolerancia: float = 15.0) -> str:
    """Monta texto corrido a partir das linhas de uma coluna.

    - linha que chega a margem direita continua na seguinte (espaco);
    - linha curta (verso, fim de paragrafo) ou espaco vertical grande quebram a linha;
    - hifenizacao de fim de linha e desfeita ("pala-" + "vra"); palavra composta
      quebrada no hifen, que a tipografia repete ("bem-" + "-estar"), fica com um hifen.
    """
    if not linhas:
        return ""
    partes = [linhas[0].texto]
    for anterior, atual in zip(linhas, linhas[1:]):
        altura = anterior.bottom - anterior.top
        cheia = anterior.x1 >= x_direita - tolerancia
        if atual.top - anterior.bottom > 0.8 * altura or not cheia:
            partes.append("\n" + atual.texto)
        elif anterior.texto.endswith("-") and atual.texto.startswith("-"):
            partes.append(atual.texto[1:])
        elif anterior.texto.endswith("-") and atual.texto[:1].islower():
            partes[-1] = partes[-1][:-1]
            partes.append(atual.texto)
        elif anterior.texto.endswith("-"):
            partes.append(atual.texto)
        else:
            partes.append(" " + atual.texto)
    return "".join(partes)


def numero_paginas(pdf_path: Path) -> int:
    with pdfplumber.open(pdf_path) as pdf:
        return len(pdf.pages)


def tamanho_pagina(pdf_path: Path, pagina: int) -> tuple[float, float]:
    with pdfplumber.open(pdf_path) as pdf:
        p = pdf.pages[pagina - 1]
        return round(float(p.width), 2), round(float(p.height), 2)


def linhas_da_regiao(pdf_path: Path, pagina: int, bbox: BBox) -> list[Linha]:
    with pdfplumber.open(pdf_path) as pdf:
        regiao = pdf.pages[pagina - 1].crop(bbox)
        linhas = []
        for bruta in regiao.extract_text_lines():
            texto = limpar_texto(bruta["text"])
            if texto:
                linhas.append(
                    Linha(texto, bruta["x0"], bruta["x1"], bruta["top"], bruta["bottom"])
                )
        return linhas


def renderizar_pagina(pdf_path: Path, pagina: int, escala: float = 2.0) -> Image.Image:
    documento = pdfium.PdfDocument(pdf_path)
    try:
        return documento[pagina - 1].render(scale=escala).to_pil()
    finally:
        documento.close()


def renderizar_regiao(pdf_path: Path, pagina: int, bbox: BBox, escala: float = 2.0) -> Image.Image:
    """Recorta a regiao da pagina renderizada (a 2x = 144 dpi): funciona igual para
    imagens embutidas e para figuras vetoriais."""
    imagem = renderizar_pagina(pdf_path, pagina, escala)
    return imagem.crop(tuple(round(c * escala) for c in bbox))
