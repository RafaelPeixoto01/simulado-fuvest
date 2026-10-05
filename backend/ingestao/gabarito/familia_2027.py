"""Gabarito dos simulados oficiais da FUVEST 2027 (CR-011).

O mesmo formato da familia 2025 (`PROVA S1 PROVA S2 PROVA S3 PROVA S4`, linhas
`n L n+40 L` por versao, `*` = anulada), com 80 questoes.
"""

from ingestao.gabarito.familia_2025 import ParserGabarito2025


class ParserGabarito2027(ParserGabarito2025):
    nome = "familia_2027"
    total = 80
