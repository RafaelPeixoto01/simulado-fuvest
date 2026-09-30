"""Schema do pacote de revisao `data/provas/AAAA/prova.yaml` (specs/01-ingestao.md §2.2).

So validacao estrutural (tipos, formatos, faixas). As regras de negocio que
decidem se um pacote pode ser publicado (V01-V10) ficam em `validacao.py`.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from app.disciplinas import Disciplina

Letra = Literal["A", "B", "C", "D", "E"]
LETRAS: tuple[Letra, ...] = ("A", "B", "C", "D", "E")


class _Modelo(BaseModel):
    # Arquivo editado a mao: chave com erro de digitacao tem que falhar
    model_config = ConfigDict(extra="forbid")


class Bloco(_Modelo):
    texto: str | None = None
    figura: str | None = None

    @model_validator(mode="after")
    def _exatamente_um(self) -> "Bloco":
        if (self.texto is None) == (self.figura is None):
            raise ValueError("bloco deve ter exatamente um de 'texto' ou 'figura'")
        return self


class Alternativa(_Modelo):
    texto: str | None = None
    figura: str | None = None

    @model_validator(mode="after")
    def _pelo_menos_um(self) -> "Alternativa":
        if self.texto is None and self.figura is None:
            raise ValueError("alternativa deve ter 'texto' ou 'figura'")
        return self


class TextoBase(_Modelo):
    id: str = Field(pattern=r"^tb\d{2}$")
    questoes: list[int]
    conteudo: list[Bloco]


class Questao(_Modelo):
    numero: int = Field(ge=1, le=90)
    disciplina: Disciplina | None = None
    disciplinas_secundarias: list[Disciplina] = []
    texto_base: str | None = None
    enunciado: list[Bloco]
    alternativas: dict[Letra, Alternativa]
    resposta: Letra | None = None
    anulada: bool = False
    pendencias: list[str] = []


class Fonte(_Modelo):
    url_prova: HttpUrl
    url_gabarito: HttpUrl
    familia_layout: str


class PacoteProva(_Modelo):
    ano: int = Field(ge=1977, le=2100)
    versao: str = Field(pattern=r"^(V[1-4]|unica)$")
    status: Literal["rascunho", "publicada"] = "rascunho"
    fonte: Fonte
    textos_base: list[TextoBase] = []
    questoes: list[Questao]
