import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { CHAVE_SIMULADO } from '../storage/simuladoStorage'
import { instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

const IDS = ['2099-001', '2099-002', '2099-003']

function salvarSimulado(extra: Partial<SimuladoEmAndamento> = {}) {
  const s: SimuladoEmAndamento = {
    versao: 1,
    id: 'sim-1',
    modo: 'personalizado',
    descricao: 'Personalizado: Física, 3 questões',
    questaoIds: IDS,
    respostas: {},
    marcadas: [],
    indiceAtual: 0,
    iniciadoEm: Date.now(),
    tempoLimiteS: 600,
    pausavel: true,
    pausadoEm: null,
    pausadoTotalMs: 0,
    ...extra,
  }
  localStorage.setItem(CHAVE_SIMULADO, JSON.stringify(s))
}

const salvo = () => JSON.parse(localStorage.getItem(CHAVE_SIMULADO) ?? 'null') as SimuladoEmAndamento | null

function correcaoFalsa(corpo: unknown) {
  const respostas = (corpo as { respostas: { questao_id: string; resposta: string | null }[] }).respostas
  const itens = respostas.map((r) => ({
    questao_id: r.questao_id,
    resposta: r.resposta,
    correta: 'A',
    anulada: false,
    acertou: r.resposta === 'A',
    disciplina: 'fisica',
  }))
  const acertos = itens.filter((i) => i.acertou).length
  return json(200, {
    itens,
    total: itens.length,
    acertos,
    percentual: Math.round((1000 * acertos) / itens.length) / 10,
    por_disciplina: [],
    ignoradas: [],
  })
}

describe('Resolução (RF-013 a RF-016)', () => {
  let api: ReturnType<typeof instalarApiFalsa>

  beforeEach(() => {
    localStorage.clear()
    api = instalarApiFalsa({
      'GET /api/questoes': (_c, url) =>
        json(200, {
          questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)),
          textos_base: {},
          nao_encontradas: [],
        }),
      'POST /api/correcoes': (corpo) => correcaoFalsa(corpo),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('sem simulado em andamento volta ao início', async () => {
    instalarApiFalsa({ 'GET /api/catalogo': () => json(200, { provas: [], disciplinas: [], total_questoes: 0, distribuicao_completa: {}, completa_disponivel: false }) })

    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByRole('heading', { level: 1, name: /Treine com questões reais/ })).toBeInTheDocument()
  })

  it('retoma o simulado salvo, responde e a folha de respostas acompanha', async () => {
    salvarSimulado({ respostas: { '2099-002': 'D' } })

    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByText('Enunciado da questão 2099-001')).toBeInTheDocument()
    const folha = screen.getByRole('navigation', { name: 'Folha de respostas' })
    expect(within(folha).getByRole('button', { name: 'Questão 2: respondida D' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Alternativa C/ }))

    expect(within(folha).getByRole('button', { name: /Questão 1: respondida C/ })).toBeInTheDocument()
    expect(salvo()?.respostas).toEqual({ '2099-001': 'C', '2099-002': 'D' })
  })

  it('navega pela folha, pelos botões e por atalhos de teclado', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Próxima questão' }))
    expect(await screen.findByText('Enunciado da questão 2099-002')).toBeInTheDocument()

    await userEvent.keyboard('{ArrowRight}')
    expect(await screen.findByText('Enunciado da questão 2099-003')).toBeInTheDocument()

    await userEvent.keyboard('b')
    expect(salvo()?.respostas['2099-003']).toBe('B')

    await userEvent.keyboard('m')
    expect(salvo()?.marcadas).toEqual(['2099-003'])

    const folha = screen.getByRole('navigation', { name: 'Folha de respostas' })
    await userEvent.click(within(folha).getByRole('button', { name: /^Questão 1:/ }))
    expect(await screen.findByText('Enunciado da questão 2099-001')).toBeInTheDocument()
  })

  it('cronômetro pausa e retoma no personalizado', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    expect(screen.getByRole('timer')).toHaveTextContent(/00:(10|09):\d\d/)
    await userEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(salvo()?.pausadoEm).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Retomar' }))
    expect(salvo()?.pausadoEm).toBeNull()
  })

  it('prova completa não tem pausa', async () => {
    salvarSimulado({ modo: 'completa', pausavel: false, tempoLimiteS: 18000 })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull()
  })

  it('avisa quando faltam menos de 15 minutos', async () => {
    salvarSimulado({ tempoLimiteS: 600 })
    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByText('Faltam menos de 15 minutos.')).toBeInTheDocument()
  })

  it('finalizar pede confirmação, corrige e grava no histórico', async () => {
    salvarSimulado({ respostas: { '2099-001': 'A' } })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Finalizar o simulado?' })
    expect(dialogo).toHaveTextContent('Você deixou 2 questões em branco.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Finalizar' }))

    // Termina na tela de resultado (não pode cair no redirecionamento para o início)
    expect(await screen.findByRole('heading', { level: 1, name: 'Você acertou 1 de 3 questões' })).toBeInTheDocument()
    await waitFor(() => expect(salvo()).toBeNull())
    const pedido = api.mock.calls.find(([u]) => String(u) === '/api/correcoes')!
    expect(JSON.parse(String(pedido[1]!.body)).respostas).toEqual([
      { questao_id: '2099-001', resposta: 'A' },
      { questao_id: '2099-002', resposta: null },
      { questao_id: '2099-003', resposta: null },
    ])
    const historico = JSON.parse(localStorage.getItem(CHAVE_HISTORICO)!)
    expect(historico[0]).toMatchObject({ id: 'sim-1', finalizadoPorTempo: false })
    expect(historico[0].resultado.acertos).toBe(1)
  })

  it('se a correção falhar, o simulado continua e dá para tentar de novo', async () => {
    instalarApiFalsa({
      'GET /api/questoes': (_c, url) =>
        json(200, { questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)), textos_base: {}, nao_encontradas: [] }),
      'POST /api/correcoes': () => json(500, { detail: 'Erro interno' }),
    })
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText(/Não foi possível corrigir agora/)).toBeInTheDocument()
    expect(salvo()?.id).toBe('sim-1')
    expect(screen.getByRole('button', { name: 'Tentar corrigir de novo' })).toBeInTheDocument()
  })

  it('tempo esgotado enquanto estava fora finaliza sozinho, sem confirmação', async () => {
    salvarSimulado({ iniciadoEm: Date.now() - 601_000, respostas: { '2099-003': 'A' } })

    renderizar(<App />, { rota: '/simulado' })

    await waitFor(() => expect(salvo()).toBeNull())
    const historico = JSON.parse(localStorage.getItem(CHAVE_HISTORICO)!)
    expect(historico[0]).toMatchObject({ id: 'sim-1', finalizadoPorTempo: true })
    expect(historico[0].tempoGastoMs).toBe(600_000)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('questão removida da base é avisada e conta como em branco', async () => {
    instalarApiFalsa({
      'GET /api/questoes': () =>
        json(200, { questoes: [questaoFalsa('2099-001'), questaoFalsa('2099-003')], textos_base: {}, nao_encontradas: ['2099-002'] }),
    })
    salvarSimulado({ indiceAtual: 1 })

    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByText(/Esta questão foi removida da base/)).toBeInTheDocument()
  })
})
