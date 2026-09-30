"""Schemas da API (specs/02, 04 e 05). O gabarito nunca aparece em schema de questao."""

from typing import Annotated

from pydantic import BaseModel, Field

from app.disciplinas import Disciplina
from app.pacote.schema import Letra

IdQuestao = Annotated[str, Field(pattern=r"^\d{4}-\d{3}$")]


class BlocoPublico(BaseModel):
    texto: str | None = None
    figura: str | None = None  # URL: /figuras/AAAA/arquivo.webp


class AlternativaPublica(BaseModel):
    texto: str | None = None
    figura: str | None = None


class QuestaoPublica(BaseModel):
    id: str
    ano: int
    numero: int
    disciplina: Disciplina
    disciplinas_secundarias: list[Disciplina]
    texto_base_id: str | None
    enunciado: list[BlocoPublico]
    alternativas: dict[Letra, AlternativaPublica]


class TextoBasePublico(BaseModel):
    id: str
    conteudo: list[BlocoPublico]


class ProvaCatalogo(BaseModel):
    ano: int
    versao: str
    total_questoes: int
    url_prova: str
    url_gabarito: str


class DisciplinaCatalogo(BaseModel):
    slug: Disciplina
    nome: str
    total_questoes: int


class CatalogoResponse(BaseModel):
    provas: list[ProvaCatalogo]
    disciplinas: list[DisciplinaCatalogo]
    total_questoes: int
    distribuicao_completa: dict[Disciplina, int]
    completa_disponivel: bool
