import { describe, expect, it } from 'vitest'

import type { ItemCorrigido } from '../../types'
import { abrirQuestao, filtrarRevisao, REVISAO_INICIAL, situacao, trocarFiltros } from './revisao'

const item = (questao_id: string, extra: Partial<ItemCorrigido>): ItemCorrigido => ({
  questao_id,
  resposta: 'A',
  correta: 'A',
  anulada: false,
  acertou: true,
  disciplina: 'fisica',
  ...extra,
})

// 1 acerto (física), 2 erro (química), 3 branco (física), 4 anulada, 5 removida da base
const IDS = ['q1', 'q2', 'q3', 'q4', 'q5']
const POR_ID = new Map(
  [
    item('q1', {}),
    item('q2', { resposta: 'B', acertou: false, disciplina: 'quimica' }),
    item('q3', { resposta: null, acertou: false }),
    item('q4', { resposta: 'C', anulada: true, acertou: true }),
  ].map((i) => [i.questao_id, i]),
)

describe('revisão do resultado (CR-003, D6)', () => {
  it('classifica a situação de cada questão', () => {
    expect(IDS.map((id) => situacao(POR_ID.get(id)))).toEqual(['acerto', 'erro', 'branco', 'anulada', 'removida'])
  })

  it('filtra por situação e por disciplina, na ordem do simulado', () => {
    expect(filtrarRevisao(IDS, POR_ID, 'todas', '')).toEqual([0, 1, 2, 3, 4])
    expect(filtrarRevisao(IDS, POR_ID, 'erradas', '')).toEqual([1])
    expect(filtrarRevisao(IDS, POR_ID, 'branco', '')).toEqual([2])
    expect(filtrarRevisao(IDS, POR_ID, 'todas', 'fisica')).toEqual([0, 2, 3])
    expect(filtrarRevisao(IDS, POR_ID, 'erradas', 'fisica')).toEqual([])
  })

  it('abrir pela folha mantém os filtros se a questão passa neles', () => {
    const estado = { indice: 0, filtro: 'todas' as const, disciplina: 'fisica' as const }
    expect(abrirQuestao(estado, 2, IDS, POR_ID)).toEqual({ indice: 2, filtro: 'todas', disciplina: 'fisica' })
  })

  it('abrir pela folha uma questão fora do filtro volta os filtros para "Todas"', () => {
    const estado = { indice: 1, filtro: 'erradas' as const, disciplina: 'quimica' as const }
    expect(abrirQuestao(estado, 0, IDS, POR_ID)).toEqual({ indice: 0, filtro: 'todas', disciplina: '' })
  })

  it('trocar o filtro mantém a questão se ela continua visível; senão abre a primeira da lista', () => {
    expect(trocarFiltros({ ...REVISAO_INICIAL, indice: 1 }, 'erradas', '', IDS, POR_ID).indice).toBe(1)
    expect(trocarFiltros({ ...REVISAO_INICIAL, indice: 0 }, 'branco', '', IDS, POR_ID).indice).toBe(2)
    // Filtro vazio: a questão aberta não muda (a revisão mostra "Nenhuma questão com esse filtro")
    expect(trocarFiltros({ ...REVISAO_INICIAL, indice: 4 }, 'erradas', 'fisica', IDS, POR_ID)).toEqual({
      indice: 4,
      filtro: 'erradas',
      disciplina: 'fisica',
    })
  })
})
