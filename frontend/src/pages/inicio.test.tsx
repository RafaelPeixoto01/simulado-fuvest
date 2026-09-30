import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import App from '../App'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { CATALOGO, instalarApiFalsa, json, simuladoFalso } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

const EM_ANDAMENTO = {
  versao: 1,
  id: 'antigo',
  modo: 'ano',
  descricao: 'FUVEST 2024',
  questaoIds: ['2024-001', '2024-002'],
  respostas: { '2024-001': 'A' },
  marcadas: [],
  indiceAtual: 0,
  iniciadoEm: Date.now(),
  tempoLimiteS: 18000,
  pausavel: false,
  pausadoEm: null,
  pausadoTotalMs: 0,
}

describe('Início (RF-008)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('mostra os quatro modos e o que há na base', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, CATALOGO) })

    renderizar(<App />)

    expect(await screen.findByRole('button', { name: 'Começar prova completa' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Escolher o ano' })).toHaveAttribute('href', '/novo/ano')
    expect(screen.getByRole('link', { name: 'Montar simulado' })).toHaveAttribute('href', '/novo/personalizado')
    expect(screen.getByRole('link', { name: 'Treinar' })).toHaveAttribute('href', '/treino')
    expect(screen.getByText(/178 questões de 2 provas/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Prova 2025 (PDF oficial)' })).toHaveAttribute(
      'href',
      'https://www.fuvest.br/p2025.pdf',
    )
  })

  it('prova completa fica indisponível com base pequena', async () => {
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, { ...CATALOGO, total_questoes: 88, completa_disponivel: false }),
    })

    renderizar(<App />)

    expect(await screen.findByRole('button', { name: 'Começar prova completa' })).toBeDisabled()
    expect(screen.getByText(/Disponível quando a base tiver 90 questões válidas/)).toBeInTheDocument()
  })

  it('base vazia convida a voltar depois', async () => {
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, { ...CATALOGO, provas: [], total_questoes: 0, completa_disponivel: false }),
    })

    renderizar(<App />)

    expect(await screen.findByText('Ainda não há provas publicadas.')).toBeInTheDocument()
  })

  it('erro ao carregar o catálogo permite tentar de novo', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(500, { detail: 'Erro interno' }) })

    renderizar(<App />)

    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('começa a prova completa e vai para a resolução', async () => {
    const api = instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'POST /api/simulados': () => json(200, simuladoFalso(['2025-010', '2024-003'])),
    })

    renderizar(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Começar prova completa' }))

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).questaoIds).toEqual(['2025-010', '2024-003']))
    const pedido = api.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(pedido[1]!.body))).toEqual({ modo: 'completa' })
    expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).descricao).toBe('Prova completa')
  })

  it('com simulado em andamento oferece retomar e pede confirmação para descartar (RN-011)', async () => {
    localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(EM_ANDAMENTO))
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'POST /api/simulados': () => json(200, simuladoFalso(['2025-010'])),
    })

    renderizar(<App />)

    expect(await screen.findByText(/FUVEST 2024/)).toBeInTheDocument()
    expect(screen.getByText(/1 de 2 respondidas/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar simulado' })).toHaveAttribute('href', '/simulado')

    // O banner vem do storage; o botão só aparece quando o catálogo carrega
    await userEvent.click(await screen.findByRole('button', { name: 'Começar prova completa' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Descartar o simulado em andamento?' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).id).toBe('antigo')

    await userEvent.click(screen.getByRole('button', { name: 'Começar prova completa' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Descartar e começar' }))

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).id).not.toBe('antigo'))
  })
})

describe('Prova de um ano', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('lista os anos com o PDF oficial e começa a prova escolhida', async () => {
    const api = instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'POST /api/simulados': () => json(200, simuladoFalso(['2024-001'], { modo: 'ano' })),
    })

    renderizar(<App />, { rota: '/novo/ano' })

    expect(await screen.findByRole('link', { name: 'PDF oficial de 2024' })).toHaveAttribute(
      'href',
      'https://www.fuvest.br/p2024.pdf',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Fazer a prova de 2024' }))

    await waitFor(() => expect(localStorage.getItem(CHAVE_SIMULADO)).not.toBeNull())
    const pedido = api.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(pedido[1]!.body))).toEqual({ modo: 'ano', ano: 2024 })
    expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).descricao).toBe('FUVEST 2024')
  })
})

describe('Personalizado (FT-003)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('com poucas questões oferece gerar com o total disponível', async () => {
    const pedidos: unknown[] = []
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'POST /api/simulados': (corpo) => {
        pedidos.push(corpo)
        if ((corpo as { quantidade: number }).quantidade > 12) {
          return json(409, { detail: { codigo: 'questoes_insuficientes', mensagem: 'x', disponiveis: 12 } })
        }
        return json(200, simuladoFalso(['2025-001'], { modo: 'personalizado', pausavel: true, tempo_limite_s: 2400 }))
      },
    })

    renderizar(<App />, { rota: '/novo/personalizado' })
    await userEvent.click(await screen.findByRole('checkbox', { name: /Física/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Começar simulado' }))

    expect(await screen.findByText('Só existem 12 questões para esses filtros.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gerar com 12 questões' }))

    await waitFor(() => expect(localStorage.getItem(CHAVE_SIMULADO)).not.toBeNull())
    expect(pedidos[0]).toMatchObject({ modo: 'personalizado', disciplinas: ['fisica'], quantidade: 20, cronometro: true })
    expect(pedidos[1]).toMatchObject({ quantidade: 12 })
    expect(JSON.parse(localStorage.getItem(CHAVE_SIMULADO)!).descricao).toBe('Personalizado: Física, 12 questões')
  })

  it('exige ao menos uma disciplina', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, CATALOGO) })

    renderizar(<App />, { rota: '/novo/personalizado' })
    await userEvent.click(await screen.findByRole('button', { name: 'Começar simulado' }))

    expect(screen.getByText('Escolha ao menos uma disciplina.')).toBeInTheDocument()
  })

  it('mostra o tempo proporcional do cronômetro', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, CATALOGO) })

    renderizar(<App />, { rota: '/novo/personalizado' })

    expect(await screen.findByText(/1 h 6 min/)).toBeInTheDocument() // 20 × 3 min 20 s
  })
})
