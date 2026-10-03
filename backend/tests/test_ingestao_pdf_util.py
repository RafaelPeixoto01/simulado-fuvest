"""IT-010: limpeza de texto e montagem de linhas; render de regiao e WebP."""

from pathlib import Path

from PIL import Image

from ingestao.figuras import para_webp
from ingestao.pdf_util import (
    Linha,
    juntar_linhas,
    limpar_texto,
    linhas_da_regiao,
    renderizar_regiao,
    tamanho_pagina,
)

PDFS = Path(__file__).parent / "fixtures" / "pdfs"
P03 = PDFS / "fuvest2025_v1_p03.pdf"
DIREITA = 561  # borda direita da coluna no layout 2025


def _linha(texto, x1=DIREITA, top=0.0, x0=312.0):
    return Linha(texto=texto, x0=x0, x1=x1, top=top, bottom=top + 10)


def test_limpar_texto_remove_artefatos_cid_e_espacos():
    bruto = "CONCURSO(cid:3)VESTIBULAR(cid:3)FUVEST(cid:12)   2015 "

    assert limpar_texto(bruto) == "CONCURSO VESTIBULAR FUVEST 2015"


def test_limpar_texto_com_glifos_de_espaco_da_variante():
    """CR-011: na 1a edicao do simulado de 2027 o espaco e o glifo (cid:172), as vezes grudado."""
    bruto = "Certas(cid:172)narrativas(cid:172) convidam(cid:12)"

    assert limpar_texto(bruto, frozenset({3, 172})) == "Certas narrativas convidam"
    assert limpar_texto(bruto) == "Certasnarrativas convidam"  # padrao: so o (cid:3) e espaco


def test_linhas_cheias_viram_um_paragrafo():
    linhas = [_linha("Considerando a charge,", top=0), _linha("é correto afirmar:", x1=480, top=12)]

    assert juntar_linhas(linhas, DIREITA) == "Considerando a charge, é correto afirmar:"


def test_hifenizacao_de_fim_de_linha_e_desfeita():
    linhas = [_linha("a pala-", top=0), _linha("vra partida", x1=400, top=12)]

    assert juntar_linhas(linhas, DIREITA) == "a palavra partida"


def test_palavra_composta_quebrada_no_hifen_mantem_um_hifen():
    # Tipografia em portugues repete o hifen: "bem-" / "-estar"
    linhas = [_linha("o bem-", top=0), _linha("-estar social", x1=400, top=12)]

    assert juntar_linhas(linhas, DIREITA) == "o bem-estar social"


def test_hifen_antes_de_maiuscula_e_mantido():
    linhas = [_linha("a região Centro-", top=0), _linha("Oeste do país", x1=400, top=12)]

    assert juntar_linhas(linhas, DIREITA) == "a região Centro-Oeste do país"


def test_linha_curta_mantem_a_quebra():
    # Verso de poema ou fim de paragrafo: a linha nao chega a margem direita
    linhas = [_linha("Minha terra tem palmeiras,", x1=420, top=0), _linha("Onde canta o Sabiá;", x1=400, top=12)]

    assert juntar_linhas(linhas, DIREITA) == "Minha terra tem palmeiras,\nOnde canta o Sabiá;"


def test_espaco_vertical_grande_separa_paragrafos():
    linhas = [_linha("Fim do primeiro parágrafo com linha cheia", top=0), _linha("Segundo", x1=400, top=30)]

    assert juntar_linhas(linhas, DIREITA) == "Fim do primeiro parágrafo com linha cheia\nSegundo"


def test_sem_linhas():
    assert juntar_linhas([], DIREITA) == ""


def test_linhas_da_regiao_do_pdf_real():
    linhas = linhas_da_regiao(P03, 1, (297.6, 35, 595.2, 842))

    alternativa_a = next(linha for linha in linhas if linha.texto.startswith("(A) Há uma incoerência"))
    assert round(alternativa_a.x0) == 312
    assert all("(cid:" not in linha.texto for linha in linhas)


def test_tamanho_pagina_a4():
    assert tamanho_pagina(P03, 1) == (595.22, 842.0)


def test_renderizar_regiao_em_escala_2():
    imagem = renderizar_regiao(P03, 1, (317, 64, 558, 177), escala=2)

    assert imagem.size == (482, 226)


def test_para_webp_limita_largura_e_gera_webp():
    dados = para_webp(Image.new("RGB", (2400, 300), "white"))

    imagem = Image.open(__import__("io").BytesIO(dados))
    assert dados[:4] == b"RIFF" and dados[8:12] == b"WEBP"
    assert imagem.size == (1200, 150)


def test_para_webp_nao_amplia_imagem_pequena():
    dados = para_webp(Image.new("RGB", (300, 100), "white"))

    assert Image.open(__import__("io").BytesIO(dados)).size == (300, 100)
