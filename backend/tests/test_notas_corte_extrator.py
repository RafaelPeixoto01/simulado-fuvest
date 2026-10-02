"""IT-025 e IT-026: extrator do PDF "Notas de Corte" (specs/08-notas-de-corte.md §2.4).

As paginas sao listas de palavras como as do `pdfplumber.extract_words` (texto, x0, top),
nas posicoes reais dos PDFs de 2020 a 2025.
"""

import pytest

from ingestao.notas_corte import ErroLayout, extrair_de_palavras, montar_rascunho

FONTE = "https://www.fuvest.br/wp-content/uploads/fuvest_2099_notas_de_corte.pdf"
X_NUMEROS = (310, 348, 391, 434, 472)  # vagas, inscritos, ausentes, convocados, convocados por vaga
X_MINIMO = 519
X_MAXIMO = 567
CABECALHO = [
    (60.1, [("PONTOS", 496), ("CONVOCADOS", 523)]),
    (62.5, [("VAGAS", 282), ("INSCRITOS", 325), ("AUSENTES", 367), ("CONVOC", 410), ("CONVOC", 453)]),
    (65.8, [("CÓDIGO", 19), ("E", 54), ("NOME", 61), ("DA", 88), ("CARREIRA", 101)]),
    (69.7, [("2ª", 410), ("FASE", 417), ("POR", 453), ("VAGA", 468), ("MÍNIMO", 496), ("MÁXIMO", 538)]),
]
MODALIDADES = {
    "ac": "− Ampla Concorrência",
    "ep": "− Candidatos de Escola Pública",
    "ppi": "− Candidatos de Escola Pública − Grupo PPI",
}


def _palavras(top: float, texto: str, x0: float = 20) -> list[dict]:
    """Uma palavra por token, espaçadas como no PDF (fonte estreita: o nome cabe antes de VAGAS)."""
    saida = []
    for token in texto.split():
        saida.append({"text": token, "x0": x0, "top": top})
        x0 += 3.5 * len(token) + 2
    return saida


def _pagina(*linhas: list[dict], cabecalho: bool = True) -> list[dict]:
    palavras = [p for top, ws in CABECALHO for texto, x in ws for p in _palavras(top, texto, x)] if cabecalho else []
    for linha in linhas:
        palavras.extend(linha)
    return palavras


def _numeros(top: float, vagas: int, convocados: int) -> list[dict]:
    valores = (vagas, vagas * 9, vagas, convocados, f"{convocados / vagas:.2f}" if vagas else "−−−")
    return [{"text": str(v), "x0": x, "top": top} for v, x in zip(valores, X_NUMEROS, strict=True)]


def _num(top: float, valor, x: float) -> list[dict]:
    return [{"text": str(valor), "x0": x, "top": top}]


def _carreira_2020(top: float, titulo: str, linhas: dict) -> list[list[dict]]:
    """2020: minimo e maximo na mesma linha da modalidade."""
    saida = [_palavras(top, titulo)]
    for i, (chave, (vagas, conv, minimo, maximo)) in enumerate(linhas.items(), start=1):
        y = top + 13.2 * i
        saida.append(
            _palavras(y, MODALIDADES[chave], 44) + _numeros(y, vagas, conv)
            + _num(y, minimo, X_MINIMO) + _num(y, maximo, X_MAXIMO)
        )
    return saida


def _carreira_2025(top: float, titulo: str, linhas: dict) -> list[list[dict]]:
    """2022+: minimo ~4 pt acima da linha; de 2024 em diante, totais na linha da carreira
    e numeros 1,7 pt acima do nome."""
    total_vagas = sum(v[0] for v in linhas.values())
    total_conv = sum(v[1] for v in linhas.values())
    saida = [_numeros(top - 1.7, total_vagas, total_conv) + _num(top - 1.7, 88, X_MAXIMO), _palavras(top, titulo)]
    for i, (chave, (vagas, conv, minimo, maximo)) in enumerate(linhas.items(), start=1):
        y = top + 13.2 * i
        saida.append(_num(y - 5.6, minimo, X_MINIMO))
        saida.append(_numeros(y - 1.7, vagas, conv) + _num(y - 1.7, maximo, X_MAXIMO))
        saida.append(_palavras(y, MODALIDADES[chave], 44))
    return saida


def _juntar(*blocos: list[list[dict]]) -> list[list[dict]]:
    return [linha for bloco in blocos for linha in bloco]


# IT-025 — variante 2020


def test_variante_2020_minimo_e_maximo_na_linha():
    pagina = _pagina(*_juntar(
        _carreira_2020(82.7, "100−Administração − Piracicaba", {
            "ac": (22, 88, 41, 68), "ep": (11, 44, 27, 59), "ppi": (7, 12, 27, 39),
        }),
        _carreira_2020(140.0, "999−Treinamento E (Exatas)", {
            "ac": (100, 300, "−−−", "−−−"), "ep": (50, 100, "−−−", "−−−"), "ppi": (20, 40, "−−−", "−−−"),
        }),
        [_palavras(200.0, "Total") + _numeros(200.0, 40, 144)],
        [_palavras(214.0, "101−Depois do total") + _numeros(214.0, 10, 30)],
    ))

    carreiras = extrair_de_palavras([pagina])

    assert [c.codigo for c in carreiras] == [100, 999]
    administracao = carreiras[0]
    assert administracao.nome == "Administração − Piracicaba"
    assert administracao.modalidades["ac"] == {"vagas": 22, "convocados": 88, "corte": 41, "maximo": 68}
    assert administracao.modalidades["ppi"] == {"vagas": 7, "convocados": 12, "corte": 27, "maximo": 39}
    assert carreiras[1].modalidades["ac"]["corte"] is None


