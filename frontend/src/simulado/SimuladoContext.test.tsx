import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { SimuladoProvider } from './SimuladoContext'
import type { SimuladoEmAndamento } from './tipos'
import { useSimulado } from './useSimulado'

const SIMULADO: SimuladoEmAndamento = {
  versao: 1,
  id: 'sim-1',
  modo: 'completa',
  descricao: 'Prova completa',
  questaoIds: ['2099-001', '2099-002'],
  respostas: {},
  marcadas: [],
  indiceAtual: 0,
  iniciadoEm: 0,
  tempoLimiteS: 18000,
  pausavel: false,
  pausadoEm: null,
  pausadoTotalMs: 0,
}

const envolver = ({ children }: { children: ReactNode }) => <SimuladoProvider>{children}</SimuladoProvider>

describe('SimuladoContext (UT-004)', () => {
  beforeEach(() => localStorage.clear())

  it('cada ação é gravada no storage e DESCARTAR remove a chave', () => {
    const { result } = renderHook(() => useSimulado(), { wrapper: envolver })

    act(() => result.current.despachar({ tipo: 'INICIAR', simulado: SIMULADO }))
    act(() => result.current.despachar({ tipo: 'RESPONDER', questaoId: '2099-002', letra: 'E' }))

    expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).respostas).toEqual({ '2099-002': 'E' })

    act(() => result.current.despachar({ tipo: 'DESCARTAR' }))
    expect(localStorage.getItem(CHAVE_SIMULADO)).toBeNull()
    expect(result.current.simulado).toBeNull()
  })

  it('retoma o simulado salvo ao montar', () => {
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify({ ...SIMULADO, indiceAtual: 1 }))

    const { result } = renderHook(() => useSimulado(), { wrapper: envolver })

    expect(result.current.simulado?.indiceAtual).toBe(1)
    expect(result.current.storageOk).toBe(true)
  })
})
