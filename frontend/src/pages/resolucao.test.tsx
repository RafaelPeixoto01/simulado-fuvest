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
    expect(screen.getByRole('button', { name: 'Questão anterior' })).toBeEnabled()

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

    // D3: pausado, a questão some e o teclado não responde
    const pausa = screen.getByRole('region', { name: 'Simulado pausado' })
    expect(screen.getByRole('timer')).toHaveTextContent('Pausado')
    expect(screen.queryByText('Enunciado da questão 2099-001')).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    await userEvent.keyboard('b{ArrowRight}')
    expect(salvo()?.respostas).toEqual({})
    expect(salvo()?.indiceAtual).toBe(0)

    await userEvent.click(within(pausa).getByRole('button', { name: 'Retomar' }))
    expect(salvo()?.pausadoEm).toBeNull()
    expect(await screen.findByText('Enunciado da questão 2099-001')).toBeInTheDocument()
  })

  it('simulado pausado reaberto cai direto na tela de pausa', async () => {
    salvarSimulado({ pausadoEm: Date.now() - 5_000 })
    renderizar(<App />, { rota: '/simulado' })

    expect(await screen.findByRole('heading', { name: 'Simulado pausado' })).toBeInTheDocument()
    expect(screen.queryByText('Enunciado da questão 2099-001')).toBeNull()
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

    // D1: "Finalizar" saiu do topo e fica no rodapé da folha
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar simulado' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Finalizar o simulado?' })
    expect(dialogo).toHaveTextContent('Você deixou 2 questões em branco.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Finalizar e ver o resultado' }))

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

    await userEvent.click(screen.getByRole('button', { name: 'Finalizar simulado' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalizar e ver o resultado' }))

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

describe('Resolução: navegação, folha e modo foco (CR-001)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(window.scrollTo).mockClear()
    instalarApiFalsa({
      'GET /api/questoes': (_c, url) =>
        json(200, {
          questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)),
          textos_base: {},
          nao_encontradas: [],
        }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('abre em modo foco, sem o cabeçalho e o rodapé do site (D5)', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Histórico' })).toBeNull()
    expect(screen.queryByText(/não é afiliado à FUVEST/)).toBeNull()
    // D1: o topo não tem mais "Finalizar"
    expect(screen.queryByRole('button', { name: /^Finalizar$/ })).toBeNull()
  })

  it('trocar de questão volta ao topo e leva o foco ao título (P1.1)', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')
    expect(window.scrollTo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima questão' }))
    const titulo = await screen.findByRole('heading', { name: 'Questão 2 de 3' })
    expect(titulo).toHaveFocus()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })

    await userEvent.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('heading', { name: 'Questão 1 de 3' })).toHaveFocus()
  })

  it('na última questão "Próxima" vira "Finalizar" e a confirmação cita as marcadas (D1)', async () => {
    salvarSimulado({ indiceAtual: 2, respostas: { '2099-003': 'B' }, marcadas: ['2099-001'] })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-003')

    expect(screen.queryByRole('button', { name: 'Próxima questão' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar o simulado' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Finalizar o simulado?' })
    expect(dialogo).toHaveTextContent('Você deixou 2 questões em branco e marcou 1 para revisar.')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Continuar resolvendo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(salvo()?.id).toBe('sim-1')
  })

  it('"Revisar" alterna a marcação e mostra o estado', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    const revisar = screen.getByRole('button', { name: 'Revisar' })
    expect(revisar).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(revisar)

    expect(screen.getByRole('button', { name: 'Marcada' })).toHaveAttribute('aria-pressed', 'true')
    expect(salvo()?.marcadas).toEqual(['2099-001'])
  })

  it('a folha do celular é um diálogo: foco, Esc, Tab preso e página travada (P1.5)', async () => {
    salvarSimulado({ respostas: { '2099-002': 'D' } })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    const abrir = screen.getByRole('button', { name: 'Folha 1/3' })
    await userEvent.click(abrir)

    const painel = screen.getByRole('dialog', { name: 'Folha de respostas' })
    const fechar = within(painel).getByRole('button', { name: 'Fechar folha' })
    expect(fechar).toHaveFocus()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(within(painel).getByText('1 respondida · 2 em branco')).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Questão 2: respondida D' })).toBeInTheDocument()

    // Tab circula dentro do painel: do último (Finalizar simulado) volta ao primeiro (Fechar)
    within(painel).getByRole('button', { name: 'Finalizar simulado' }).focus()
    await userEvent.tab()
    expect(fechar).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(within(painel).getByRole('button', { name: 'Finalizar simulado' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(abrir).toHaveFocus()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('tocar numa questão do painel fecha a folha e foca o título da questão escolhida', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Folha 0/3' }))
    const painel = screen.getByRole('dialog', { name: 'Folha de respostas' })
    await userEvent.click(within(painel).getByRole('button', { name: 'Questão 3: em branco' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Questão 3 de 3' })).toHaveFocus()
  })

  it('"Finalizar simulado" no painel fecha a folha e abre a confirmação (D1)', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Folha 0/3' }))
    const painel = screen.getByRole('dialog', { name: 'Folha de respostas' })
    await userEvent.click(within(painel).getByRole('button', { name: 'Finalizar simulado' }))

    expect(screen.queryByRole('dialog', { name: 'Folha de respostas' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Finalizar o simulado?' })).toHaveTextContent(
      'Você deixou 3 questões em branco.',
    )
  })

  it('a barra do topo é opaca: o texto rolado não aparece por trás (UT-046, CR-007)', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    const barra = screen.getByRole('button', { name: /^Folha/ }).closest('header')!
    expect(barra).toHaveClass('bg-fundo')
    expect(barra.className).not.toMatch(/bg-fundo\/|backdrop-blur/)
  })

  it('"Marcada" usa as cores de alerta, sem as da forma neutra', async () => {
    salvarSimulado({ marcadas: ['2099-001'] })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    const marcada = screen.getByRole('button', { name: 'Marcada' })
    expect(marcada.className).toContain('bg-alerta-claro')
    expect(marcada.className).not.toContain('bg-papel')
    expect(marcada.className).not.toContain('border-linha')
  })

  it('pausado, o botão da folha some do topo (D3)', async () => {
    salvarSimulado({ pausadoEm: Date.now() - 1_000 })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByRole('heading', { name: 'Simulado pausado' })

    expect(screen.queryByRole('button', { name: /^Folha/ })).toBeNull()
  })

  it('sem questões em branco, a confirmação ainda cita as marcadas para revisar', async () => {
    salvarSimulado({ respostas: { '2099-001': 'A', '2099-002': 'B', '2099-003': 'C' }, marcadas: ['2099-002'] })
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Finalizar simulado' }))
    expect(screen.getByRole('dialog', { name: 'Finalizar o simulado?' })).toHaveTextContent(
      'Você respondeu todas as questões e marcou 1 para revisar.',
    )
  })

  it('o tempo acabando com a folha aberta fecha o painel e finaliza', async () => {
    instalarApiFalsa({
      'GET /api/questoes': (_c, url) =>
        json(200, { questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)), textos_base: {}, nao_encontradas: [] }),
      'POST /api/correcoes': (corpo) => correcaoFalsa(corpo),
    })
    salvarSimulado({ iniciadoEm: Date.now() - 598_500 }) // 1,5 s para o fim dos 600 s
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')
    await userEvent.click(screen.getByRole('button', { name: 'Folha 0/3' }))
    expect(screen.getByRole('dialog', { name: 'Folha de respostas' })).toBeInTheDocument()

    await waitFor(() => expect(salvo()).toBeNull(), { timeout: 4000 })
    expect(screen.queryByRole('dialog', { name: 'Folha de respostas' })).toBeNull()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('arrastar da grade até o fundo não fecha o painel', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Folha 0/3' }))
    const painel = screen.getByRole('dialog', { name: 'Folha de respostas' })
    const fundo = painel.parentElement!
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: within(painel).getByRole('heading', { name: 'Folha de respostas' }) },
      { target: fundo },
      { keys: '[/MouseLeft]', target: fundo },
    ])

    expect(screen.getByRole('dialog', { name: 'Folha de respostas' })).toBeInTheDocument()
  })

  it('clicar fora do painel fecha a folha', async () => {
    salvarSimulado()
    renderizar(<App />, { rota: '/simulado' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Folha 0/3' }))
    const fundo = screen.getByRole('dialog', { name: 'Folha de respostas' }).parentElement!
    await userEvent.click(fundo)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
