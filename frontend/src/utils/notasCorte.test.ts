import { describe, expect, it } from 'vitest'

import { entradaFalsa } from '../test/apiFalsa'
import type { HistoricoEntry } from '../simulado/tipos'
import type { CarreiraCorte } from '../types'
import {
  anoDaProva,
  filtrarCarreiras,
  minimoFuvest,
  naEscalaDoCorte,
  normalizarBusca,
  notaComparavel,
  situacao,
} from './notasCorte'

function entrada(modo: HistoricoEntry['modo'], total: number, acertos: number, prova = '2022'): HistoricoEntry {
  const base = entradaFalsa('sim', 1000)
  return {
    ...base,
    modo,
    questaoIds: [`${prova}-001`, `${prova}-002`],
    resultado: { ...base.resultado, total, acertos },
  }
}

function carreira(codigo: number, nome: string): CarreiraCorte {
  return { codigo, nome, vagas: 10, cortes: { ac: 60, ep: 50, ppi: 40 } }
}

describe('UT-055 / UT-062: nota comparável, escala do corte e situação (RN-018, CR-011)', () => {
  it('compara a Prova completa e a Prova de um ano de qualquer tamanho; o Personalizado não', () => {
    expect(notaComparavel(entrada('completa', 80, 61))).toEqual({ acertos: 61, total: 80 })
    expect(notaComparavel(entrada('ano', 90, 70))).toEqual({ acertos: 70, total: 90 })
    expect(notaComparavel(entrada('ano', 89, 61))).toEqual({ acertos: 61, total: 89 })
    expect(notaComparavel(entrada('personalizado', 90, 61))).toBeNull()
  })

  it('na mesma escala compara direto; em escalas diferentes converte, com 1 casa, como estimativa', () => {
    expect(naEscalaDoCorte({ acertos: 61, total: 90 }, 90)).toEqual({ pontos: 61, estimativa: false })
    expect(naEscalaDoCorte({ acertos: 60, total: 80 }, 80)).toEqual({ pontos: 60, estimativa: false })
    expect(naEscalaDoCorte({ acertos: 60, total: 80 }, 90)).toEqual({ pontos: 67.5, estimativa: true })
    expect(naEscalaDoCorte({ acertos: 61, total: 80 }, 90)).toEqual({ pontos: 68.6, estimativa: true }) // 68,625
    expect(naEscalaDoCorte({ acertos: 70, total: 90 }, 80)).toEqual({ pontos: 62.2, estimativa: true }) // 62,22
  })

  it('ano da prova só na Prova de um ano de vestibular; simulado oficial não tem lista própria', () => {
    expect(anoDaProva(entrada('ano', 90, 70))).toBe(2022)
    expect(anoDaProva(entrada('completa', 90, 70))).toBeNull()
    expect(anoDaProva(entrada('ano', 80, 60, '2027s1'))).toBeNull()
  })

  it('atingiu com nota igual ou acima do corte; falta abaixo; sem corte sem convocados', () => {
    expect(situacao(79, 79)).toEqual({ tipo: 'atingiu', acima: 0 })
    expect(situacao(82, 79)).toEqual({ tipo: 'atingiu', acima: 3 })
    expect(situacao(61, 79)).toEqual({ tipo: 'falta', faltam: 18 })
    expect(situacao(68.6, 79)).toEqual({ tipo: 'falta', faltam: 10.4 })
    expect(situacao(68.6, 60)).toEqual({ tipo: 'atingiu', acima: 8.6 })
    expect(situacao(61, null)).toEqual({ tipo: 'sem-corte' })
  })

  it('o mínimo da FUVEST é 30% dos pontos da prova', () => {
    expect([minimoFuvest(90), minimoFuvest(80)]).toEqual([27, 24])
  })
})

describe('UT-056: busca de carreiras', () => {
  const carreiras = [
    carreira(117, 'Psicologia (São Paulo)'),
    carreira(111, 'Medicina (São Paulo, Bauru, Ribeirão Preto)'),
    carreira(112, 'Medicina Veterinária (São Paulo, Pirassununga)'),
    carreira(504, 'Arquitetura (São Paulo)'),
  ]

  it('normaliza sem acento e sem maiúscula', () => {
    expect(normalizarBusca('  Ribeirão PRETO ')).toBe('ribeirao preto')
  })

  it('ordena por nome e filtra por nome sem acento ou por código', () => {
    expect(filtrarCarreiras(carreiras, '').map((c) => c.codigo)).toEqual([504, 111, 112, 117])
    expect(filtrarCarreiras(carreiras, 'medicina').map((c) => c.codigo)).toEqual([111, 112])
    expect(filtrarCarreiras(carreiras, 'ribeirao').map((c) => c.codigo)).toEqual([111])
    expect(filtrarCarreiras(carreiras, '117').map((c) => c.codigo)).toEqual([117])
    expect(filtrarCarreiras(carreiras, 'odontologia')).toEqual([])
  })
})
