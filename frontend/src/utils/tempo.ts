import type { SimuladoEmAndamento } from '../simulado/tipos'

type Tempos = Pick<SimuladoEmAndamento, 'iniciadoEm' | 'pausadoEm' | 'pausadoTotalMs' | 'tempoLimiteS'>

/** Tempo sempre derivado de timestamps (RN-009): fechar a aba nao pausa. */
export function decorridoMs(s: Tempos, agora: number): number {
  const pausaAtual = s.pausadoEm !== null ? agora - s.pausadoEm : 0
  return agora - s.iniciadoEm - s.pausadoTotalMs - pausaAtual
}

export function restanteMs(s: Tempos, agora: number): number | null {
  if (s.tempoLimiteS === null) return null
  return Math.max(0, s.tempoLimiteS * 1000 - decorridoMs(s, agora))
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** hh:mm:ss, arredondando para cima (o cronometro nao mostra 00:00:00 com tempo sobrando). */
export function formatarTempo(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${doisDigitos(h)}:${doisDigitos(m)}:${doisDigitos(s)}`
}

/** "2 h 13 min", "2 min 5 s", "45 s" */
export function formatarDuracao(ms: number): string {
  const total = Math.round(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} h ${m} min`
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`
  return `${s} s`
}

/** Tempo restante em minutos, arredondando para cima: "4 h 52 min", "1 h", "58 min", "1 min".
 *  Para textos que não são atualizados a cada segundo, como o banner do início (CR-003). */
export function formatarRestante(ms: number): string {
  const minutos = Math.ceil(Math.max(0, ms) / 60_000)
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`
  return `${m} min`
}
