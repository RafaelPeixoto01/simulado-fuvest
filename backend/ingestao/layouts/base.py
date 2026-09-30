from pathlib import Path
from typing import NamedTuple, Protocol

from app.pacote.schema import Questao, TextoBase


class ResultadoExtracao(NamedTuple):
    questoes: list[Questao]  # disciplina=None; resposta preenchida depois pelo gabarito
    textos_base: list[TextoBase]
    figuras: dict[str, bytes]  # nome do arquivo -> WebP


class ParserLayout(Protocol):
    nome: str

    def extrair(self, pdf_path: Path) -> ResultadoExtracao: ...
