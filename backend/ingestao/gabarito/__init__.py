from pathlib import Path
from typing import Literal, Protocol

from app.pacote.schema import Letra
from ingestao.familias import familia_da_prova
from ingestao.gabarito import familia_2025, familia_2026, familia_2027

Marcacao = Letra | Literal["anulada"] | None  # None = marcacao nao reconhecida


class ParserGabarito(Protocol):
    nome: str
    total: int  # questoes da prova (90 ate 2026, 80 desde 2027)

    def extrair(self, pdf_path: Path, versao: str) -> dict[int, Marcacao]: ...


PARSERS: dict[str, ParserGabarito] = {
    "familia_2025": familia_2025.ParserGabarito2025(),
    "familia_2026": familia_2026.ParserGabarito2026(),
    "familia_2027": familia_2027.ParserGabarito2027(),
}


def obter_parser_gabarito(codigo: str) -> ParserGabarito:
    return PARSERS[familia_da_prova(codigo)]