# IT-026 — variante 2022+ e o rascunho


def _paginas_2025() -> list[list[dict]]:
    primeira = _pagina(*_juntar(
        _carreira_2025(82.7, "101−Biotecnologia", {
            "ac": (26, 98, 53, 83), "ep": (11, 44, 34, 66), "ppi": (6, 10, 29, 52),
        }),
        _carreira_2025(140.0, "111−Medicina", {
            "ac": (77, 336, 79, 88), "ep": (32, 165, 73, 88), "ppi": (19, 91, 64, 83),
        }),
    ))
    segunda = _pagina(*_juntar(
        _carreira_2025(82.7, "112−Medicina", {
            "ac": (26, 122, 77, 86), "ep": (11, 58, 72, 82), "ppi": (6, 26, 63, 74),
        }),
        _carreira_2025(140.0, "201−Engenharia Agronômica; Engenharia Bioquímica; Engenharia de...", {
            "ac": (62, 230, 46, 80), "ep": (35, 74, 27, 70), "ppi": (20, 30, 27, 55),
        }),
        _carreira_2025(197.0, "599−Treinamento H (Humanas)", {
            "ac": (100, 300, 27, 80), "ep": (50, 100, 27, 70), "ppi": (20, 40, 27, 60),
        }),
        [_palavras(260.0, "Total") + _numeros(260.0, 500, 2000)],
    ))
    depois_do_total = _pagina(_palavras(90.0, "103 − Ciências Biomédicas 29 892 116"), cabecalho=False)
    return [primeira, segunda, depois_do_total]


def test_variante_2025_minimo_acima_da_linha_e_totais_na_carreira():
    carreiras = extrair_de_palavras(_paginas_2025())

    assert [c.codigo for c in carreiras] == [101, 111, 112, 201, 599]
    biotecnologia = carreiras[0]
    assert biotecnologia.nome == "Biotecnologia"
    assert biotecnologia.modalidades == {
        "ac": {"vagas": 26, "convocados": 98, "corte": 53, "maximo": 83},
        "ep": {"vagas": 11, "convocados": 44, "corte": 34, "maximo": 66},
        "ppi": {"vagas": 6, "convocados": 10, "corte": 29, "maximo": 52},
    }


def test_rascunho_sem_treineiros_e_com_pendencias_de_nome():
    notas = montar_rascunho(extrair_de_palavras(_paginas_2025()), 2099, FONTE)

    assert notas.status == "rascunho" and notas.ano == 2099 and notas.fonte == FONTE
    assert [c.codigo for c in notas.carreiras] == [101, 111, 112, 201]
    assert notas.carreiras[1].ac.corte == 79
    assert notas.pendencias == [
        "Carreira 111: nome repetido (Medicina) — completar o campus pelo Guia de Carreiras",
        "Carreira 112: nome repetido (Medicina) — completar o campus pelo Guia de Carreiras",
        "Carreira 201: nome cortado no PDF — completar pelo Guia de Carreiras",
    ]


def test_sem_convocados_corte_e_maximo_ficam_vazios():
    """2024/710 PPI: 0 convocados, e o PDF imprime o piso 27 e a maior nota (22, eliminado);
    2020/150 PPI: sem vagas, celulas "−−−"."""
    pagina = _pagina(*_juntar(
        _carreira_2025(82.7, "710−Ciências Exatas", {
            "ac": (22, 22, 30, 73), "ep": (9, 9, 27, 65), "ppi": (5, 0, 27, 22),
        }),
        _carreira_2020(140.0, "150−Curso Superior do Audiovisual", {
            "ac": (19, 86, 61, 80), "ep": (5, 20, 56, 71), "ppi": (0, 0, "−−−", "−−−"),
        }),
    ))

    notas = montar_rascunho(extrair_de_palavras([pagina]), 2099, FONTE)

    exatas, audiovisual = notas.carreiras
    assert exatas.ppi.model_dump() == {"vagas": 5, "convocados": 0, "corte": None, "maximo": None}
    assert audiovisual.ppi.model_dump() == {"vagas": 0, "convocados": 0, "corte": None, "maximo": None}
    assert exatas.ep.corte == 27


def test_pagina_sem_cabecalho_e_layout_desconhecido():
    pagina = _pagina(*_carreira_2020(82.7, "100−Administração", {"ac": (22, 88, 41, 68)}), cabecalho=False)

    with pytest.raises(ErroLayout, match="página 1"):
        extrair_de_palavras([pagina])


def test_modalidade_desconhecida_e_layout_desconhecido():
    pagina = _pagina(
        _palavras(82.7, "100−Administração"),
        _palavras(95.9, "− Candidatos PcD", 44) + _numeros(95.9, 5, 10) + _num(95.9, 30, X_MINIMO),
    )

    with pytest.raises(ErroLayout, match="modalidade desconhecida"):
        extrair_de_palavras([pagina])


def test_carreira_sem_as_tres_modalidades_e_recusada():
    pagina = _pagina(*_carreira_2020(82.7, "100−Administração", {"ac": (22, 88, 41, 68), "ep": (11, 44, 27, 59)}))

    with pytest.raises(ErroLayout, match="Carreira 100"):
        montar_rascunho(extrair_de_palavras([pagina]), 2099, FONTE)
