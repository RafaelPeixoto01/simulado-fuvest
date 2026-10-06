"""Gabarito da prova da FUVEST 2026 e do simulado oficial de 19/10/2025 (CR-012).

O formato da familia 2025 (`PROVA V1 ...` na prova, `PROVA S1 ...` no simulado, linhas
`n L n+45 L` por versao, `*` = anulada), com 90 questoes.
"""

from ingestao.gabarito.familia_2025 import ParserGabarito2025


class ParserGabarito2026(ParserGabarito2025):
    nome = "familia_2026"
    total = 90
