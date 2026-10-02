import { describe, expect, it } from 'vitest'

import type { HistoricoEntry } from '../simulado/tipos'
import { CATALOGO } from '../test/apiFalsa'
import type { DesempenhoDisciplina, Disciplina, ItemCorrigido } from '../types'
import {
  agregarDesempenho,
  calcularPercentual,
  disciplinasMaisFracas,
  nomesDosAssuntos,
  ultimoSimulado,
} from './desempenho'

let proximo = 0

function item(disciplina: Disciplina, assunto: string | null | undefined, acertou: boolean, anulada = false): ItemCorrigido {
  proximo += 1
  const base: ItemCorrigido = {
    questao_id: `2099-${String(proximo).padStart(3, '0')}`,
    resposta: acertou ? 'A' : null,
    correta: anulada ? null : 'A',
    anulada,
    acertou,
    disciplina,
  }
  return assunto === undefined ? base : { ...base, assunto }
}

function entrada(itens: ItemCorrigido[], porDisciplina: DesempenhoDisciplina[] = []): HistoricoEntry {
  return {
    versao: 1,
    id: `sim-${proximo}`,
    modo: 'personalizado',
    descricao: 'Personalizado',
    iniciadoEm: 0,
    finalizadoEm: 1,
    tempoGastoMs: 1,
    tempoLimiteS: null,
    finalizadoPorTempo: false,
    questaoIds: itens.map((i) => i.questao_id),
    resultado: { itens, total: itens.length, acertos: 0, percentual: 0, por_disciplina: porDisciplina, ignoradas: [] },
  }
}

const repetir = (n: number, criar: () => ItemCorrigido) => Array.from({ length: n }, criar)

describe('agregarDesempenho (UT-025, RN-015)', () => {
  it('soma os simulados, tira as anuladas e conta em branco como erro', () => {
    const painel = agregarDesempenho(
      [
        entrada([item('fisica', 'optica', true), item('fisica', 'optica', false), item('fisica', 'optica', true, true)]),
        entrada([item('fisica', 'optica', true)]),
        entrada([item('quimica', 'organica', true, true)]), // só anulada: não conta como simulado
      ],
      new Map(),
    )

    expect(painel).toMatchObject({ simulados: 2, total: 3, acertos: 2, percentual: 66.7 })
    expect(painel.disciplinas).toHaveLength(1)
    expect(painel.disciplinas[0]).toMatchObject({ disciplina: 'fisica', total: 3, acertos: 2 })
  })

  it('ordena disciplinas do pior para o melhor, com empate pelo slug', () => {
    const painel = agregarDesempenho(
      [entrada([item('quimica', 'x', false), item('biologia', 'x', false), item('fisica', 'x', true)])],
      new Map(),
    )

    expect(painel.disciplinas.map((d) => d.disciplina)).toEqual(['biologia', 'quimica', 'fisica'])
  })

  it('assuntos: suficientes do pior para o melhor, depois "poucas questões", "Sem assunto" por último', () => {
    const painel = agregarDesempenho(
      [
        entrada([
          ...repetir(5, () => item('fisica', 'optica', true)), // 100%, suficiente
          ...repetir(5, () => item('fisica', 'eletrodinamica', false)), // 0%, suficiente
          ...repetir(2, () => item('fisica', 'cinematica', false)), // 0%, poucas
          item('fisica', 'energia', true), // 100%, poucas
        ]),
        entrada([item('fisica', undefined, false)]), // resultado antigo, sem assunto
      ],
      new Map(),
    )

    const assuntos = painel.disciplinas[0].assuntos
    expect(assuntos.map((a) => [a.assunto, a.poucas])).toEqual([
      ['eletrodinamica', false],
      ['optica', false],
      ['cinematica', true],
      ['energia', true],
      [null, true],
    ])
    expect(assuntos[4]).toMatchObject({ nome: 'Sem assunto', total: 1, acertos: 0 })
  })

  it('usa o nome do mapa e, sem ele, o slug', () => {
    const painel = agregarDesempenho(
      [entrada([item('fisica', 'optica', true), item('fisica', 'desconhecido', true)])],
      new Map([['fisica/optica', 'Óptica']]),
    )

    expect(painel.disciplinas[0].assuntos.map((a) => a.nome).sort()).toEqual(['desconhecido', 'Óptica'])
  })

  it('histórico vazio', () => {
    expect(agregarDesempenho([], new Map())).toEqual({
      simulados: 0,
      total: 0,
      acertos: 0,
      percentual: 0,
      disciplinas: [],
    })
  })
})

describe('nomesDosAssuntos', () => {
  const gravado = (nome: string): DesempenhoDisciplina => ({
    disciplina: 'fisica',
    total: 1,
    acertos: 1,
    percentual: 100,
    assuntos: [{ assunto: 'optica', nome, total: 1, acertos: 1, percentual: 100 }],
  })

  it('o catálogo prevalece sobre o histórico, e no histórico vale o mais recente', () => {
    const recente = entrada([], [gravado('Óptica (recente)')])
    const antiga = entrada([], [gravado('Óptica (antiga)')])
    const quimica: DesempenhoDisciplina = {
      disciplina: 'quimica',
      total: 1,
      acertos: 0,
      percentual: 0,
      assuntos: [{ assunto: 'ambiental', nome: 'Química ambiental', total: 1, acertos: 0, percentual: 0 }],
    }

    const soHistorico = nomesDosAssuntos([recente, antiga, entrada([], [quimica])])
    expect(soHistorico.get('fisica/optica')).toBe('Óptica (recente)')
    expect(soHistorico.get('quimica/ambiental')).toBe('Química ambiental')

    const comCatalogo = nomesDosAssuntos([recente, antiga], CATALOGO)
    expect(comCatalogo.get('fisica/optica')).toBe('Óptica')
    expect(comCatalogo.get('quimica/organica')).toBe('Química orgânica')
  })
})

it('calcularPercentual arredonda em 1 casa e trata total zero', () => {
  expect(calcularPercentual(1, 3)).toBe(33.3)
  expect(calcularPercentual(2, 3)).toBe(66.7)
  expect(calcularPercentual(0, 0)).toBe(0)
})

describe('"Seu último simulado" (UT-050, CR-008)', () => {
  const linha = (disciplina: Disciplina, total: number, acertos: number): DesempenhoDisciplina => ({
    disciplina,
    total,
    acertos,
    percentual: calcularPercentual(acertos, total),
  })

  it('ultimoSimulado pega o de finalização mais recente, em qualquer ordem; sem histórico, nenhum', () => {
    const a = { ...entrada([]), id: 'a', finalizadoEm: 5 }
    const b = { ...entrada([]), id: 'b', finalizadoEm: 9 }
    const c = { ...entrada([]), id: 'c', finalizadoEm: 7 }
    expect(ultimoSimulado([a, b, c])?.id).toBe('b')
    expect(ultimoSimulado([])).toBeNull()
  })

  it('disciplinasMaisFracas: menor aproveitamento, empate pelo slug, só as que tiveram questão', () => {
    const e = entrada(
      [],
      [linha('fisica', 4, 4), linha('historia', 4, 2), linha('biologia', 4, 2), linha('quimica', 0, 0), linha('ingles', 5, 1)],
    )
    expect(disciplinasMaisFracas(e).map((d) => d.disciplina)).toEqual(['ingles', 'biologia'])
    expect(disciplinasMaisFracas(e, 3).map((d) => d.disciplina)).toEqual(['ingles', 'biologia', 'historia'])
    expect(disciplinasMaisFracas(entrada([], [linha('fisica', 2, 1)]))).toHaveLength(1)
  })
})
