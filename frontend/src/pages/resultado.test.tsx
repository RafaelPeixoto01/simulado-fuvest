import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry } from '../simulado/tipos'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

const ENTRADA: HistoricoEntry = {
  versao: 1,
  id: 'sim-9',
  modo: 'personalizado',
  descricao: 'Personalizado: Física e Química, 3 questões',
  iniciadoEm: new Date(2026, 8, 29, 20, 0).getTime(),
  finalizadoEm: new Date(2026, 8, 29, 20, 10).getTime(),
  tempoGastoMs: 600_000,
  tempoLimiteS: 600,
  finalizadoPorTempo: false,
  questaoIds: ['2099-001', '2099-002', '2099-003'],
  resultado: {
    itens: [
      { questao_id: '2099-001', resposta: 'A', correta: 'A', anulada: false, acertou: true, disciplina: 'fisica' },
      { questao_id: '2099-002', resposta: 'B', correta: 'C', anulada: false, acertou: false, disciplina: 'quimica' },
      { questao_id: '2099-003', resposta: null, correta: 'D', anulada: false, acertou: false, disciplina: 'fisica' },
    ],
    total: 3,
    acertos: 1,
    percentual: 33.3,
    por_disciplina: [
      { disciplina: 'quimica', total: 1, acertos: 0, percentual: 0 },
      { disciplina: 'fisica', total: 2, acertos: 1, percentual: 50 },
    ],
    ignoradas: [],
  },
}

