import type { SimuladoEmAndamento } from '../simulado/tipos'
import { gravarJSON, lerJSON, remover } from './storage'

export const CHAVE_SIMULADO = 'simulado-fuvest:v1:em-andamento'

const MODOS = ['completa', 'personalizado', 'ano']

function ehNumeroOuNulo(v: unknown): boolean {
  return v === null || typeof v === 'number'
}

function valido(v: unknown): v is SimuladoEmAndamento {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    s.versao === 1 &&
    typeof s.id === 'string' &&
    MODOS.includes(s.modo as string) &&
    typeof s.descricao === 'string' &&
    Array.isArray(s.questaoIds) &&
    s.questaoIds.every((id) => typeof id === 'string') &&
    typeof s.respostas === 'object' &&
    s.respostas !== null &&
    Array.isArray(s.marcadas) &&
    typeof s.indiceAtual === 'number' &&
    typeof s.iniciadoEm === 'number' &&
    ehNumeroOuNulo(s.tempoLimiteS) &&
    typeof s.pausavel === 'boolean' &&
    ehNumeroOuNulo(s.pausadoEm) &&
    typeof s.pausadoTotalMs === 'number'
  )
}

export function carregarSimulado(): SimuladoEmAndamento | null {
  const salvo = lerJSON(CHAVE_SIMULADO)
  if (salvo === null) return null
  if (!valido(salvo)) {
    remover(CHAVE_SIMULADO) // versao desconhecida ou formato quebrado
    return null
  }
  return salvo
}

export function salvarSimulado(simulado: SimuladoEmAndamento): boolean {
  return gravarJSON(CHAVE_SIMULADO, simulado)
}

export function descartarSimulado(): void {
  remover(CHAVE_SIMULADO)
}
