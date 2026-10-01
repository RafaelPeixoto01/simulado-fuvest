import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry, SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_CONTA, CHAVE_HISTORICO, lerMarcaConta, listarHistorico } from '../storage/historicoStorage'
import { esquecerRecusadas } from '../storage/sincronizacao'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { CATALOGO, entradaFalsa, instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { Sessao, Usuario } from '../types'

const ANA: Usuario = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const COM_CONTA: Sessao = { login_disponivel: true, usuario: ANA, acesso: 'conta' }
const SEM_CONTA: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }

const semCorpo = () => new Response(null, { status: 204 })
const ids = (lista: HistoricoEntry[]) => lista.map((e) => e.id)

/** API falsa com sessão e histórico da conta, com as regras do backend (specs/07). */
function servidor(sessaoInicial: Sessao, inicial: HistoricoEntry[] = [], extra: Parameters<typeof instalarApiFalsa>[0] = {}) {
  let sessao = sessaoInicial
  let guardadas = [...inicial]
  const lista = () => [...guardadas].sort((a, b) => b.finalizadoEm - a.finalizadoEm)
  const fetch = instalarApiFalsa({
    'GET /api/sessao': () => json(200, sessao),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/questoes': (_c, url) =>
      json(200, {
        questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)),
        textos_base: {},
        nao_encontradas: [],
      }),
    'GET /api/historico': () => json(200, { entradas: lista(), rejeitadas: [] }),
    'POST /api/historico': (corpo) => {
      for (const e of (corpo as { entradas: HistoricoEntry[] }).entradas) {
        if (!guardadas.some((g) => g.id === e.id)) guardadas.push(e)
      }
      return json(200, { entradas: lista(), rejeitadas: [] })
    },
    'DELETE /api/historico': () => {
      guardadas = []
      return semCorpo()
    },
    'DELETE /api/sessao': () => {
      sessao = { ...sessao, usuario: null }
      return semCorpo()
    },
    'DELETE /api/conta': () => {
      sessao = { ...sessao, usuario: null }
      guardadas = []
      return semCorpo()
    },
    ...extra,
  })
  const chamadas = (metodo: string, caminho: string) =>
    fetch.mock.calls.filter(([u, init]) => String(u) === caminho && (init?.method ?? 'GET') === metodo)
  return { fetch, chamadas, guardadas: () => lista() }
}

const enviadas = (chamada: unknown[]) =>
  ids((JSON.parse(String((chamada[1] as RequestInit).body)) as { entradas: HistoricoEntry[] }).entradas)

beforeEach(() => {
  localStorage.clear()
  esquecerRecusadas()
})
afterEach(() => vi.unstubAllGlobals())

describe('Cabeçalho e rodapé com contas (UT-033)', () => {
  it('sem conta, com o login disponível: "Entrar" leva à página da conta', async () => {
    servidor(SEM_CONTA)
    renderizar(<App />, { rota: '/privacidade' })

    expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/conta')
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade')
  })

  it('com conta, o cabeçalho mostra o primeiro nome', async () => {
    servidor(COM_CONTA)
    renderizar(<App />, { rota: '/privacidade' })

    expect(await screen.findByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/conta')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('com o login desligado, não há link de conta', async () => {
    instalarApiFalsa({})
    renderizar(<App />, { rota: '/conta' })

    expect(await screen.findByText(/O login com Google não está disponível no momento/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })
})

describe('Página Conta (UT-034, RF-024, RF-026)', () => {
  it('sem conta: explica o que é guardado e oferece entrar com o Google', async () => {
    servidor(SEM_CONTA)
    renderizar(<App />, { rota: '/conta' })

    const botao = await screen.findByRole('link', { name: 'Entrar com Google' })
    expect(botao).toHaveAttribute('href', '/api/auth/google?voltar=%2Fconta')
    expect(screen.getByText(/simulados já feitos neste navegador vão para a sua conta/)).toBeInTheDocument()
    expect(screen.getByText(/Guardamos só seu nome, seu e-mail/)).toBeInTheDocument()
    expect(document.title).toBe('Conta · Simulado Fuvest')
  })

  it('login que falhou volta com aviso', async () => {
    servidor(SEM_CONTA)
    renderizar(<App />, { rota: '/conta?erro=login' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar com o Google')
  })

  it('com conta: mostra quem está conectado e o histórico da conta', async () => {
    servidor(COM_CONTA, [entradaFalsa('a', 2), entradaFalsa('b', 1)])
    renderizar(<App />, { rota: '/conta' })

    expect(await screen.findByText(/Conectado como/)).toHaveTextContent('Conectado como Ana Souza (ana@exemplo.com)')
    expect(await screen.findByText('2 simulados na sua conta.')).toBeInTheDocument()
  })

  it('sair envia as pendentes e apaga o histórico deste navegador (D2)', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([entradaFalsa('pendente', 3)]))
    const s = servidor(COM_CONTA, [entradaFalsa('a', 1)])
    renderizar(<App />, { rota: '/conta' })
    await screen.findByText('2 simulados na sua conta.')

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Você saiu. Seu histórico continua na sua conta.')
    expect(s.chamadas('DELETE', '/api/sessao')).toHaveLength(1)
    expect(ids(s.guardadas())).toEqual(['pendente', 'a'])
    expect(listarHistorico()).toEqual([])
    expect(localStorage.getItem(CHAVE_CONTA)).toBeNull()
    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar com Google' })).toBeInTheDocument()
  })

  it('ao sair, a recusada pelo servidor (que só existe aqui) fica no navegador', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([entradaFalsa('ruim', 3)]))
    servidor(COM_CONTA, [], {
      'POST /api/historico': (corpo) =>
        json(200, { entradas: [], rejeitadas: ids((corpo as { entradas: HistoricoEntry[] }).entradas) }),
    })
    renderizar(<App />, { rota: '/conta' })
    await screen.findByText('1 simulado na sua conta.')

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Você saiu.')
    expect(ids(listarHistorico())).toEqual(['ruim'])
  })

  it('com o login desligado, quem já entrou ainda vê a conta (sair e excluir)', async () => {
    servidor({ login_disponivel: false, usuario: ANA, acesso: 'indisponivel' })
    renderizar(<App />, { rota: '/conta' })

    expect(await screen.findByText(/Conectado como/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/conta')
    expect(screen.getByRole('button', { name: 'Excluir conta' })).toBeInTheDocument()
  })

  it('sem conseguir enviar as pendentes, não sai nem apaga nada', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([entradaFalsa('pendente', 3)]))
    const s = servidor(COM_CONTA, [], { 'POST /api/historico': () => json(500, { detail: 'Erro interno' }) })
    renderizar(<App />, { rota: '/conta' })
    await screen.findByText(/Não foi possível sincronizar agora/)

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar os simulados pendentes')
    expect(s.chamadas('DELETE', '/api/sessao')).toHaveLength(0)
    expect(ids(listarHistorico())).toEqual(['pendente'])
  })

  it('excluir a conta pede confirmação e apaga tudo (RF-026)', async () => {
    const s = servidor(COM_CONTA, [entradaFalsa('a', 1)])
    renderizar(<App />, { rota: '/conta' })
    await screen.findByText('1 simulado na sua conta.')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }))
    const dialogo = screen.getByRole('dialog', { name: 'Excluir a conta?' })
    expect(dialogo).toHaveTextContent('Não dá para desfazer.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir conta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Sua conta e o histórico guardado nela foram excluídos.')
    expect(s.chamadas('DELETE', '/api/conta')).toHaveLength(1)
    expect(localStorage.getItem(CHAVE_HISTORICO)).toBeNull()
    expect(localStorage.getItem(CHAVE_CONTA)).toBeNull()
  })
})

