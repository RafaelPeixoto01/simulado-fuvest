import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

const IDS = ['2099-001', '2099-002', '2099-003']

function salvarSimulado() {
  const s: SimuladoEmAndamento = {
    versao: 1, id: 'sim-1', modo: 'personalizado', descricao: 'Personalizado: Física, 3 questões', questaoIds: IDS,
    respostas: {}, marcadas: [], indiceAtual: 1, iniciadoEm: Date.now(), tempoLimiteS: 600, pausavel: true,
    pausadoEm: null, pausadoTotalMs: 0,
  }
  localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(s))
}

function apiDeQuestoes() {
  instalarApiFalsa({
    'GET /api/questoes': (_c, url) =>
      json(200, {
        questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)),
        textos_base: {},
        nao_encontradas: [],
      }),
  })
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Identidade "Papel & Caneta" (UT-048, CR-008)', () => {
  it('o número da questão fica numa bolinha, e o título continua "Questão i de n" para o leitor de tela', async () => {
    salvarSimulado()
    apiDeQuestoes()
    renderizar(<App />, { rota: '/simulado' })

    const titulo = await screen.findByRole('heading', { level: 2, name: 'Questão 2 de 3' })
    const bolinha = within(titulo).getByText('2')
    expect(bolinha).toHaveClass('rounded-full', 'border-optico', 'text-optico-texto')
    expect(within(titulo).getByText('Questão')).toHaveClass('sr-only')
    expect(titulo).toHaveClass('font-titulo')
  })

  it('o cronômetro usa a fonte de títulos', async () => {
    salvarSimulado()
    apiDeQuestoes()
    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByRole('timer')).toHaveClass('font-titulo')
  })

  it('a marca é uma bolinha só (anel e miolo), com o nome em Fraunces', async () => {
    instalarApiFalsa({})
    renderizar(<App />, { rota: '/privacidade' })

    const marca = await screen.findByRole('link', { name: 'Simulado Fuvest' })
    expect(marca).toHaveClass('font-titulo')
    const svg = marca.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg.querySelectorAll('circle')).toHaveLength(2)
  })
})
