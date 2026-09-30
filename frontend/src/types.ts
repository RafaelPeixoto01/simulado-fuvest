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

export interface DisciplinaCatalogo {
  slug: Disciplina
  nome: string
  total_questoes: number
}

export interface Catalogo {
  provas: ProvaCatalogo[]
  disciplinas: DisciplinaCatalogo[]
  total_questoes: number
  distribuicao_completa: Partial<Record<Disciplina, number>>
  completa_disponivel: boolean
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
}

export interface DesempenhoDisciplina {
  disciplina: Disciplina
  total: number
  acertos: number
  percentual: number
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
