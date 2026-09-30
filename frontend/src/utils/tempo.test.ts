import { describe, expect, it } from 'vitest'

import type { SimuladoEmAndamento } from '../simulado/tipos'
import { decorridoMs, formatarDuracao, formatarTempo, restanteMs } from './tempo'

function simulado(extra: Partial<SimuladoEmAndamento> = {}): SimuladoEmAndamento {
  return {
    versao: 1,
    id: 'x',
    modo: 'personalizado',
    descricao: 'teste',
    questaoIds: ['2099-001'],
    respostas: {},
    marcadas: [],
    indiceAtual: 0,
    iniciadoEm: 1_000_000,
    tempoLimiteS: 600,
    pausavel: true,
    pausadoEm: null,
    pausadoTotalMs: 0,
    ...extra,
  }
}

describe('tempo (UT-001)', () => {
  it('conta o tempo decorrido pelo relógio', () => {
    const s = simulado()

    expect(decorridoMs(s, 1_000_000 + 90_000)).toBe(90_000)
    expect(restanteMs(s, 1_000_000 + 90_000)).toBe(510_000)
  })

  it('desconta pausas já encerradas', () => {
    const s = simulado({ pausadoTotalMs: 30_000 })

    expect(restanteMs(s, 1_000_000 + 90_000)).toBe(540_000)
  })

  it('pausa em curso não consome tempo', () => {
    const s = simulado({ pausadoEm: 1_000_000 + 60_000 })

    expect(restanteMs(s, 1_000_000 + 60_000)).toBe(540_000)
    expect(restanteMs(s, 1_000_000 + 3_600_000)).toBe(540_000)
  })

  it('nunca fica negativo', () => {
    expect(restanteMs(simulado(), 1_000_000 + 10_000_000)).toBe(0)
  })

  it('sem cronômetro não há tempo restante', () => {
    expect(restanteMs(simulado({ tempoLimiteS: null }), 2_000_000)).toBeNull()
  })

  it('formata hh:mm:ss', () => {
    expect(formatarTempo(3_723_000)).toBe('01:02:03')
    expect(formatarTempo(59_999)).toBe('00:01:00')
    expect(formatarTempo(0)).toBe('00:00:00')
  })

  it('formata duração por extenso', () => {
    expect(formatarDuracao(2 * 3_600_000 + 13 * 60_000)).toBe('2 h 13 min')
    expect(formatarDuracao(45_000)).toBe('45 s')
    expect(formatarDuracao(125_000)).toBe('2 min 5 s')
  })
})
