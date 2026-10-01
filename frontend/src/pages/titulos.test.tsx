import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { CATALOGO, instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

// P2.5 (CR-002, WCAG 2.4.2): cada rota tem um título próprio
describe('Título da página por rota', () => {
  beforeEach(() => {
    localStorage.clear()
    document.title = 'Simulado Fuvest'
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'GET /api/questoes': (_c, url) =>
        json(200, {
          questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)),
          textos_base: {},
          nao_encontradas: [],
        }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['/', 'Simulado Fuvest'],
    ['/novo/personalizado', 'Simulado personalizado · Simulado Fuvest'],
    ['/novo/ano', 'Prova de um ano · Simulado Fuvest'],
    ['/treino', 'Treino por questão · Simulado Fuvest'],
    ['/historico', 'Histórico · Simulado Fuvest'],
    ['/desempenho', 'Meu desempenho · Simulado Fuvest'],
    ['/resultado/nao-existe', 'Resultado · Simulado Fuvest'],
    ['/rota-que-nao-existe', 'Página não encontrada · Simulado Fuvest'],
  ])('%s → "%s"', async (rota, titulo) => {
    document.title = 'outro'
    renderizar(<App />, { rota })
    await waitFor(() => expect(document.title).toBe(titulo))
  })

  it('na resolução, o título traz a descrição do simulado', async () => {
    const s: SimuladoEmAndamento = {
      versao: 1,
      id: 'sim-t',
      modo: 'ano',
      descricao: 'FUVEST 2099',
      questaoIds: ['2099-001'],
      respostas: {},
      marcadas: [],
      indiceAtual: 0,
      iniciadoEm: Date.now(),
      tempoLimiteS: 18000,
      pausavel: false,
      pausadoEm: null,
      pausadoTotalMs: 0,
    }
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(s))
    renderizar(<App />, { rota: '/simulado' })
    await waitFor(() => expect(document.title).toBe('FUVEST 2099 · Simulado Fuvest'))
  })
})
