// Espelho dos schemas da API (backend/app/schemas.py; docs/specs/02, 04 e 05)

export type Letra = 'A' | 'B' | 'C' | 'D' | 'E'
export const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E']

export type Disciplina =
  | 'biologia'
  | 'fisica'
  | 'geografia'
  | 'historia'
  | 'ingles'
  | 'matematica'
  | 'portugues'
  | 'quimica'

export type Modo = 'completa' | 'personalizado' | 'ano' | 'treino'

export interface Bloco {
  texto: string | null
  figura: string | null // URL /figuras/CODIGO/arquivo.webp
}

export type Alternativa = Bloco

export interface Questao {
  id: string // "2025-037" ou "2027s1-037": código da prova + número (CR-011)
  prova: string // código: "2025", "2027s1"
  origem: string // "FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição" (RN-013)
  ano: number // ano FUVEST de referência
  numero: number
  disciplina: Disciplina
  disciplinas_secundarias: Disciplina[]
  texto_base_id: string | null
  enunciado: Bloco[]
  alternativas: Partial<Record<Letra, Alternativa>>
}

export interface TextoBase {
  id: string
  conteudo: Bloco[]
}

/** Prova do vestibular ou simulado oficial da FUVEST (CR-011). */
export interface ProvaCatalogo {
  codigo: string // "2025", "2027s1"
  ano: number // ano FUVEST de referência
  tipo: 'vestibular' | 'simulado'
  edicao: number | null // só no simulado
  rotulo: string // "FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição"
  versao: string
  total_questoes: number
  url_prova: string
  url_gabarito: string
}

export interface AssuntoCatalogo {
  slug: string
  nome: string
  total_questoes: number
}

export interface DisciplinaCatalogo {
  slug: Disciplina
  nome: string
  total_questoes: number
  assuntos: AssuntoCatalogo[] // ordem da taxonomia (CR-004)
}

export interface Catalogo {
  provas: ProvaCatalogo[]
  disciplinas: DisciplinaCatalogo[]
  total_questoes: number
  distribuicao_completa: Partial<Record<Disciplina, number>>
  completa_disponivel: boolean
}

/** Totais públicos da base para a apresentação (CR-007, specs/07 §9.1). */
export interface Vitrine {
  total_questoes: number // não anuladas, como no catálogo (inclui as dos simulados oficiais)
  anos: number[] // dos vestibulares, em ordem crescente; o número de provas é anos.length (CR-011)
}

export type PedidoSimulado =
  | { modo: 'completa'; semente?: number }
  | {
      modo: 'personalizado'
      disciplinas: Disciplina[]
      quantidade: number
      ano_inicio?: number
      ano_fim?: number
      cronometro: boolean
      semente?: number
    }
  | { modo: 'ano'; prova: string } // código da prova (CR-011)
  | {
      modo: 'treino'
      disciplinas?: Disciplina[]
      ano_inicio?: number
      ano_fim?: number
      excluir?: string[]
      semente?: number
    }

export interface Simulado {
  modo: Modo
  questoes: Questao[]
  textos_base: Record<string, TextoBase>
  tempo_limite_s: number | null
  pausavel: boolean
  disponiveis: number
  semente: number
}

export interface QuestoesPorId {
  questoes: Questao[]
  textos_base: Record<string, TextoBase>
  nao_encontradas: string[]
}

export interface RespostaItem {
  questao_id: string
  resposta: Letra | null
}

export interface ItemCorrigido {
  questao_id: string
  resposta: Letra | null
  correta: Letra | null
  anulada: boolean
  acertou: boolean
  disciplina: Disciplina
  /** Slug do assunto (CR-004). Ausente nos resultados gravados antes dele. */
  assunto?: string | null
}

export interface DesempenhoAssunto {
  assunto: string
  nome: string
  total: number
  acertos: number
  percentual: number
}

export interface DesempenhoDisciplina {
  disciplina: Disciplina
  total: number
  acertos: number
  percentual: number
  /** Do pior para o melhor (CR-004). Ausente nos resultados gravados antes dele. */
  assuntos?: DesempenhoAssunto[]
}

export interface Correcao {
  itens: ItemCorrigido[]
  total: number
  acertos: number
  percentual: number
  por_disciplina: DesempenhoDisciplina[]
  ignoradas: string[]
}

export type TipoReporte = 'enunciado' | 'figura' | 'gabarito' | 'outro'

/** Notas de corte da 1ª fase (CR-010, specs/08): corte null = modalidade sem convocados. */
export interface CortesModalidades {
  ac: number | null
  ep: number | null
  ppi: number | null
}

export interface CarreiraCorte {
  codigo: number
  nome: string
  vagas: number
  cortes: CortesModalidades
}

export interface NotasCorte {
  anos: number[] // do mais recente para o mais antigo
  recente: number | null
  ano: number | null // o devolvido: o pedido, se publicado; senão o mais recente
  pontos_prova: number | null // pontos da 1ª fase daquele ano: 90 até 2026, 80 em 2027 (CR-011)
  fonte: string | null
  carreiras: CarreiraCorte[]
}

