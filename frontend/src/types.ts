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
  figura: string | null // URL /figuras/AAAA/arquivo.webp
}

export type Alternativa = Bloco

export interface Questao {
  id: string
  ano: number
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

export interface ProvaCatalogo {
  ano: number
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
  total_questoes: number // não anuladas, como no catálogo
  anos: number[] // em ordem crescente; o número de provas é anos.length
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
  | { modo: 'ano'; ano: number }
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
  fonte: string | null
  carreiras: CarreiraCorte[]
}

/** Só a carreira, nunca a modalidade (CR-010, D4). `carreira` null: saiu dos cortes publicados. */
export interface CarreiraAlvo {
  ano: number
  codigo: number
  carreira: CarreiraCorte | null
}

/** Conta com Google (CR-005, specs/07). O id só serve de marca da conta no navegador. */
export interface Usuario {
  id: number
  email: string
  nome: string | null
  carreira_alvo?: CarreiraAlvo | null // CR-010; o servidor sempre manda
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
