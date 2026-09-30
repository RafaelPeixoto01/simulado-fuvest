import type { Letra, Modo } from '../types'

/** Simulado em andamento, persistido no navegador (RN-012, specs/03 §2.2).
 *  O conteudo das questoes nao vai para o storage: so ids, respostas e tempos. */
export interface SimuladoEmAndamento {
  versao: 1
  id: string
  modo: Exclude<Modo, 'treino'>
  descricao: string
  questaoIds: string[]
  respostas: Record<string, Letra>
  marcadas: string[]
  indiceAtual: number
  iniciadoEm: number // epoch ms
  tempoLimiteS: number | null
  pausavel: boolean
  pausadoEm: number | null // != null => pausado agora
  pausadoTotalMs: number
}

export type AcaoSimulado =
  | { tipo: 'INICIAR'; simulado: SimuladoEmAndamento }
  | { tipo: 'RESPONDER'; questaoId: string; letra: Letra }
  | { tipo: 'ALTERNAR_MARCADA'; questaoId: string }
  | { tipo: 'IR_PARA'; indice: number }
  | { tipo: 'PAUSAR'; agora: number }
  | { tipo: 'RETOMAR'; agora: number }
  | { tipo: 'DESCARTAR' }
