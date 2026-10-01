import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HistoricoEntry } from '../simulado/tipos'
import {
  CHAVE_HISTORICO,
  LIMITE_HISTORICO,
  adicionarAoHistorico,
  limparHistorico,
  listarHistorico,
} from './historicoStorage'

function entrada(id: string): HistoricoEntry {
  return {
    versao: 1,
    id,
    modo: 'completa',
    descricao: 'Prova completa',
    iniciadoEm: 1,
    finalizadoEm: 2,
    tempoGastoMs: 1,
    tempoLimiteS: 18000,
    finalizadoPorTempo: false,
    questaoIds: ['2099-001'],
    resultado: { itens: [], total: 1, acertos: 1, percentual: 100, por_disciplina: [], ignoradas: [] },
  }
}

describe('historicoStorage (UT-020)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('mais recente primeiro', () => {
    adicionarAoHistorico(entrada('a'))
    adicionarAoHistorico(entrada('b'))

    expect(listarHistorico().map((e) => e.id)).toEqual(['b', 'a'])
    expect(CHAVE_HISTORICO).toBe('simulado-fuvest:v1:historico')
  })

  it('guarda no máximo 50: o mais antigo sai', () => {
    for (let i = 0; i < LIMITE_HISTORICO + 1; i++) adicionarAoHistorico(entrada(`e${i}`))

    const lista = listarHistorico()
    expect(LIMITE_HISTORICO).toBe(50)
    expect(lista).toHaveLength(50)
    expect(lista[0].id).toBe('e50')
    expect(lista.some((e) => e.id === 'e0')).toBe(false)
  })

  it('limpar apaga tudo', () => {
    adicionarAoHistorico(entrada('a'))
    limparHistorico()
    expect(listarHistorico()).toEqual([])
  })

  it('entradas inválidas são ignoradas', () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([entrada('ok'), { versao: 9 }, 'lixo']))
    expect(listarHistorico().map((e) => e.id)).toEqual(['ok'])
  })

  it('storage indisponível: gravar devolve false e ler devolve vazio', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })

    expect(adicionarAoHistorico(entrada('a'))).toBe(false)
    expect(listarHistorico()).toEqual([])
  })
})
