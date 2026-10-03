"""Schemas da API (specs/02, 04 e 05). O gabarito nunca aparece em schema de questao."""

from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.disciplinas import Disciplina
from app.pacote.schema import PADRAO_CODIGO_PROVA, Letra, TipoProva

# "2025-037" ou "2027s1-037": codigo da prova + numero (ADR-006, ADR-015)
PADRAO_ID_QUESTAO = r"^\d{4}(s[1-9])?-\d{3}$"
IdQuestao = Annotated[str, Field(pattern=PADRAO_ID_QUESTAO)]
CodigoProva = Annotated[str, Field(pattern=PADRAO_CODIGO_PROVA)]
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
    """Prova de um ano ou simulado oficial, inteira (RF-011, CR-011)."""

    modo: Literal["ano"]
    prova: CodigoProva


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
    figura: str | None = None  # URL: /figuras/CODIGO/arquivo.webp


class AlternativaPublica(BaseModel):
    texto: str | None = None
    figura: str | None = None


class QuestaoPublica(BaseModel):
    id: str
    prova: str  # codigo: "2025", "2027s1"
    origem: str  # "FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição" (RN-013)
    ano: int  # ano FUVEST de referencia
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
    codigo: str
    ano: int
    tipo: TipoProva
    edicao: int | None
    rotulo: str
    versao: str
    total_questoes: int
    url_prova: str
    url_gabarito: str


class AssuntoCatalogo(BaseModel):
    slug: str
    nome: str
    total_questoes: int  # nao anuladas


class DisciplinaCatalogo(BaseModel):
    slug: Disciplina
    nome: str
    total_questoes: int
    assuntos: list[AssuntoCatalogo]  # ordem da taxonomia (CR-004); [] sem taxonomia


class CatalogoResponse(BaseModel):
    provas: list[ProvaCatalogo]
    disciplinas: list[DisciplinaCatalogo]
    total_questoes: int
    distribuicao_completa: dict[Disciplina, int]
    completa_disponivel: bool


class VitrineResponse(BaseModel):
    """Totais publicos para a apresentacao (CR-007, specs/07 §9.1): nada alem disto."""

    total_questoes: int  # nao anuladas, como no catalogo (inclui as dos simulados)
    anos: list[int]  # anos com prova de vestibular sincronizada, crescente (sem simulados)


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
    assunto: str | None  # slug (CR-004); None so se a questao nao tiver assunto no banco


class DesempenhoAssunto(BaseModel):
    assunto: str
    nome: str
    total: int
    acertos: int
    percentual: float


class DesempenhoDisciplina(BaseModel):
    disciplina: Disciplina
    total: int
    acertos: int
    percentual: float
    assuntos: list[DesempenhoAssunto]  # pior -> melhor; itens sem assunto ficam fora


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


# --- Conta e historico sincronizado (CR-005, specs/07) ---


# Notas de corte e carreira-alvo (CR-010, specs/08)
class CortesModalidades(BaseModel):
    ac: int | None  # None: modalidade sem convocados
    ep: int | None
    ppi: int | None


class CarreiraCorteResposta(BaseModel):
    codigo: int
    nome: str
    vagas: int  # soma das tres modalidades
    cortes: CortesModalidades


class NotasCorteResponse(BaseModel):
    anos: list[int]  # publicados, do mais recente para o mais antigo
    recente: int | None
    ano: int | None  # o devolvido: o pedido, se publicado; senao o mais recente
    pontos_prova: int | None  # pontos da 1a fase daquele ano: 90 ate 2026, 80 em 2027 (CR-011)
    fonte: str | None
    carreiras: list[CarreiraCorteResposta]


class CarreiraAlvoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ano: Ano
    codigo: int = Field(ge=100, le=999)


class CarreiraAlvo(BaseModel):
    ano: int
    codigo: int
    pontos_prova: int  # escala dos cortes daquele ano (CR-011): a comparacao converte a nota
    carreira: CarreiraCorteResposta | None  # None: o par nao esta mais nos cortes publicados


class UsuarioPublico(BaseModel):
    id: int
    email: str
    nome: str | None
    carreira_alvo: CarreiraAlvo | None = None


# Login obrigatorio (CR-006, ADR-012): `conta` exige sessao; `livre` e o desenvolvimento sem
# login configurado; `indisponivel` e a producao sem login configurado
ModoAcesso = Literal["conta", "livre", "indisponivel"]


class SessaoResponse(BaseModel):
    login_disponivel: bool
    usuario: UsuarioPublico | None
    acesso: ModoAcesso


# Espelho do HistoricoEntry do navegador (specs/04 §2.2). extra="forbid" e limites de
# tamanho: o servidor so guarda o que sabe ler, e nada maior que um simulado de 90 questoes
Slug = Annotated[str, Field(pattern=r"^[a-z0-9-]+$", max_length=40)]
Contagem = Annotated[int, Field(ge=0, le=90)]
Percentual = Annotated[float, Field(ge=0, le=100)]
Inteiro = Annotated[int, Field(ge=-(2**53), le=2**53)]
Instante = Annotated[int, Field(ge=0, le=2**53)]  # epoch ms


class _Estrito(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ItemHistorico(_Estrito):
    questao_id: IdQuestao
    resposta: Letra | None
    correta: Letra | None
    anulada: bool
    acertou: bool
    disciplina: Disciplina
    assunto: Slug | None = None  # ausente nos resultados anteriores ao CR-004


class AssuntoHistorico(_Estrito):
    assunto: Slug
    nome: Annotated[str, Field(min_length=1, max_length=60)]
    total: Contagem
    acertos: Contagem
    percentual: Percentual


class DisciplinaHistorico(_Estrito):
    disciplina: Disciplina
    total: Contagem
    acertos: Contagem
    percentual: Percentual
    assuntos: Annotated[list[AssuntoHistorico], Field(max_length=20)] | None = None


class ResultadoHistorico(_Estrito):
    itens: Annotated[list[ItemHistorico], Field(max_length=90)]
    total: Contagem
    acertos: Contagem
    percentual: Percentual
    por_disciplina: Annotated[list[DisciplinaHistorico], Field(max_length=8)]
    ignoradas: Annotated[list[IdQuestao], Field(max_length=90)]


class EntradaHistorico(_Estrito):
    """No JSON os campos sao camelCase, como no localStorage (alias)."""

    model_config = ConfigDict(extra="forbid", alias_generator=to_camel)

    versao: Literal[1]
    id: Annotated[str, Field(pattern=r"^[A-Za-z0-9-]{1,64}$")]
    modo: Literal["completa", "personalizado", "ano"]
    descricao: Annotated[str, Field(min_length=1, max_length=200)]
    iniciado_em: Instante
    finalizado_em: Instante
    tempo_gasto_ms: Inteiro
    tempo_limite_s: Annotated[int, Field(ge=0, le=10**7)] | None
    finalizado_por_tempo: bool
    questao_ids: Annotated[list[IdQuestao], Field(min_length=1, max_length=90)]
    resultado: ResultadoHistorico


class HistoricoRequest(BaseModel):
    # Validadas uma a uma no servico: uma entrada ruim nao trava as outras (specs/07 §2.4)
    entradas: Annotated[list[dict[str, Any]], Field(min_length=1, max_length=50)]


class HistoricoResponse(BaseModel):
    entradas: list[dict[str, Any]]  # HistoricoEntry, do mais recente para o mais antigo
    rejeitadas: list[str] = []
