import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { criarQueryClient } from '../queryClient'
import { SimuladoProvider } from '../simulado/SimuladoContext'
import { CATALOGO, instalarApiFalsa, json } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { Sessao } from '../types'

const ANA = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const COM_LOGIN: Sessao = { login_disponivel: true, usuario: ANA, acesso: 'conta' }
const SEM_LOGIN: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }

function api(sessao: Sessao) {
  return instalarApiFalsa({
    'GET /api/sessao': () => json(200, sessao),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/historico': () => json(200, { entradas: [], rejeitadas: [] }),
  })
}

const botaoMenu = () => screen.findByRole('button', { name: 'Menu' })
const painel = () => screen.getByRole('navigation', { name: 'Menu' })

async function abrir() {
  const botao = await botaoMenu()
  await userEvent.click(botao)
  return botao
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Menu do cabeçalho no celular (UT-045, O2)', () => {
  it('o botão abre o painel com Início, Desempenho, Histórico, Notas de corte (CR-010) e a conta, e marca a página atual', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/historico' })

    const botao = await botaoMenu()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveAttribute('aria-controls', 'menu-principal')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()

    await userEvent.click(botao)

    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(painel()).toHaveAttribute('id', 'menu-principal')
    const links = within(painel()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Início', 'Desempenho', 'Histórico', 'Notas de corte', 'AAna Conta e sair'])
    expect(within(painel()).getByRole('link', { name: 'Histórico' })).toHaveAttribute('aria-current', 'page')
    expect(within(painel()).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
    expect(within(painel()).getByRole('link', { name: /Conta e sair/ })).toHaveAttribute('href', '/conta')
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    const botao = await abrir()
    await userEvent.tab()
    expect(within(painel()).getByRole('link', { name: 'Início' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(botao).toHaveFocus()
  })

  it('um toque fora fecha, sem acionar o que está por baixo', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    await screen.findByRole('button', { name: 'Começar prova completa' })
    const botao = await abrir()

    await userEvent.click(screen.getByTestId('fundo-menu'))

    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Começar prova completa' })).toBeInTheDocument()
  })

  it('Tab para fora do painel fecha: o conteúdo coberto não recebe o foco com o menu aberto', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    await abrir()

    for (let i = 0; i < 6; i++) await userEvent.tab() // botão → 5 itens → fora

    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
  })

  it('aberto, trava a rolagem da página; fechado, devolve', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    const botao = await abrir()
    expect(document.documentElement.style.overflow).toBe('hidden')

    await userEvent.click(botao)

    expect(document.documentElement.style.overflow).toBe('')
  })

  it('enquanto a sessão carrega, não mostra o menu', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderizar(<App />, { rota: '/privacidade' })

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
  })

  it('o botão também fecha', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    const botao = await abrir()

    await userEvent.click(botao)

    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
  })

  it('escolher um item navega, fecha e devolve o foco ao botão', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })
    const botao = await abrir()

    await userEvent.click(within(painel()).getByRole('link', { name: 'Histórico' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
    expect(botao).toHaveFocus()
  })

  it('qualquer troca de rota fecha o menu (ex.: o voltar do navegador)', async () => {
    api(COM_LOGIN)
    const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/'] })
    render(
      <QueryClientProvider client={criarQueryClient({ queries: { retry: false } })}>
        <SimuladoProvider>
          <RouterProvider router={router} />
        </SimuladoProvider>
      </QueryClientProvider>,
    )
    await abrir()

    await act(() => router.navigate('/desempenho'))

    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
  })

  it('sem conta não há menu: só "Entrar"', async () => {
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/' })

    await screen.findByRole('link', { name: 'Entrar com Google' })
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
    expect(within(screen.getByRole('navigation')).getAllByRole('link').map((l) => l.textContent)).toEqual(['Entrar'])
  })

  it('sem login configurado (livre), o menu tem as páginas e nenhuma conta', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, CATALOGO) })
    renderizar(<App />, { rota: '/' })
    await abrir()

    expect(within(painel()).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Início',
      'Desempenho',
      'Histórico',
      'Notas de corte',
    ])
  })
})
