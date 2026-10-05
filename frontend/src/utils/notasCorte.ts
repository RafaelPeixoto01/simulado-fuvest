import type { HistoricoEntry } from '../simulado/tipos'
import type { CarreiraCorte } from '../types'

/** Notas de corte (CR-010, specs/08). */

export type ChaveModalidade = 'ac' | 'ep' | 'ppi'

export const MODALIDADES: { chave: ChaveModalidade; nome: string; sigla: string }[] = [
  { chave: 'ac', nome: 'Ampla concorrência', sigla: 'AC' },
  { chave: 'ep', nome: 'Escola pública', sigla: 'EP' },
  { chave: 'ppi', nome: 'Escola pública PPI', sigla: 'PPI' },
]

/** Menos de 30% da 1ª fase elimina: 27 de 90, 24 de 80 (Resoluções da FUVEST, art. 11 §3º — CR-011). */
export function minimoFuvest(pontosProva: number): number {
  return Math.ceil((3 * pontosProva) / 10)
}

export interface NotaSimulado {
  acertos: number
  total: number
}

/** Nota comparável ao corte (RN-018): a da Prova completa e a da Prova de um ano, de qualquer tamanho
 *  (90 até 2026, 80 nos simulados oficiais e desde 2027 — CR-011); null no Personalizado. Na Prova de
 *  um ano a anulada já conta como acerto (RN-002). */
export function notaComparavel(entrada: HistoricoEntry): NotaSimulado | null {
  if (entrada.modo !== 'completa' && entrada.modo !== 'ano') return null
  const { acertos, total } = entrada.resultado
  return total > 0 ? { acertos, total } : null
}

const umaCasa = (n: number) => Math.round(n * 10) / 10

/** A nota na escala da lista de corte (D3 do CR-011). Direta quando o simulado tem tantas questões
 *  quanto a prova daquela lista; senão, proporcional (acertos ÷ total × pontos), com 1 casa decimal,
 *  e é uma estimativa. */
export function naEscalaDoCorte(nota: NotaSimulado, pontosProva: number): { pontos: number; estimativa: boolean } {
  if (nota.total === pontosProva) return { pontos: nota.acertos, estimativa: false }
  return { pontos: umaCasa((nota.acertos / nota.total) * pontosProva), estimativa: true }
}

const ID_DE_VESTIBULAR = /^(\d{4})-\d{3}$/

/** Ano da Prova de um ano de vestibular (do primeiro id, AAAA-NNN); null nos outros modos e nos
 *  simulados oficiais (AAAAsN-NNN), que não têm lista de corte própria (CR-011, P5). */
export function anoDaProva(entrada: HistoricoEntry): number | null {
  if (entrada.modo !== 'ano' || entrada.questaoIds.length === 0) return null
  const vestibular = ID_DE_VESTIBULAR.exec(entrada.questaoIds[0])
  return vestibular ? Number(vestibular[1]) : null
}

export type Situacao = { tipo: 'atingiu'; acima: number } | { tipo: 'falta'; faltam: number } | { tipo: 'sem-corte' }

/** O corte é a menor nota entre os convocados: nota igual ao corte também atinge. A nota convertida
 *  tem 1 casa, e a diferença também. */
export function situacao(pontos: number, corte: number | null): Situacao {
  if (corte === null) return { tipo: 'sem-corte' }
  return pontos >= corte
    ? { tipo: 'atingiu', acima: umaCasa(pontos - corte) }
    : { tipo: 'falta', faltam: umaCasa(corte - pontos) }
}

/** Minúsculas e sem acento (NFD sem diacríticos), para a busca. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Filtra por nome ou código e ordena por nome. Busca vazia: todas. */
export function filtrarCarreiras(carreiras: CarreiraCorte[], busca: string): CarreiraCorte[] {
  const termo = normalizarBusca(busca)
  return carreiras
    .filter((c) => !termo || normalizarBusca(c.nome).includes(termo) || String(c.codigo).startsWith(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
