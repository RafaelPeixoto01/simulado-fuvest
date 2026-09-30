"""Conversao das figuras para WebP otimizado (RNF-001)."""

import io

from PIL import Image

LARGURA_MAXIMA = 1200
QUALIDADE = 80


def para_webp(imagem: Image.Image, largura_max: int = LARGURA_MAXIMA) -> bytes:
    if imagem.width > largura_max:
        altura = round(imagem.height * largura_max / imagem.width)
        imagem = imagem.resize((largura_max, altura), Image.Resampling.LANCZOS)
    if imagem.mode not in ("RGB", "RGBA"):
        imagem = imagem.convert("RGB")
    saida = io.BytesIO()
    imagem.save(saida, format="WEBP", quality=QUALIDADE, method=6)
    return saida.getvalue()
