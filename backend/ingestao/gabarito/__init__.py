from pathlib import Path
from typing import Literal, Protocol

from app.pacote.schema import Letra
from ingestao.familias import familia_do_ano
from ingestao.gabarito import familia_2025

Marcacao = Letra | Literal["anulada"] | None  # None = marcacao nao reconhecida


class ParserGabarito(Protocol):
    nome: str

    def extrair(self, pdf_path: Path, versao: str) -> dict[int, Marcacao]: ...


PARSERS: dict[str, ParserGabarito] = {
    "familia_2025": familia_2025.ParserGabarito2025(),
}


def obter_parser_gabarito(ano: int) -> ParserGabarito:
    return PARSERS[familia_do_ano(ano)]