describe('Histórico e painel com conta (UT-035, RF-020, RF-022)', () => {
  it('o histórico vem da conta, mesmo num navegador vazio', async () => {
    servidor(COM_CONTA, [entradaFalsa('a', 2), entradaFalsa('b', 1)])
    renderizar(<App />, { rota: '/historico' })

    expect(await screen.findByText('Simulado a')).toBeInTheDocument()
    expect(screen.getByText('Simulado b')).toBeInTheDocument()
    expect(screen.getByText(/guardado na sua conta \(ana@exemplo.com\)/)).toBeInTheDocument()
    expect(ids(listarHistorico())).toEqual(['a', 'b'])
    expect(lerMarcaConta()).toEqual({ conta: 7, ids: ['a', 'b'] })
  })

  it('limpar com conta apaga na conta, avisando que vale para todos os dispositivos', async () => {
    const s = servidor(COM_CONTA, [entradaFalsa('a', 1)])
    renderizar(<App />, { rota: '/historico' })
    await screen.findByText('Simulado a')

    await userEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }))
    const dialogo = screen.getByRole('dialog', { name: 'Limpar o histórico?' })
    expect(dialogo).toHaveTextContent('apagados da sua conta, em todos os dispositivos')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Limpar histórico' }))

    expect(await screen.findByText('Nenhum simulado concluído ainda.')).toBeInTheDocument()
    expect(s.chamadas('DELETE', '/api/historico')).toHaveLength(1)
    expect(lerMarcaConta()).toEqual({ conta: 7, ids: [] })
  })

  it('o painel soma o histórico da conta', async () => {
    servidor(COM_CONTA, [entradaFalsa('a', 2), entradaFalsa('b', 1)])
    renderizar(<App />, { rota: '/desempenho' })

    expect(await screen.findByText(/somam os simulados concluídos guardados na sua conta/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Simulados').nextSibling).toHaveTextContent('2'))
  })
})

describe('Resultado e finalizar com conta (UT-036)', () => {
  it('resultado feito em outro dispositivo aparece depois da sincronização', async () => {
    servidor(COM_CONTA, [entradaFalsa('sim-x', 1)])
    renderizar(<App />, { rota: '/resultado/sim-x' })

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Você acertou 1 de 1 questão' })).toBeInTheDocument()
  })

  it('simulado finalizado com conta vai para o servidor', async () => {
    const simulado: SimuladoEmAndamento = {
      versao: 1,
      id: 'sim-1',
      modo: 'personalizado',
      descricao: 'Personalizado: Física, 1 questão',
      questaoIds: ['2099-001'],
      respostas: { '2099-001': 'A' },
      marcadas: [],
      indiceAtual: 0,
      iniciadoEm: Date.now(),
      tempoLimiteS: 200,
      pausavel: true,
      pausadoEm: null,
      pausadoTotalMs: 0,
    }
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(simulado))
    const s = servidor(COM_CONTA, [], {
      'POST /api/correcoes': () => json(200, entradaFalsa('x', 1).resultado),
    })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Finalizar simulado' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalizar e ver o resultado' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Você acertou 1 de 1 questão' })).toBeInTheDocument()
    await waitFor(() => expect(ids(s.guardadas())).toEqual(['sim-1']))
    expect(enviadas(s.chamadas('POST', '/api/historico')[0])).toEqual(['sim-1'])
    await waitFor(() => expect(lerMarcaConta()).toEqual({ conta: 7, ids: ['sim-1'] }))
  })
})
