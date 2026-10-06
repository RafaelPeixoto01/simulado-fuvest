from ingestao.familias import familia_da_prova
from ingestao.layouts import familia_2025, familia_2026, familia_2027
from ingestao.layouts.base import ParserLayout

PARSERS: dict[str, ParserLayout] = {
    "familia_2025": familia_2025.ParserLayout2025(),
    "familia_2026": familia_2026.ParserLayout2026(),
    "familia_2027": familia_2027.ParserLayout2027(),
}


def obter_parser_layout(codigo: str) -> ParserLayout:
    return PARSERS[familia_da_prova(codigo)]
