"""Schemas da API (specs/02, 04 e 05). O gabarito nunca aparece em schema de questao."""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, model_validator

from app.disciplinas import Disciplina
from app.pacote.schema import Letra

IdQuestao = Annotated[str, Field(pattern=r"^\d{4}-\d{3}$")]
Ano = Annotated[int, Field(ge=1977, le=2100)]


def _sem_duplicatas(valores: list) -> list:
    if len(set(valores)) != len(valores):
        raise ValueError("valores repetidos")
    return valores


class _Intervalo(BaseModel):
    ano_inicio: Ano | None = None
    ano_fim: Ano | None = None

    @model_validator(mode="after")
    def _intervalo_valido(self):
        if self.ano_inicio and self.ano_fim and self.ano_inicio > self.ano_fim:
            raise ValueError("Intervalo de anos inválido")
        return self


class GerarCompleta(BaseModel):
    modo: Literal["completa"]
    semente: int | None = None


class GerarPersonalizado(_Intervalo):
    modo: Literal["personalizado"]
    disciplinas: Annotated[
        list[Disciplina], Field(min_length=1), AfterValidator(_sem_duplicatas)
    ]
    quantidade: Annotated[int, Field(ge=1, le=90)]
    cronometro: bool = True
    semente: int | None = None


class GerarAno(BaseModel):
    modo: Literal["ano"]
    ano: Ano


class GerarTreino(_Intervalo):
    modo: Literal["treino"]
    disciplinas: Annotated[list[Disciplina], AfterValidator(_sem_duplicatas)] = []
    excluir: Annotated[list[IdQuestao], Field(max_length=1000)] = []
    semente: int | None = None


PedidoSimulado = Annotated[
    GerarCompleta | GerarPersonalizado | GerarAno | GerarTreino, Field(discriminator="modo")
]


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


class SimuladoResponse(BaseModel):
    modo: str
    questoes: list[QuestaoPublica]
    textos_base: dict[str, TextoBasePublico]
    tempo_limite_s: int | None
    pausavel: bool
    disponiveis: int
    semente: int


class QuestoesResponse(BaseModel):
    questoes: list[QuestaoPublica]
    textos_base: dict[str, TextoBasePublico]
    nao_encontradas: list[str]


class RespostaItem(BaseModel):
    questao_id: IdQuestao
    resposta: Letra | None  # null = em branco


def _ids_unicos(respostas: list[RespostaItem]) -> list[RespostaItem]:
    if len({r.questao_id for r in respostas}) != len(respostas):
        raise ValueError("Questão repetida")
    return respostas


class CorrecaoRequest(BaseModel):
    respostas: Annotated[
        list[RespostaItem], Field(min_length=1, max_length=90), AfterValidator(_ids_unicos)
    ]


class ItemCorrigido(BaseModel):
    questao_id: str
    resposta: Letra | None
    correta: Letra | None  # null so quando anulada
    anulada: bool
    acertou: bool
    disciplina: Disciplina


class DesempenhoDisciplina(BaseModel):
    disciplina: Disciplina
    total: int
    acertos: int
    percentual: float


class CorrecaoResponse(BaseModel):
    itens: list[ItemCorrigido]
    total: int
    acertos: int
    percentual: float
    por_disciplina: list[DesempenhoDisciplina]
    ignoradas: list[str]


TipoReporte = Literal["enunciado", "figura", "gabarito", "outro"]


def _descricao_limpa(texto: str | None) -> str | None:
    if texto is None:
        return None
    texto = texto.strip()
    if len(texto) > 500:
        raise ValueError("Descrição deve ter até 500 caracteres")
    return texto or None


class ReporteCreate(BaseModel):
    questao_id: IdQuestao
    tipo: TipoReporte
    descricao: Annotated[str | None, AfterValidator(_descricao_limpa)] = None


class ReporteCriado(BaseModel):
    id: int
