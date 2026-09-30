import type { HistoricoEntry } from '../simulado/tipos'
import { gravarJSON, lerJSON, remover } from './storage'

export const CHAVE_HISTORICO = 'simulado-fuvest:v1:historico'
export const LIMITE_HISTORICO = 50

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

export function obterDoHistorico(id: string): HistoricoEntry | null {
  return listarHistorico().find((e) => e.id === id) ?? null
}

export function limparHistorico(): void {
  remover(CHAVE_HISTORICO)
}
