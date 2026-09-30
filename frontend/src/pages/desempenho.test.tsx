import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry } from '../simulado/tipos'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { CATALOGO, instalarApiFalsa, json } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { ItemCorrigido } from '../types'

function itens(n: number, base: Omit<ItemCorrigido, 'questao_id'>, inicio: number): ItemCorrigido[] {
  return Array.from({ length: n }, (_, i) => ({ ...base, questao_id: `2099-${String(inicio + i).padStart(3, '0')}` }))
}

const certo = { resposta: 'A', correta: 'A', anulada: false, acertou: true } as const
const errado = { resposta: null, correta: 'A', anulada: false, acertou: false } as const

// Física: óptica 5/5; eletrodinâmica 0/2 (poucas); Química: 1 de 2 (orgânica) + 1 anulada fora da conta
const ENTRADA: HistoricoEntry = {
  versao: 1,
  id: 'sim-1',
  modo: 'ano',
  descricao: 'FUVEST 2099',
  iniciadoEm: 0,
  finalizadoEm: 1,
  tempoGastoMs: 1,
  tempoLimiteS: 18000,
  finalizadoPorTempo: false,
  questaoIds: [],
  resultado: {
    itens: [
      ...itens(5, { ...certo, disciplina: 'fisica', assunto: 'optica' }, 1),
      ...itens(2, { ...errado, disciplina: 'fisica', assunto: 'eletrodinamica' }, 6),
      ...itens(1, { ...certo, disciplina: 'quimica', assunto: 'organica' }, 8),
      ...itens(1, { ...errado, disciplina: 'quimica', assunto: 'organica' }, 9),
      ...itens(1, { resposta: 'B', correta: null, anulada: true, acertou: true, disciplina: 'quimica', assunto: 'organica' }, 10),
    ],
    total: 10,
    acertos: 7,
    percentual: 70,
    por_disciplina: [],
    ignoradas: [],
  },
}

// Resultado anterior ao CR-004: itens sem assunto
const ANTIGA: HistoricoEntry = {
  ...ENTRADA,
  id: 'sim-0',
  resultado: {
    ...ENTRADA.resultado,
    itens: [{ questao_id: '2098-001', resposta: null, correta: 'C', anulada: false, acertou: false, disciplina: 'fisica' }],
  },
}

describe('Painel "Meu desempenho" (UT-026, RF-022)', () => {
  beforeEach(() => {
    localStorage.clear()
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, CATALOGO) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sem histórico, convida a começar um simulado', async () => {
    renderizar(<App />, { rota: '/desempenho' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Meu desempenho' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum simulado concluído ainda.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Começar um simulado' })).toHaveAttribute('href', '/')
  })

  it('soma o histórico por disciplina e assunto, do pior para o melhor', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA, ANTIGA]))

    renderizar(<App />, { rota: '/desempenho' })

    expect(await screen.findByText(/somam os simulados concluídos neste navegador/)).toBeInTheDocument()
    // 2 simulados; 10 questões contadas (a anulada fica fora); 6 acertos = 60%
    expect(screen.getByText('Simulados').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Questões').nextSibling).toHaveTextContent('10')
    expect(screen.getByText('Acertos').nextSibling).toHaveTextContent('60%')

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Química', 'Física']) // 50% antes de 62,5%

    const fisica = screen.getByRole('list', { name: 'Assuntos de Física' })
    // Nome atual vem do catálogo (chega depois: até lá, o slug); "poucas questões" e "Sem assunto" no fim
    expect(await within(fisica).findByText('Óptica')).toBeInTheDocument()
    const linhas = within(fisica).getAllByRole('listitem').map((li) => li.textContent)
    expect(linhas[0]).toMatch(/^Óptica.*5 de 5 \(100%\)$/)
    expect(linhas[1]).toMatch(/^Eletrodinâmica e circuitos.*poucas questões.*0 de 2 \(0%\)$/)
    expect(linhas[2]).toMatch(/^Sem assunto.*0 de 1/)

    const quimica = screen.getByRole('list', { name: 'Assuntos de Química' })
    expect(within(quimica).getByText('Química orgânica')).toBeInTheDocument()
    expect(within(quimica).getByText('1 de 2 (50%)')).toBeInTheDocument()
  })

  it('sem o catálogo, usa os slugs e nomes gravados no histórico', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(500, { detail: 'erro' }) })
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))

    renderizar(<App />, { rota: '/desempenho' })

    const fisica = await screen.findByRole('list', { name: 'Assuntos de Física' })
    expect(within(fisica).getByText('optica')).toBeInTheDocument()
  })

  it('cabeçalho e histórico levam ao painel', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/historico' })

    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Desempenho', 'Histórico'])

    await userEvent.click(screen.getByRole('link', { name: 'Ver meu desempenho' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Meu desempenho' })).toBeInTheDocument()
  })
})