describe('Resultado (RF-017 a RF-019)', () => {
  beforeEach(() => {
    localStorage.clear()
    instalarApiFalsa({
      'GET /api/questoes': (_c, url) =>
        json(200, { questoes: url.searchParams.get('ids')!.split(',').map((id) => questaoFalsa(id)), textos_base: {}, nao_encontradas: [] }),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('mostra nota, tempo e desempenho por disciplina do pior para o melhor', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))

    renderizar(<App />, { rota: '/resultado/sim-9' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Você acertou 1 de 3 questões' })).toBeInTheDocument()
    expect(screen.getByText('33,3%')).toBeInTheDocument()
    expect(screen.getByText('10 min')).toBeInTheDocument() // tempo gasto
    expect(screen.getByText('3 min 20 s')).toBeInTheDocument() // tempo médio (UT-021)

    const disciplinas = screen.getByRole('list', { name: 'Desempenho por disciplina' })
    const linhas = within(disciplinas).getAllByRole('listitem').map((li) => li.textContent)
    expect(linhas[0]).toMatch(/Química.*0 de 1/)
    expect(linhas[1]).toMatch(/Física.*1 de 2/)
  })

  it('folha corrigida descreve cada questão, nos dois formatos (D5)', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))

    renderizar(<App />, { rota: '/resultado/sim-9' })

    // Celular (grade) e desktop (bolhas): só uma aparece de cada vez, pelo CSS
    const [grade, bolhas] = await screen.findAllByRole('list', { name: 'Folha de respostas corrigida' })
    for (const folha of [grade, bolhas]) {
      expect(within(folha).getByRole('button', { name: 'Questão 1: acertou A' })).toBeInTheDocument()
      expect(within(folha).getByRole('button', { name: 'Questão 2: marcou B, correta C' })).toBeInTheDocument()
      expect(within(folha).getByRole('button', { name: 'Questão 3: em branco, correta D' })).toBeInTheDocument()
    }
    // Grade: marca da questão (✓ letra, ✗ letra, – em branco) e selos de contagem
    expect(within(grade).getByRole('button', { name: /^Questão 2:/ })).toHaveTextContent('02B')
    expect(within(grade).getByRole('button', { name: /^Questão 3:/ })).toHaveTextContent('03–')
    expect(screen.getAllByText('1 acerto')).toHaveLength(2)
    expect(screen.getAllByText('1 erro')).toHaveLength(2)
    expect(screen.getAllByText('– 1 em branco')).toHaveLength(2)
    // Bolhas: sem letra dentro das bolinhas (P2.2)
    expect(within(bolhas).getByRole('button', { name: /^Questão 2:/ })).toHaveTextContent(/^02$/)
  })

  it('revisão filtra as erradas e as em branco', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })
    expect(await screen.findByText('Enunciado da questão 2099-001')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Erradas' }))
    expect(screen.queryByText('Enunciado da questão 2099-001')).toBeNull()
    expect(screen.getByText('Enunciado da questão 2099-002')).toBeInTheDocument()
    expect(screen.queryByText('Enunciado da questão 2099-003')).toBeNull()

    await userEvent.click(screen.getByRole('radio', { name: 'Em branco' }))
    expect(screen.getByText('Enunciado da questão 2099-003')).toBeInTheDocument()
    expect(screen.queryByText('Enunciado da questão 2099-002')).toBeNull()
  })

  it('a revisão mostra uma questão por vez, com selo, posição e Anterior/Próxima (D6)', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })

    const revisao = await screen.findByRole('region', { name: 'Revisão das questões' })
    expect(await within(revisao).findByRole('heading', { level: 3, name: 'Questão 1 de 3' })).toBeInTheDocument()
    expect(revisao).toHaveTextContent('Você acertou: A')
    expect(revisao).toHaveTextContent('1 de 3 questões')
    expect(within(revisao).getByRole('button', { name: 'Questão anterior' })).toBeDisabled()

    await userEvent.click(within(revisao).getByRole('button', { name: 'Próxima questão' }))
    expect(within(revisao).getByRole('heading', { level: 3, name: 'Questão 2 de 3' })).toHaveFocus()
    expect(revisao).toHaveTextContent('Você marcou B · correta C')

    await userEvent.click(within(revisao).getByRole('button', { name: 'Próxima questão' }))
    expect(revisao).toHaveTextContent('Em branco · correta D')
    expect(within(revisao).getByRole('button', { name: 'Próxima questão' })).toBeDisabled()
  })

  it('tocar numa questão da folha abre ela na revisão, rola até lá e foca o título (P1.7)', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })

    const [grade] = await screen.findAllByRole('list', { name: 'Folha de respostas corrigida' })
    await screen.findByText('Enunciado da questão 2099-001')
    await userEvent.click(within(grade).getByRole('button', { name: /^Questão 3:/ }))

    const revisao = screen.getByRole('region', { name: 'Revisão das questões' })
    expect(within(revisao).getByRole('heading', { level: 3, name: 'Questão 3 de 3' })).toHaveFocus()
    expect(screen.getByText('Enunciado da questão 2099-003')).toBeInTheDocument()
    expect(rolar).toHaveBeenCalledWith({ block: 'start' })
    expect(within(grade).getByRole('button', { name: /^Questão 3:/ })).toHaveAttribute('aria-current', 'true')
    // O jsdom não tem scrollIntoView: o componente chama com `?.`; tira o simulado
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('questão fora do filtro, escolhida na folha, volta o filtro para "Todas"', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('radio', { name: 'Erradas' }))
    expect(screen.getByText('Enunciado da questão 2099-002')).toBeInTheDocument()

    const [, bolhas] = screen.getAllByRole('list', { name: 'Folha de respostas corrigida' })
    await userEvent.click(within(bolhas).getByRole('button', { name: /^Questão 1:/ }))

    expect(screen.getByRole('radio', { name: 'Todas' })).toBeChecked()
    expect(screen.getByText('Enunciado da questão 2099-001')).toBeInTheDocument()
  })

  it('trocar o filtro não tira o foco dele nem rola a página (teclado)', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })
    await screen.findByText('Enunciado da questão 2099-001')

    const erradas = screen.getByRole('radio', { name: 'Erradas' })
    await userEvent.click(erradas)
    expect(erradas).toHaveFocus()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Disciplina' }), 'quimica')
    expect(screen.getByRole('combobox', { name: 'Disciplina' })).toHaveFocus()
    expect(rolar).not.toHaveBeenCalled()
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('questão corrigida cujo conteúdo saiu da base mantém o selo e não diz que ficou fora da nota', async () => {
    instalarApiFalsa({
      'GET /api/questoes': () =>
        json(200, { questoes: [questaoFalsa('2099-001'), questaoFalsa('2099-003')], textos_base: {}, nao_encontradas: ['2099-002'] }),
    })
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.click(screen.getByRole('button', { name: 'Próxima questão' }))

    const revisao = screen.getByRole('region', { name: 'Revisão das questões' })
    expect(revisao).toHaveTextContent('Você marcou B · correta C')
    expect(revisao).toHaveTextContent('O conteúdo desta questão não está mais disponível na base')
    expect(revisao).not.toHaveTextContent('não entrou na nota')
  })

  it('filtro por disciplina continua na revisão (RF-019)', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/resultado/sim-9' })
    await screen.findByText('Enunciado da questão 2099-001')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Disciplina' }), 'quimica')

    expect(screen.getByText('Enunciado da questão 2099-002')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Revisão das questões' })).toHaveTextContent('1 de 1 questões')
  })

  it('avisos de tempo esgotado fora e de histórico não salvo (state da navegação)', async () => {
    renderizar(<App />, {
      rota: '/resultado/sim-9',
      estado: { entrada: { ...ENTRADA, finalizadoPorTempo: true }, naoSalvo: true, expirouFora: true },
    })

    expect(await screen.findByText(/O tempo acabou enquanto você estava fora/)).toBeInTheDocument()
    expect(screen.getByText(/não aparecerá no histórico/)).toBeInTheDocument()
  })

  it('questões removidas da base aparecem avisadas', async () => {
    const comIgnorada = { ...ENTRADA, resultado: { ...ENTRADA.resultado, ignoradas: ['2099-004'] } }
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([comIgnorada]))

    renderizar(<App />, { rota: '/resultado/sim-9' })

    expect(await screen.findByText(/1 questão foi removida da base e não entrou na nota/)).toBeInTheDocument()
  })

  it('resultado de outro navegador não é encontrado', async () => {
    renderizar(<App />, { rota: '/resultado/nao-existe' })

    expect(await screen.findByText('Resultado não encontrado neste navegador.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver histórico' })).toHaveAttribute('href', '/historico')
  })
})

describe('Histórico (RF-020)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('lista os simulados com nota e avisa que é local', () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))

    renderizar(<App />, { rota: '/historico' })

    expect(screen.getByText(/fica só neste navegador/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Personalizado: Física e Química/ })
    expect(link).toHaveAttribute('href', '/resultado/sim-9')
    expect(link).toHaveTextContent('1 de 3')
    expect(link).toHaveTextContent('29/09/2026 20:10')
  })

  it('limpar o histórico pede confirmação', async () => {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify([ENTRADA]))
    renderizar(<App />, { rota: '/historico' })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Limpar histórico' }))

    expect(screen.getByText('Nenhum simulado concluído ainda.')).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_HISTORICO)).toBeNull()
  })

  it('vazio convida a começar', () => {
    renderizar(<App />, { rota: '/historico' })

    expect(screen.getByText('Nenhum simulado concluído ainda.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Começar um simulado' })).toHaveAttribute('href', '/')
  })
})
