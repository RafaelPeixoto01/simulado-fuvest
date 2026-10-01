import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { CATALOGO, instalarApiFalsa, json } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { Sessao } from '../types'

const ANA = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const SEM_LOGIN: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }
const COM_LOGIN: Sessao = { login_disponivel: true, usuario: ANA, acesso: 'conta' }
const INDISPONIVEL: Sessao = { login_disponivel: false, usuario: null, acesso: 'indisponivel' }

function api(sessao: Sessao, extra: Parameters<typeof instalarApiFalsa>[0] = {}) {
  return instalarApiFalsa({
    'GET /api/sessao': () => json(200, sessao),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/historico': () => json(200, { entradas: [], rejeitadas: [] }),
    ...extra,
  })
}

const apresentacao = () =>
  screen.findByRole('heading', { level: 1, name: 'Treine com questões reais da 1ª fase da FUVEST' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Porteiro das rotas (UT-040, RN-017)', () => {
  it('sem login, uma rota protegida leva à apresentação com o caminho de volta', async () => {
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/historico' })

    await apresentacao()
    expect(screen.getByRole('status')).toHaveTextContent('Entre com a sua conta Google para continuar.')
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2Fhistorico',
    )
    expect(screen.queryByRole('heading', { name: 'Histórico' })).toBeNull()
  })

  it('o simulado em andamento também exige login e volta para ele', async () => {
    const simulado: SimuladoEmAndamento = {
      versao: 1, id: 'sim-1', modo: 'ano', descricao: 'FUVEST 2025', questaoIds: ['2025-001'], respostas: {},
      marcadas: [], indiceAtual: 0, iniciadoEm: Date.now(), tempoLimiteS: 18000, pausavel: false, pausadoEm: null,
      pausadoTotalMs: 0,
    }
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(simulado))
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/simulado' })

    await apresentacao()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2Fsimulado',
    )
    expect(localStorage.getItem(CHAVE_SIMULADO)).not.toBeNull() // nada se perde
  })

  it('com login, a rota abre', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/historico' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument()
  })

  it('sem login configurado fora de produção (livre), abre como antes', async () => {
    instalarApiFalsa({})
    renderizar(<App />, { rota: '/historico' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument()
  })

  it('site indisponível: avisa no início e nas rotas protegidas', async () => {
    api(INDISPONIVEL)
    renderizar(<App />, { rota: '/desempenho' })

    expect(await screen.findByRole('heading', { name: 'Site temporariamente indisponível' })).toBeInTheDocument()
    expect(document.title).toBe('Site indisponível · Simulado Fuvest')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('enquanto a sessão carrega, mostra "Carregando…"', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderizar(<App />, { rota: '/historico' })

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('erro de rede ao verificar a sessão não bloqueia a página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderizar(<App />, { rota: '/historico' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Histórico' })).toBeInTheDocument()
  })
})

describe('Apresentação e cabeçalho sem login (UT-041)', () => {
  it('o início sem login é a apresentação, e o cabeçalho só tem "Entrar"', async () => {
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/' })

    await apresentacao()
    expect(screen.queryByRole('status')).toBeNull() // sem "para continuar" no início
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2F',
    )
    expect(screen.getByText('Quatro jeitos de treinar')).toBeInTheDocument()
    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Entrar'])
  })

  it('caminho de volta inválido vira o início', async () => {
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/?voltar=//evil.test' })

    await apresentacao()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2F',
    )
  })

  it('a Privacidade abre sem login', async () => {
    api(SEM_LOGIN)
    renderizar(<App />, { rota: '/privacidade' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Privacidade' })).toBeInTheDocument()
    expect(screen.getByText(/é preciso entrar com a conta Google/)).toBeInTheDocument()
  })

  it('com login, o início mostra os modos', async () => {
    api(COM_LOGIN)
    renderizar(<App />, { rota: '/' })

    expect(await screen.findByRole('button', { name: 'Começar prova completa' })).toBeInTheDocument()
    expect(screen.getByText(/O simulado em andamento fica salvo neste navegador/)).toBeInTheDocument()
  })
})

describe('Sessão que acaba no meio do uso (UT-042)', () => {
  it('um 401 recarrega a sessão e leva à apresentação com o caminho de volta', async () => {
    let sessao = COM_LOGIN
    api(sessao, {
      'GET /api/sessao': () => json(200, sessao),
      'GET /api/historico': () => {
        sessao = SEM_LOGIN // a sessão venceu no servidor
        return json(401, { detail: { codigo: 'nao_autenticado', mensagem: 'Entre com sua conta Google para continuar.' } })
      },
    })
    renderizar(<App />, { rota: '/historico' })

    await apresentacao()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2Fhistorico',
    )
  })
})
