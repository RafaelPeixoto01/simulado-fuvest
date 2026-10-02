import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { instalarApiFalsa, json } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { Sessao, Vitrine } from '../types'

const SEM_LOGIN: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }
const BASE: Vitrine = { total_questoes: 270, anos: [2023, 2024, 2025] }

function api(vitrine: () => Response) {
  return instalarApiFalsa({ 'GET /api/sessao': () => json(200, SEM_LOGIN), 'GET /api/vitrine': vitrine })
}

const apresentacao = () =>
  screen.findByRole('heading', { level: 1, name: 'Treine com questões reais da 1ª fase da FUVEST' })

const textos = (papel: 'term' | 'definition') => screen.queryAllByRole(papel).map((e) => e.textContent)

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Números da base na apresentação (UT-043, O1.1)', () => {
  it('mostra questões, provas e anos vindos da vitrine', async () => {
    api(() => json(200, BASE))
    renderizar(<App />)

    await screen.findAllByRole('term')
    // No jsdom as variantes de largura não somem: valem os textos completos (≥ 640 px)
    expect(textos('term')).toEqual(['questões reais', 'provas completas', 'anos na base'])
    expect(textos('definition')).toEqual(['270', '3', '2023–2025'])
  })

  it('com um ano só, singular e sem período', async () => {
    api(() => json(200, { total_questoes: 90, anos: [2025] }))
    renderizar(<App />)

    await screen.findAllByRole('term')
    expect(textos('term')).toEqual(['questões reais', 'prova completa', 'ano na base'])
    expect(textos('definition')).toEqual(['90', '1', '2025'])
  })

  it.each([
    ['com erro na vitrine', () => json(500, { detail: 'erro' })],
    ['com a base vazia', () => json(200, { total_questoes: 0, anos: [] })],
  ])('%s, a página aparece sem os números', async (_caso, vitrine) => {
    const falso = api(vitrine)
    renderizar(<App />)

    await apresentacao()
    await waitFor(() => expect(falso.mock.calls.some(([url]) => String(url) === '/api/vitrine')).toBe(true))
    await new Promise((r) => setTimeout(r, 0))
    expect(textos('term')).toEqual([])
    expect(screen.queryByText(/^0$/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toBeInTheDocument()
  })

  it('o aviso começa por "É grátis." e o botão do Google tem 52 px', async () => {
    api(() => json(200, BASE))
    renderizar(<App />)

    await apresentacao()
    expect(
      screen.getByText(/^É grátis\. Guardamos só seu nome, seu e-mail, os resultados dos simulados concluídos e a carreira-alvo/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Para usar o site, entre com a sua conta Google/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveClass('h-13')
  })
})

describe('Prévia e modos da apresentação (UT-044, O1.2 e O1.3)', () => {
  it('a prévia é decorativa, com uma descrição em texto para leitores de tela', async () => {
    api(() => json(200, BASE))
    renderizar(<App />)

    await apresentacao()
    expect(screen.getByText(/^Prévia da tela de resolução: uma questão de História da FUVEST 2025/)).toBeInTheDocument()
    expect(screen.getByText('Ao lado, o desempenho por disciplina de um resultado.')).toBeInTheDocument()
    for (const visual of ['de 90', 'Folha 12/90', '58 de 90 acertos']) {
      expect(screen.getByText(visual).closest('[aria-hidden="true"]')).not.toBeNull()
    }
    // Nada da miniatura vira controle de verdade
    expect(screen.queryByRole('button', { name: /Próxima|Anterior|Revisar/ })).toBeNull()
  })

  it('os quatro modos ficam em cartões com as bolinhas A–D da folha', async () => {
    api(() => json(200, BASE))
    renderizar(<App />)

    await apresentacao()
    const modos = screen.getByRole('region', { name: 'Quatro jeitos de treinar' })
    const cartoes = within(modos).getAllByRole('listitem')
    expect(cartoes.map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Prova completa',
      'Prova de um ano',
      'Personalizado',
      'Treino por questão',
    ])
    cartoes.forEach((cartao, i) => {
      const bolinha = within(cartao).getByText('ABCD'[i])
      expect(bolinha).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
