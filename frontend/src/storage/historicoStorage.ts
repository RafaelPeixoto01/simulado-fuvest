import type { HistoricoEntry } from '../simulado/tipos'
import { gravarJSON, lerJSON, remover } from './storage'

export const CHAVE_HISTORICO = 'simulado-fuvest:v1:historico'
export const CHAVE_CONTA = 'simulado-fuvest:v1:historico-conta'
export const LIMITE_HISTORICO = 50 // o mesmo na conta (CR-005, D4)

/** Ids que o servidor já confirmou para a conta conectada neste navegador (ADR-011). */
export interface MarcaConta {
  conta: number
  ids: string[]
}

const MODOS = ['completa', 'personalizado', 'ano']

function valida(v: unknown): v is HistoricoEntry {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  const resultado = e.resultado as Record<string, unknown> | undefined
  return (
    e.versao === 1 &&
    typeof e.id === 'string' &&
    MODOS.includes(e.modo as string) &&
    typeof e.descricao === 'string' &&
    typeof e.finalizadoEm === 'number' &&
    typeof e.tempoGastoMs === 'number' &&
    Array.isArray(e.questaoIds) &&
    !!resultado &&
    Array.isArray(resultado.itens) &&
    typeof resultado.acertos === 'number'
  )
}

/** Mais recente primeiro. Entradas inválidas (versão antiga, lixo) são ignoradas. */
export function listarHistorico(): HistoricoEntry[] {
  const salvo = lerJSON(CHAVE_HISTORICO)
  return Array.isArray(salvo) ? salvo.filter(valida) : []
}

export function adicionarAoHistorico(entrada: HistoricoEntry): boolean {
  const lista = [entrada, ...listarHistorico().filter((e) => e.id !== entrada.id)]
  return gravarJSON(CHAVE_HISTORICO, lista.slice(0, LIMITE_HISTORICO))
}

export function limparHistorico(): void {
  remover(CHAVE_HISTORICO)
}

/** Troca a lista inteira (espelho da conta). Ela já vem do mais recente para o mais antigo. */
export function substituirHistorico(lista: HistoricoEntry[]): boolean {
  return gravarJSON(CHAVE_HISTORICO, lista.slice(0, LIMITE_HISTORICO))
}

export function lerMarcaConta(): MarcaConta | null {
  const salvo = lerJSON(CHAVE_CONTA) as Record<string, unknown> | null
  if (!salvo || typeof salvo !== 'object' || typeof salvo.conta !== 'number') return null
  const ids = salvo.ids
  if (!Array.isArray(ids) || !ids.every((i) => typeof i === 'string')) return null
  return { conta: salvo.conta, ids }
}

export function gravarMarcaConta(marca: MarcaConta): boolean {
  return gravarJSON(CHAVE_CONTA, marca)
}

export function removerMarcaConta(): void {
  remover(CHAVE_CONTA)
}
