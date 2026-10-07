import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry } from '../simulado/tipos'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { CATALOGO, entradaFalsa, instalarApiFalsa, json, simuladoFalso } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { Catalogo, DesempenhoDisciplina, Sessao } from '../types'

const ANA = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const COM_LOGIN: Sessao = { login_disponivel: true, usuario: ANA, acesso: 'conta' }

function api(sessao?: Sessao, historico: HistoricoEntry[] = [], catalogo: Catalogo = CATALOGO) {
  return instalarApiFalsa({
    ...(sessao ? { 'GET /api/sessao': () => json(200, sessao) } : {}),
    'GET /api/catalogo': () => json(200, catalogo),
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

/** A lista dos outros modos, logo depois do cartão da Prova completa. */
const modos = (destaque: HTMLElement) => destaque.nextElementSibling as HTMLElement

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
    // A bolinha A (a miniatura da folha também tem um "A", no cabeçalho)
    expect(within(destaque).getAllByText('A').some((e) => e.getAttribute('aria-hidden') === 'true')).toBe(true)
    const marcas = destaque.querySelector('[aria-hidden="true"].absolute')!
    expect(marcas.children).toHaveLength(8)

    const cartoes = within(modos(destaque)).getAllByRole('listitem')
    expect(cartoes.map((c) => within(c).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Prova de um ano',
      'Personalizado',
      'Treino por questão',
    ])
    cartoes.forEach((c, i) => expect(within(c).getByText('BCD'[i])).toHaveAttribute('aria-hidden', 'true'))
    expect(within(cartoes[0]).getByRole('link', { name: 'Escolher o ano' })).toHaveAttribute('href', '/novo/ano')
  })
})

describe('Extras do início (UT-053, CR-009)', () => {
  it('a Prova completa tem o sobretítulo, as etiquetas e a miniatura decorativa da folha', async () => {
    api(COM_LOGIN)
    renderizar(<App />)

    const destaque = await screen.findByRole('region', { name: 'Prova completa' })
    // Caixa alta só no CSS: o leitor de tela lê a frase, e não letra por letra
    const sobretitulo = within(destaque).getByText('A mais próxima da prova real')
    expect(sobretitulo).toHaveClass('uppercase')
    const h2 = within(destaque).getByRole('heading', { level: 2, name: 'Prova completa' })
    expect(sobretitulo.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // "8 disciplinas" vem da distribuição da prova completa
    const etiquetas = within(destaque).getByRole('list')
    expect(within(etiquetas).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '80 questões',
      '5 horas',
      '8 disciplinas',
    ])

    const miniatura = within(destaque).getByText('01').closest('[aria-hidden="true"]')!
    expect(miniatura).not.toBeNull()
    expect(within(miniatura as HTMLElement).getAllByText(/^0[1-5]$/)).toHaveLength(5)
    // Uma bolinha marcada a caneta em cada linha
    expect(miniatura.querySelectorAll('.bg-caneta')).toHaveLength(5)
  })

  it('a etiqueta das disciplinas segue a distribuição: singular com uma, ausente sem nenhuma', async () => {
    api(COM_LOGIN, [], { ...CATALOGO, distribuicao_completa: { biologia: 90, fisica: 0 } })
    const { unmount } = renderizar(<App />)
    let destaque = await screen.findByRole('region', { name: 'Prova completa' })
    expect(within(within(destaque).getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '80 questões',
      '5 horas',
      '1 disciplina',
    ])
    unmount()

    api(COM_LOGIN, [], { ...CATALOGO, distribuicao_completa: {} })
    renderizar(<App />)
    destaque = await screen.findByRole('region', { name: 'Prova completa' })
    expect(within(within(destaque).getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '80 questões',
      '5 horas',
    ])
  })

  it('no celular, o link de cada modo cobre o cartão e mostra a seta; o nome continua sendo a ação', async () => {
    api(COM_LOGIN)
    renderizar(<App />)

    const destaque = await screen.findByRole('region', { name: 'Prova completa' })
    const cartoes = within(modos(destaque)).getAllByRole('listitem')
    const acoes = [
      ['Escolher o ano', '/novo/ano'],
      ['Montar simulado', '/novo/personalizado'],
      ['Treinar', '/treino'],
    ]
    cartoes.forEach((cartao, i) => {
      const [nome, rota] = acoes[i]
      const link = within(cartao).getByRole('link', { name: nome })
      expect(link).toHaveAttribute('href', rota)
      // O ::after absoluto do link ocupa o cartão (relative) abaixo de 640 px
      expect(cartao).toHaveClass('relative')
      expect(link).toHaveClass('after:absolute', 'after:inset-0', 'sm:after:hidden')
      // O texto da ação some da tela no celular (fica para o leitor de tela) e a seta aparece
      expect(within(link).getByText(nome)).toHaveClass('max-sm:sr-only')
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })
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

describe('Inéditas primeiro com conta (FT-028, CR-015)', () => {
  const doOutroAparelho = { ...entradaFalsa('outro-aparelho', 1000), questaoIds: ['2024-001', '2024-002'] }

  function apiDeGeracao(historico: () => Promise<Response>) {
    const pedidos: unknown[] = []
    instalarApiFalsa({
      'GET /api/sessao': () => json(200, COM_LOGIN),
      'GET /api/catalogo': () => json(200, CATALOGO),
      'GET /api/historico': historico,
      'POST /api/simulados': (corpo) => {
        pedidos.push(corpo)
        return json(200, simuladoFalso(['2025-001']))
      },
    })
    return pedidos
  }

  it('espera a sincronização: num aparelho novo, o navegador ainda não tem o histórico da conta', async () => {
    let liberar!: () => void
    const sincronizou = new Promise<void>((resolver) => (liberar = resolver))
    const pedidos = apiDeGeracao(async () => {
      await sincronizou
      return json(200, { entradas: [doOutroAparelho], rejeitadas: [] })
    })

    renderizar(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Começar prova completa' }))
    await new Promise((r) => setTimeout(r, 50))
    expect(pedidos).toHaveLength(0)

    liberar()
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]).toEqual({ modo: 'completa', vistas: ['2024-001', '2024-002'] })
  })

  it('se a sincronização falhar, gera com o que está no navegador', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([{ ...entradaFalsa('local', 2000), questaoIds: ['2023-005'] }]))
    const pedidos = apiDeGeracao(async () => json(500, { detail: 'Erro interno' }))

    renderizar(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Começar prova completa' }))

    await waitFor(() => expect(pedidos).toHaveLength(1), { timeout: 5000 })
    expect(pedidos[0]).toEqual({ modo: 'completa', vistas: ['2023-005'] })
  })
})
