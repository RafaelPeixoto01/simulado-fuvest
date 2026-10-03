"""Schema do pacote de revisao `data/provas/CODIGO/prova.yaml` (specs/01-ingestao.md §2.2).

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
    numero: int = Field(ge=1, le=90)  # ate o total_questoes da prova (V01)
    disciplina: Disciplina | None = None
    # Slug da taxonomia (assuntos.yaml) da disciplina principal; conferido pela V11
    assunto: str | None = None
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


TipoProva = Literal["vestibular", "simulado"]
# Codigo da prova (CR-011, ADR-015): o ano no vestibular, ano + "s" + edicao no simulado
# oficial. E o nome do diretorio do pacote e o prefixo dos ids das questoes e textos-base
PADRAO_CODIGO_PROVA = r"^\d{4}(s[1-9])?$"
# 1a fase: 90 questoes ate 2026, 80 desde a FUVEST 2027 (Resolucao CoG 9008/2026, art. 11)
TotalQuestoes = Literal[80, 90]


def codigo_da_prova(ano: int, edicao: int | None) -> str:
    return f"{ano}" if edicao is None else f"{ano}s{edicao}"


def rotulo_da_prova(ano: int, edicao: int | None) -> str:
    """Origem exibida (RN-013): "FUVEST 2025" ou "Simulado FUVEST 2027 · 1ª edição"."""
    return f"FUVEST {ano}" if edicao is None else f"Simulado FUVEST {ano} · {edicao}ª edição"


class PacoteProva(_Modelo):
    # Ano FUVEST de referencia: o do vestibular, ou o do formato que o simulado oficial treina
    ano: int = Field(ge=1977, le=2100)
    tipo: TipoProva = "vestibular"
    edicao: int | None = Field(default=None, ge=1, le=9)  # so no simulado oficial
    # 2025: V1..V4; 2020 e 2022-2024: letras (V, K, Q, X, Z); simulados: S1..S4; versao unica
    versao: str = Field(pattern=r"^(V[1-4]|S[1-4]|[A-Z]|unica)$")
    total_questoes: TotalQuestoes = 90
    status: Literal["rascunho", "publicada"] = "rascunho"
    fonte: Fonte
    textos_base: list[TextoBase] = []
    questoes: list[Questao]

    @model_validator(mode="after")
    def _edicao_so_no_simulado(self) -> "PacoteProva":
        if (self.tipo == "simulado") != (self.edicao is not None):
            raise ValueError("'edicao' é obrigatória no simulado e não existe no vestibular")
        return self

    @property
    def codigo(self) -> str:
        return codigo_da_prova(self.ano, self.edicao)
