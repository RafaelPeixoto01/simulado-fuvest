"""Parser de prova da familia 2026: prova da FUVEST 2026 e simulado oficial de 19/10/2025 (CR-012).

O layout e o da familia 2027, que estreou nesses PDFs: numero da questao em Baloo 2
ExtraBold de 13,98 pt e o espaco entre palavras como o glifo `(cid:172)`. Muda so o
gabarito, de 90 questoes (gabarito/familia_2026).
"""

from ingestao.layouts.familia_2025 import ParserLayout2025
from ingestao.layouts.familia_2027 import VARIANTE_2027


class ParserLayout2026(ParserLayout2025):
    nome = "familia_2026"
    variante = VARIANTE_2027
