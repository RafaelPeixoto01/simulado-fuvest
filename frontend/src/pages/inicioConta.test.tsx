import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry } from '../simulado/tipos'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { CATALOGO, entradaFalsa, instalarApiFalsa, json } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { DesempenhoDisciplina, Sessao } from '../types'

const ANA = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const COM_LOGIN: Sessao = { login_disponivel: true, usuario: ANA, acesso: 'conta' }

function api(sessao?: Sessao, historico: HistoricoEntry[] = []) {
  return instalarApiFalsa({
    ...(sessao ? { 'GET /api/sessao': () => json(200, sessao) } : {}),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/historico': () => json(200, { entradas: historico, rejeitadas: [] }),
    'POST /api/historico': () => json(200, { entradas: historico, rejeitadas: [] }),
  })
}

const disciplina = (d: DesempenhoDisciplina['disciplina'], total: number, acertos: number): DesempenhoDisciplina => ({
  disciplina: d, total, acertos, percentual: Math.round((1000 * acertos) / total) / 10,
})

/** Resultado de 58 de 90 com Inglês 40%, Biologia e História 50% e Física 100%. */
function simulado(id: string, finalizadoEm: number, descricao = 'FUVEST 2025'): HistoricoEntry {
  const base = entradaFalsa(id, finalizadoEm)
  return {
    ...base,
    descricao,
    resultado: {
      ...base.resultado,
      total: 90,
      acertos: 58,
      percentual: 64.4,
      por_disciplina: [
        disciplina('fisica', 10, 10),
        disciplina('historia', 10, 5),
        disciplina('ingles', 10, 4),
        disciplina('biologia', 10, 5),
      ],
    },
  }
}

const titulo = () => screen.findByRole('heading', { level: 1, name: 'Treine com questões reais da 1ª fase da FUVEST' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Início com conta: saudação e modos (UT-049, CR-008)', () => {
  it('cumprimenta pelo primeiro nome, acima do título', async () => {
    api(COM_LOGIN)
    renderizar(<App />)

    const h1 = await titulo()
    const saudacao = screen.getByText('Olá, Ana.')
    expect(saudacao.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // O círculo de caneta em "reais" é decorativo e não muda o nome do título
    expect(h1.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sem nome na conta, ou sem conta, não há saudação', async () => {
    api({ ...COM_LOGIN, usuario: { ...ANA, nome: null } })
    const { unmount } = renderizar(<App />)
    await titulo()
    expect(screen.queryByText(/^Olá/)).toBeNull()
    unmount()

    api()
    renderizar(<App />)
    await titulo()
    expect(screen.queryByText(/^Olá/)).toBeNull()
  })

  it('a Prova completa fica em destaque, com a bolinha A e as marcas de sincronismo; os outros modos em cartões B–D', async () => {
    api(COM_LOGIN)
    renderizar(<App />)

    const destaque = await screen.findByRole('region', { name: 'Prova completa' })
    expect(within(destaque).getByRole('button', { name: 'Começar prova completa' })).toBeEnabled()
    expect(within(destaque).getByText('A')).toHaveAttribute('aria-hidden', 'true')
    const marcas = destaque.querySelector('[aria-hidden="true"].absolute')!
    expect(marcas.children).toHaveLength(8)

    const cartoes = within(destaque.parentElement!).getAllByRole('listitem')
    expect(cartoes.map((c) => within(c).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Prova de um ano',
      'Personalizado',
      'Treino por questão',
    ])
    cartoes.forEach((c, i) => expect(within(c).getByText('BCD'[i])).toHaveAttribute('aria-hidden', 'true'))
    expect(within(cartoes[0]).getByRole('link', { name: 'Escolher o ano' })).toHaveAttribute('href', '/novo/ano')
  })
})

describe('"Seu último simulado" (UT-050, CR-008)', () => {
  it('mostra o mais recente: acertos, aproveitamento, as duas mais fracas e os links', async () => {
    localStorage.setItem(
      CHAVE_HISTORICO,
      JSON.stringify([simulado('antigo', 1000, 'FUVEST 2023'), simulado('recente', 2000, 'FUVEST 2025')]),
    )
    api()
    renderizar(<App />)

    const cartao = await screen.findByRole('region', { name: 'Seu último simulado' })
    expect(within(cartao).getByText(/^FUVEST 2025 · /)).toBeInTheDocument()
    expect(within(cartao).getByText('58', { exact: false })).toHaveTextContent('58 de 90')
    expect(within(cartao).getByText('64,4% de aproveitamento')).toBeInTheDocument()
    // Menor aproveitamento primeiro; Biologia e História empatam em 50% e vale o nome
    expect(within(cartao).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Inglês40%', 'Biologia50%'])
    expect(within(cartao).getByRole('link', { name: 'Ver o resultado' })).toHaveAttribute('href', '/resultado/recente')
    expect(within(cartao).getByRole('link', { name: 'Meu desempenho' })).toHaveAttribute('href', '/desempenho')
  })

  it('com conta, usa o histórico da conta', async () => {
    api(COM_LOGIN, [simulado('da-conta', 3000, 'Prova completa')])
    renderizar(<App />)

    const cartao = await screen.findByRole('region', { name: 'Seu último simulado' })
    expect(within(cartao).getByText(/^Prova completa · /)).toBeInTheDocument()
    expect(within(cartao).getByRole('link', { name: 'Ver o resultado' })).toHaveAttribute('href', '/resultado/da-conta')
  })

  it('sem histórico, o cartão não aparece', async () => {
    api()
    renderizar(<App />)

    await screen.findByRole('button', { name: 'Começar prova completa' })
    expect(screen.queryByRole('region', { name: 'Seu último simulado' })).toBeNull()
  })
})