/** Só a carreira, nunca a modalidade (CR-010, D4). `carreira` null: saiu dos cortes publicados. */
export interface CarreiraAlvo {
  ano: number
  codigo: number
  pontos_prova: number // escala dos cortes daquele ano (CR-011)
  carreira: CarreiraCorte | null
}

/** Conta com Google (CR-005, specs/07). O id só serve de marca da conta no navegador. */
export interface Usuario {
  id: number
  email: string
  nome: string | null
  carreira_alvo?: CarreiraAlvo | null // CR-010; o servidor sempre manda
  admin?: boolean // CR-013: só mostra o link da gestão; quem protege é o servidor
}

/** Modo de acesso (CR-006, ADR-012): `conta` exige login; `livre` é o desenvolvimento sem login
 *  configurado; `indisponivel` é a produção sem login configurado. */
export type Acesso = 'conta' | 'livre' | 'indisponivel'

export interface Sessao {
  login_disponivel: boolean
  usuario: Usuario | null
  acesso: Acesso
}

export const NOMES_DISCIPLINAS: Record<Disciplina, string> = {
  biologia: 'Biologia',
  fisica: 'Física',
  geografia: 'Geografia',
  historia: 'História',
  ingles: 'Inglês',
  matematica: 'Matemática',
  portugues: 'Português',
  quimica: 'Química',
}

/** Área de gestão (CR-013, specs/09). Só para o administrador; datas em ISO. */
export type PeriodoGestao = '7' | '30' | '90' | 'tudo'
export type ModoConcluido = 'completa' | 'personalizado' | 'ano'

export interface PontoSerie {
  inicio: string // primeiro dia do intervalo (AAAA-MM-DD)
  total: number
}

export interface UsoGestao {
  periodo: PeriodoGestao
  inicio: string
  fim: string
  granularidade: 'dia' | 'semana'
  cartoes: {
    estudantes: number
    novos: number
    ativos_hoje: number
    ativos_7_dias: number
    ativos_30_dias: number
    logins: number
    gerados: number
    concluidos: number
    contas_excluidas: number
  }
  series: Record<'cadastros' | 'logins' | 'ativos' | 'gerados' | 'concluidos', PontoSerie[]>
  modos: { modo: ModoConcluido | 'treino'; gerados: number; concluidos: number | null; taxa_conclusao: number | null }[]
  distribuicao: { faixa: string; estudantes: number }[]
  provas_ano: { codigo: string; rotulo: string; concluidos: number }[]
}

export interface AssuntoAprendizado {
  assunto: string
  nome: string
  respostas: number
  acertos: number
  percentual: number
}

export interface AprendizadoGestao {
  periodo: PeriodoGestao
  inicio: string
  fim: string
  modos: {
    modo: ModoConcluido
    concluidos: number
    acerto_medio: number | null
    por_tempo: number | null
    tempo_medio_questao_s: number | null
  }[]
  disciplinas: {
    disciplina: Disciplina
    respostas: number
    acertos: number
    percentual: number
    assuntos: AssuntoAprendizado[]
  }[]
  carreiras: {
    ano: number
    codigo: number
    nome: string | null
    pontos_prova: number
    cortes: CortesModalidades | null
    estudantes: number
    com_prova_completa: number
    atingiriam: CortesModalidades | null
  }[]
}

export interface Marcacoes {
  a: number
  b: number
  c: number
  d: number
  e: number
  em_branco: number
}

export interface QuestaoSuspeita {
  questao_id: string
  prova: string
  numero: number
  disciplina: Disciplina
  assunto: string | null
  gabarito: Letra
  respostas: number
  acertos: number
  percentual: number
  marcacoes: Marcacoes
  motivos: ('acerto_baixo' | 'alternativa_atrai')[]
}

export interface QualidadeGestao {
  base: { provas: number; questoes: number; anuladas: number; sem_assunto: number; sincronizado_em: string | null }
  provas: {
    codigo: string
    rotulo: string
    tipo: string
    total_questoes: number
    questoes: number
    anuladas: number
    sincronizado_em: string
  }[]
  disciplinas: { disciplina: Disciplina; questoes: number }[]
  reportes: {
    pendentes: number
    resolvidos: number
    questoes_com_reporte_resolvido: number
    indice_resolvidos: number | null
  }
  suspeitas: QuestaoSuspeita[]
}

export type StatusReporte = 'pendente' | 'resolvido'

export interface ReporteGestao {
  id: number
  questao_id: string
  tipo: TipoReporte
  descricao: string | null
  status: StatusReporte
  criado_em: string
  resolvido_em: string | null
  questao: { prova: string; numero: number; disciplina: Disciplina; gabarito: Letra | null; anulada: boolean } | null
}

export interface ResolucaoReportes {
  resolvidos: number[]
  ja_resolvidos: number[]
  inexistentes: number[]
}

export type OrdemEstudantes = 'cadastro' | 'acesso'

export interface EstudanteGestao {
  id: number
  nome: string | null
  email: string
  criado_em: string
  ultimo_acesso_em: string
  simulados: number
  carreira_alvo: string | null
  admin: boolean
}

export interface EstudantesGestao {
  total: number
  pagina: number
  por_pagina: number
  estudantes: EstudanteGestao[]
}
