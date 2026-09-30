import { describe, expect, it } from 'vitest'

import { reducerSimulado } from './reducer'
import type { SimuladoEmAndamento } from './tipos'

const BASE: SimuladoEmAndamento = {
  versao: 1,
  id: 'sim-1',
  modo: 'completa',
  descricao: 'Prova completa',
  questaoIds: ['2099-001', '2099-002', '2099-003'],
  respostas: {},
  marcadas: [],
  indiceAtual: 0,
  iniciadoEm: 0,
  tempoLimiteS: 18000,
  pausavel: false,
  pausadoEm: null,
  pausadoTotalMs: 0,
}

describe('reducerSimulado (UT-002, UT-003)', () => {
  it('INICIAR substitui o estado', () => {
    expect(reducerSimulado(null, { tipo: 'INICIAR', simulado: BASE })).toEqual(BASE)
  })

  it('RESPONDER marca e a mesma letra desmarca', () => {
    const marcado = reducerSimulado(BASE, { tipo: 'RESPONDER', questaoId: '2099-001', letra: 'C' })
    expect(marcado?.respostas).toEqual({ '2099-001': 'C' })

    const trocado = reducerSimulado(marcado, { tipo: 'RESPONDER', questaoId: '2099-001', letra: 'D' })
    expect(trocado?.respostas).toEqual({ '2099-001': 'D' })

    const desmarcado = reducerSimulado(trocado, { tipo: 'RESPONDER', questaoId: '2099-001', letra: 'D' })
    expect(desmarcado?.respostas).toEqual({})
  })

  it('ALTERNAR_MARCADA liga e desliga o "revisar"', () => {
    const marcada = reducerSimulado(BASE, { tipo: 'ALTERNAR_MARCADA', questaoId: '2099-002' })
    expect(marcada?.marcadas).toEqual(['2099-002'])

    expect(reducerSimulado(marcada, { tipo: 'ALTERNAR_MARCADA', questaoId: '2099-002' })?.marcadas).toEqual([])
  })

  it('IR_PARA fica dentro do intervalo', () => {
    expect(reducerSimulado(BASE, { tipo: 'IR_PARA', indice: 2 })?.indiceAtual).toBe(2)
    expect(reducerSimulado(BASE, { tipo: 'IR_PARA', indice: 9 })?.indiceAtual).toBe(2)
    expect(reducerSimulado(BASE, { tipo: 'IR_PARA', indice: -1 })?.indiceAtual).toBe(0)
  })

  it('PAUSAR é ignorado em simulado não pausável', () => {
    expect(reducerSimulado(BASE, { tipo: 'PAUSAR', agora: 1000 })).toBe(BASE)
  })

  it('PAUSAR e RETOMAR acumulam o tempo pausado', () => {
    const pausavel = { ...BASE, pausavel: true }

    const pausado = reducerSimulado(pausavel, { tipo: 'PAUSAR', agora: 1000 })
    expect(pausado?.pausadoEm).toBe(1000)
    expect(reducerSimulado(pausado, { tipo: 'PAUSAR', agora: 5000 })).toBe(pausado)

    const retomado = reducerSimulado(pausado, { tipo: 'RETOMAR', agora: 61_000 })
    expect(retomado?.pausadoEm).toBeNull()
    expect(retomado?.pausadoTotalMs).toBe(60_000)
  })

  it('DESCARTAR limpa o estado', () => {
    expect(reducerSimulado(BASE, { tipo: 'DESCARTAR' })).toBeNull()
  })

  it('ações sem simulado não fazem nada', () => {
    expect(reducerSimulado(null, { tipo: 'RESPONDER', questaoId: 'x', letra: 'A' })).toBeNull()
  })
})
