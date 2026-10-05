"""Parser de prova da familia 2027: simulados oficiais da FUVEST 2027 (CR-011, ADR-003).

O layout e o da familia 2025 (A4, duas colunas, numero entre chaves `{01}`, "(A)".."(E)",
"#####" no fim de cada questao), com duas diferencas encontradas nos PDFs das duas
edicoes (S1): o numero da questao vem em Baloo 2 ExtraBold de 14,04 pt, logo acima da
faixa da 2025, e, na 1a edicao, o espaco entre palavras sai como o glifo `(cid:172)`.
"""

from ingestao.layouts.familia_2025 import ParserLayout2025, Variante

VARIANTE_2027 = Variante(tamanho_marcador=(12.0, 14.5), cids_espaco=frozenset({3, 172}))


class ParserLayout2027(ParserLayout2025):
    nome = "familia_2027"
    variante = VARIANTE_2027
