"""Schemas da API (specs/02, 04 e 05). O gabarito nunca aparece em schema de questao."""

from datetime import date, datetime
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

    @model_validator(mode="before")
    @classmethod
    def _ano_antigo(cls, dados: Any) -> Any:
        # Antes do CR-011 o SPA mandava {"modo": "ano", "ano": 2025}: uma aba aberta durante o
        # deploy continua funcionando. O ano e o codigo do vestibular daquele ano
        if isinstance(dados, dict) and "prova" not in dados and isinstance(dados.get("ano"), int):
            sem_ano = {chave: valor for chave, valor in dados.items() if chave != "ano"}
            return {**sem_ano, "prova": str(dados["ano"])}
        return dados


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
    admin: bool = False  # CR-013: so o servidor decide (RN-020); o frontend so mostra o link


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


# --- Area de gestao (CR-013, specs/09). So para o administrador (RN-020) ---

PeriodoGestao = Literal["7", "30", "90", "tudo"]
ModoConcluido = Literal["completa", "personalizado", "ano"]


class PontoSerie(BaseModel):
    inicio: date  # primeiro dia do intervalo (o dia, ou a semana comecando na segunda)
    total: int


class SeriesUso(BaseModel):
    cadastros: list[PontoSerie]
    logins: list[PontoSerie]
    ativos: list[PontoSerie]  # por semana: a media por dia, arredondada
    gerados: list[PontoSerie]
    concluidos: list[PontoSerie]


class CartoesUso(BaseModel):
    estudantes: int
    novos: int
    ativos_hoje: int
    ativos_7_dias: int
    ativos_30_dias: int
    logins: int
    gerados: int
    concluidos: int
    contas_excluidas: int


class ModoUso(BaseModel):
    modo: Literal["completa", "personalizado", "ano", "treino"]
    gerados: int
    concluidos: int | None  # None no Treino (nao entra no historico)
    taxa_conclusao: float | None


class FaixaUso(BaseModel):
    faixa: Literal["0", "1", "2–5", "6–20", "21–50"]
    estudantes: int


class ProvaFeita(BaseModel):
    codigo: str
    rotulo: str
    concluidos: int


class UsoResponse(BaseModel):
    periodo: PeriodoGestao
    inicio: date
    fim: date
    granularidade: Literal["dia", "semana"]
    cartoes: CartoesUso
    series: SeriesUso
    modos: list[ModoUso]
    distribuicao: list[FaixaUso]
    provas_ano: list[ProvaFeita]


class ModoAprendizado(BaseModel):
    modo: ModoConcluido
    concluidos: int
    acerto_medio: float | None
    por_tempo: float | None
    tempo_medio_questao_s: int | None


class AssuntoAprendizado(BaseModel):
    assunto: str
    nome: str
    respostas: int
    acertos: int
    percentual: float


class DisciplinaAprendizado(BaseModel):
    disciplina: Disciplina
    respostas: int
    acertos: int
    percentual: float
    assuntos: list[AssuntoAprendizado]


class CarreiraEscolhida(BaseModel):
    ano: int
    codigo: int
    nome: str | None  # None: a carreira saiu dos cortes publicados
    pontos_prova: int
    cortes: CortesModalidades | None
    estudantes: int
    com_prova_completa: int
    atingiriam: CortesModalidades | None  # contagem por modalidade; None na modalidade sem corte


class AprendizadoResponse(BaseModel):
    periodo: PeriodoGestao
    inicio: date
    fim: date
    modos: list[ModoAprendizado]
    disciplinas: list[DisciplinaAprendizado]
    carreiras: list[CarreiraEscolhida]


class ProvaBase(BaseModel):
    codigo: str
    rotulo: str
    tipo: str
    total_questoes: int
    questoes: int
    anuladas: int
    sincronizado_em: datetime


class ResumoBase(BaseModel):
    provas: int
    questoes: int  # validas (nao anuladas)
    anuladas: int
    sem_assunto: int
    sincronizado_em: datetime | None


class DisciplinaBase(BaseModel):
    disciplina: Disciplina
    questoes: int


class ResumoReportes(BaseModel):
    pendentes: int
    resolvidos: int
    questoes_com_reporte_resolvido: int
    indice_resolvidos: float | None  # % das questoes validas (meta < 2%, PRD §2)


class Marcacoes(BaseModel):
    a: int
    b: int
    c: int
    d: int
    e: int
    em_branco: int


class QuestaoSuspeita(BaseModel):
    questao_id: str
    prova: str
    numero: int
    disciplina: Disciplina
    assunto: str | None
    gabarito: Letra
    respostas: int
    acertos: int
    percentual: float
    marcacoes: Marcacoes
    motivos: list[Literal["acerto_baixo", "alternativa_atrai"]]


class QualidadeResponse(BaseModel):
    base: ResumoBase
    provas: list[ProvaBase]
    disciplinas: list[DisciplinaBase]
    reportes: ResumoReportes
    suspeitas: list[QuestaoSuspeita]


class QuestaoReportada(BaseModel):
    prova: str
    numero: int
    disciplina: Disciplina
    gabarito: Letra | None
    anulada: bool


class ReporteGestao(BaseModel):
    id: int
    questao_id: str
    tipo: TipoReporte
    descricao: str | None
    status: Literal["pendente", "resolvido"]
    criado_em: datetime
    resolvido_em: datetime | None
    questao: QuestaoReportada | None  # None: a questao saiu da base


class ReportesGestaoResponse(BaseModel):
    reportes: list[ReporteGestao]


class ResolverReportesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: Annotated[
        list[Annotated[int, Field(ge=1)]],
        Field(min_length=1, max_length=100),
        AfterValidator(_sem_duplicatas),
    ]


class ResolverReportesResponse(BaseModel):
    resolvidos: list[int]
    ja_resolvidos: list[int]
    inexistentes: list[int]


class EstudanteGestao(BaseModel):
    id: int
    nome: str | None
    email: str
    criado_em: datetime
    ultimo_acesso_em: datetime
    simulados: int
    carreira_alvo: str | None
    admin: bool


class EstudantesResponse(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    estudantes: list[EstudanteGestao]
