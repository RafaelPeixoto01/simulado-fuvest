import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_SIMULADO, carregarSimulado, descartarSimulado, salvarSimulado } from './simuladoStorage'
import { storageDisponivel } from './storage'

const SIMULADO: SimuladoEmAndamento = {
  versao: 1,
  id: 'sim-1',
  modo: 'ano',
  descricao: 'FUVEST 2025',
  questaoIds: ['2025-001'],
  respostas: { '2025-001': 'B' },
  marcadas: [],
  indiceAtual: 0,
  iniciadoEm: 123,
  tempoLimiteS: 18000,
  pausavel: false,
  pausadoEm: null,
  pausadoTotalMs: 0,
}

describe('simuladoStorage (UT-004 a UT-006)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('salva, carrega e descarta com chave versionada', () => {
    salvarSimulado(SIMULADO)

    expect(localStorage.getItem('simulado-fuvest:v1:em-andamento')).not.toBeNull()
    expect(CHAVE_SIMULADO).toBe('simulado-fuvest:v1:em-andamento')
    expect(carregarSimulado()).toEqual(SIMULADO)

    descartarSimulado()
    expect(carregarSimulado()).toBeNull()
  })

  it('JSON corrompido é descartado', () => {
    localStorage.setItem(CHAVE_SIMULADO, '{quebrado')

    expect(carregarSimulado()).toBeNull()
    expect(localStorage.getItem(CHAVE_SIMULADO)).toBeNull()
  })

  it('versão desconhecida ou formato inválido é descartado', () => {
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify({ ...SIMULADO, versao: 99 }))
    expect(carregarSimulado()).toBeNull()

    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify({ versao: 1, id: 'x' }))
    expect(carregarSimulado()).toBeNull()
  })

  it('storage que lança exceção não quebra o app', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })

    expect(storageDisponivel()).toBe(false)
    expect(() => salvarSimulado(SIMULADO)).not.toThrow()
    expect(carregarSimulado()).toBeNull()
  })

  it('storage normal está disponível', () => {
    expect(storageDisponivel()).toBe(true)
  })
})
