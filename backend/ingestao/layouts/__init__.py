from ingestao.familias import familia_do_ano
from ingestao.layouts import familia_2025
from ingestao.layouts.base import ParserLayout

PARSERS: dict[str, ParserLayout] = {
    "familia_2025": familia_2025.ParserLayout2025(),
}


def obter_parser_layout(ano: int) -> ParserLayout:
    return PARSERS[familia_do_ano(ano)]
