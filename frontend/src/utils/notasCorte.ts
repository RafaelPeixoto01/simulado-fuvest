import type { HistoricoEntry } from '../simulado/tipos'
import type { CarreiraCorte } from '../types'

/** Notas de corte (CR-010, specs/08). */

export type ChaveModalidade = 'ac' | 'ep' | 'ppi'

export const MODALIDADES: { chave: ChaveModalidade; nome: string; sigla: string }[] = [
  { chave: 'ac', nome: 'Ampla concorrência', sigla: 'AC' },
  { chave: 'ep', nome: 'Escola pública', sigla: 'EP' },
  { chave: 'ppi', nome: 'Escola pública PPI', sigla: 'PPI' },
]

const PONTOS_PROVA = 90

/** Pontos comparáveis ao corte: os acertos da Prova completa e da Prova de um ano com 90 questões;
 *  null nos demais (RN-018). Na Prova de um ano a anulada já conta como acerto (RN-002). */
export function pontosComparaveis(entrada: HistoricoEntry): number | null {
  const noventa = entrada.resultado.total === PONTOS_PROVA
  return (entrada.modo === 'completa' || entrada.modo === 'ano') && noventa ? entrada.resultado.acertos : null
}

/** Ano da Prova de um ano (do primeiro id, AAAA-NNN); null nos outros modos. */
export function anoDaProva(entrada: HistoricoEntry): number | null {
  if (entrada.modo !== 'ano' || entrada.questaoIds.length === 0) return null
  return Number(entrada.questaoIds[0].slice(0, 4))
}

export type Situacao = { tipo: 'atingiu'; acima: number } | { tipo: 'falta'; faltam: number } | { tipo: 'sem-corte' }

/** O corte é a menor nota entre os convocados: nota igual ao corte também atinge. */
export function situacao(pontos: number, corte: number | null): Situacao {
  if (corte === null) return { tipo: 'sem-corte' }
  return pontos >= corte ? { tipo: 'atingiu', acima: pontos - corte } : { tipo: 'falta', faltam: corte - pontos }
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
