import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { CHAVE_HISTORICO } from '../storage/historicoStorage'
import { CATALOGO, entradaFalsa, instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'

type PedidoTreino = { modo: 'treino'; disciplinas?: string[]; excluir?: string[]; vistas?: string[] }

function lote(ids: string[]) {
  return json(200, {
    modo: 'treino',
    questoes: ids.map((id) => questaoFalsa(id)),
    textos_base: {},
    tempo_limite_s: null,
    pausavel: false,
    disponiveis: ids.length,
    semente: 1,
  })
}

describe('Treino por questão (RF-012)', () => {
  let pedidos: PedidoTreino[]

  beforeEach(() => {
    localStorage.clear()
    pedidos = []
    instalarApiFalsa({
      'GET /api/catalogo': () => json(200, CATALOGO),
      'POST /api/simulados': (corpo) => {
        const pedido = corpo as PedidoTreino
        pedidos.push(pedido)
        const vistas = pedido.excluir ?? []
        const todas = ['2099-001', '2099-002', '2099-003', '2099-004', '2099-005']
        return lote(todas.filter((id) => !vistas.includes(id)).slice(0, 4))
      },
      'POST /api/correcoes': (corpo) => {
        const [r] = (corpo as { respostas: { questao_id: string; resposta: string }[] }).respostas
        return json(200, {
          itens: [{ questao_id: r.questao_id, resposta: r.resposta, correta: 'C', anulada: false, acertou: r.resposta === 'C', disciplina: 'fisica' }],
          total: 1, acertos: r.resposta === 'C' ? 1 : 0, percentual: 0, por_disciplina: [], ignoradas: [],
        })
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  async function comecar(disciplina?: RegExp) {
    renderizar(<App />, { rota: '/treino' })
    if (disciplina) await userEvent.click(await screen.findByRole('checkbox', { name: disciplina }))
    await userEvent.click(await screen.findByRole('button', { name: 'Começar treino' }))
    await screen.findByText('Enunciado da questão 2099-001')
  }

  it('responde, vê a resposta na hora e o placar', async () => {
    await comecar()

    await userEvent.click(screen.getByRole('radio', { name: /Alternativa B/ }))

    expect(await screen.findByText('Resposta correta: C.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Alternativa C/ })).toHaveTextContent('Correta')
    expect(screen.getByRole('radio', { name: /Alternativa C/ })).toBeDisabled()
    expect(screen.getByText('0 acertos em 1 respondida')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Próxima questão' }))
    await screen.findByText('Enunciado da questão 2099-002')
    await userEvent.click(screen.getByRole('radio', { name: /Alternativa C/ }))
    expect(await screen.findByText('Você acertou.')).toBeInTheDocument()
    expect(screen.getByText('1 acerto em 2 respondidas')).toBeInTheDocument()
  })

  it('filtra por disciplina e busca o próximo lote excluindo as vistas', async () => {
    await comecar(/Física/)
    expect(pedidos[0]).toMatchObject({ modo: 'treino', disciplinas: ['fisica'], excluir: [] })

    // lote de 4: ao avançar para a 2ª já faltam 3 → busca o próximo
    await userEvent.click(screen.getByRole('button', { name: 'Pular questão' }))
    await waitFor(() => expect(pedidos).toHaveLength(2))
    expect(pedidos[1].excluir).toEqual(['2099-001', '2099-002', '2099-003', '2099-004'])
  })

  it('manda as questões do histórico em todos os lotes (FT-028, CR-015)', async () => {
    localStorage.setItem(
      CHAVE_HISTORICO,
      JSON.stringify([{ ...entradaFalsa('feito', 1000), questaoIds: ['2099-003', '2099-001'] }]),
    )
    await comecar()
    expect(pedidos[0]).toMatchObject({ excluir: [], vistas: ['2099-003', '2099-001'] })

    await userEvent.click(screen.getByRole('button', { name: 'Pular questão' }))
    await waitFor(() => expect(pedidos).toHaveLength(2))
    expect(pedidos[1].vistas).toEqual(['2099-003', '2099-001'])
  })

  it('quando acabam as questões oferece recomeçar', async () => {
    await comecar()

    for (let i = 0; i < 5; i++) {
      await userEvent.click(await screen.findByRole('button', { name: 'Pular questão' }))
    }

    expect(await screen.findByText('Você já viu todas as questões deste filtro.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recomeçar' }))

    await screen.findByText('Enunciado da questão 2099-001')
    expect(pedidos.at(-1)?.excluir).toEqual([])
  })

  it('não grava nada no navegador', async () => {
    await comecar()
    await userEvent.click(screen.getByRole('radio', { name: /Alternativa C/ }))
    await screen.findByText('Você acertou.')

    expect(localStorage.length).toBe(0)
  })
})
