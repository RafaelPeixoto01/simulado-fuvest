import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HistoricoEntry } from '../simulado/tipos'
import { entradaFalsa, instalarApiFalsa, json } from '../test/apiFalsa'
import { CHAVE_CONTA, CHAVE_HISTORICO, lerMarcaConta, listarHistorico, type MarcaConta } from './historicoStorage'
import { apagarHistoricoDoNavegador, historicoSemConta, sincronizarHistorico } from './sincronizacao'

function gravarLocal(lista: HistoricoEntry[], marca?: MarcaConta) {
  localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista))
  if (marca) localStorage.setItem(CHAVE_CONTA, JSON.stringify(marca))
}

const ids = (lista: HistoricoEntry[]) => lista.map((e) => e.id)

/** Servidor falso com as regras do backend: por id, imutável, mais recente primeiro, até 50. */
function servidor(inicial: HistoricoEntry[] = [], { recusar = [] as string[], aoEnviar = () => {} } = {}) {
  const guardadas = [...inicial]
  const envios: string[][] = []
  const lista = () => [...guardadas].sort((a, b) => b.finalizadoEm - a.finalizadoEm).slice(0, 50)
  const fetch = instalarApiFalsa({
    'GET /api/historico': () => json(200, { entradas: lista(), rejeitadas: [] }),
    'POST /api/historico': (corpo) => {
      const { entradas } = corpo as { entradas: HistoricoEntry[] }
      envios.push(ids(entradas))
      aoEnviar()
      for (const e of entradas) {
        if (!recusar.includes(e.id) && !guardadas.some((g) => g.id === e.id)) guardadas.push(e)
      }
      return json(200, { entradas: lista(), rejeitadas: ids(entradas).filter((i) => recusar.includes(i)) })
    },
  })
  return { envios, fetch, guardadas }
}

describe('sincronizarHistorico (UT-030, ADR-011)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('primeiro login: os simulados deste navegador vão para a conta (D1)', async () => {
    gravarLocal([entradaFalsa('a', 2), entradaFalsa('b', 1)])
    const s = servidor([entradaFalsa('c', 3)])

    const lista = await sincronizarHistorico(7)

    expect(s.envios).toEqual([['a', 'b']])
    expect(ids(lista)).toEqual(['c', 'a', 'b'])
    expect(ids(listarHistorico())).toEqual(['c', 'a', 'b'])
    expect(lerMarcaConta()).toEqual({ conta: 7, ids: ['c', 'a', 'b'] })
  })

  it('o que a marca já confirmou não é reenviado', async () => {
    gravarLocal([entradaFalsa('a', 1)], { conta: 7, ids: ['a'] })
    const s = servidor([entradaFalsa('a', 1)])

    await sincronizarHistorico(7)

    expect(s.envios).toEqual([])
    expect(s.fetch).toHaveBeenCalledWith('/api/historico', expect.anything())
  })

  it('só a pendente (feita sem rede) é enviada', async () => {
    gravarLocal([entradaFalsa('nova', 2), entradaFalsa('a', 1)], { conta: 7, ids: ['a'] })
    const s = servidor([entradaFalsa('a', 1)])

    await sincronizarHistorico(7)

    expect(s.envios).toEqual([['nova']])
    expect(lerMarcaConta()?.ids).toEqual(['nova', 'a'])
  })

  it('entrada apagada em outro dispositivo sai deste navegador', async () => {
    gravarLocal([entradaFalsa('a', 1)], { conta: 7, ids: ['a'] })
    servidor([])

    expect(await sincronizarHistorico(7)).toEqual([])
    expect(listarHistorico()).toEqual([])
  })

  it('o espelho de outra conta não vai para a conta nova', async () => {
    gravarLocal([entradaFalsa('da-outra', 2), entradaFalsa('sem-conta', 1)], { conta: 3, ids: ['da-outra'] })
    const s = servidor([])

    const lista = await sincronizarHistorico(7)

    expect(s.envios).toEqual([['sem-conta']])
    expect(ids(lista)).toEqual(['sem-conta'])
    expect(lerMarcaConta()).toEqual({ conta: 7, ids: ['sem-conta'] })
  })

  it('erro de rede não muda nada no navegador', async () => {
    gravarLocal([entradaFalsa('a', 1)])
    instalarApiFalsa({ 'POST /api/historico': () => json(500, { detail: 'Erro interno' }) })

    await expect(sincronizarHistorico(7)).rejects.toThrow()

    expect(ids(listarHistorico())).toEqual(['a'])
    expect(lerMarcaConta()).toBeNull()
  })

  it('recusada pelo servidor fica só neste navegador e é tentada de novo', async () => {
    gravarLocal([entradaFalsa('ruim', 2), entradaFalsa('boa', 1)])
    const s = servidor([], { recusar: ['ruim'] })

    const lista = await sincronizarHistorico(7)
    await sincronizarHistorico(7)

    expect(ids(lista)).toEqual(['ruim', 'boa'])
    expect(lerMarcaConta()?.ids).toEqual(['boa'])
    expect(s.envios).toEqual([['ruim', 'boa'], ['ruim']])
  })

  it('o que outra aba gravou durante a chamada continua aqui, pendente', async () => {
    gravarLocal([entradaFalsa('a', 1)])
    servidor([], {
      aoEnviar: () => gravarLocal([entradaFalsa('outra-aba', 5), ...listarHistorico()]),
    })

    const lista = await sincronizarHistorico(7)

    expect(ids(lista)).toEqual(['outra-aba', 'a'])
    expect(lerMarcaConta()?.ids).toEqual(['a'])
  })

  it('o navegador guarda no máximo 50, como a conta', async () => {
    servidor(Array.from({ length: 50 }, (_, i) => entradaFalsa(`s${i}`, 100 + i)))
    gravarLocal([entradaFalsa('velha', 1)])

    const lista = await sincronizarHistorico(7)

    expect(lista).toHaveLength(50)
    expect(ids(lista)).not.toContain('velha')
  })
})

describe('histórico sem conta (UT-031)', () => {
  beforeEach(() => localStorage.clear())

  it('sessão encerrada: sai o espelho da conta, ficam as pendentes (D1, D2)', () => {
    gravarLocal([entradaFalsa('da-conta', 2), entradaFalsa('pendente', 1)], { conta: 7, ids: ['da-conta'] })

    expect(ids(historicoSemConta())).toEqual(['pendente'])
    expect(localStorage.getItem(CHAVE_CONTA)).toBeNull()
  })

  it('sem marca, o histórico local fica como está', () => {
    gravarLocal([entradaFalsa('a', 1)])

    expect(ids(historicoSemConta())).toEqual(['a'])
  })

  it('apagar do navegador remove histórico e marca', () => {
    gravarLocal([entradaFalsa('a', 1)], { conta: 7, ids: ['a'] })

    apagarHistoricoDoNavegador()

    expect(localStorage.getItem(CHAVE_HISTORICO)).toBeNull()
    expect(localStorage.getItem(CHAVE_CONTA)).toBeNull()
  })

  it('marca corrompida é ignorada', () => {
    localStorage.setItem(CHAVE_CONTA, JSON.stringify({ conta: '7', ids: 'x' }))

    expect(lerMarcaConta()).toBeNull()
  })
})
