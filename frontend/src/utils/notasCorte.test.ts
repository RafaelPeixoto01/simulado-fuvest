import { describe, expect, it } from 'vitest'

import { entradaFalsa } from '../test/apiFalsa'
import type { HistoricoEntry } from '../simulado/tipos'
import type { CarreiraCorte } from '../types'
import { anoDaProva, filtrarCarreiras, normalizarBusca, pontosComparaveis, situacao } from './notasCorte'

function entrada(modo: HistoricoEntry['modo'], total: number, acertos: number): HistoricoEntry {
  const base = entradaFalsa('sim', 1000)
  return {
    ...base,
    modo,
    questaoIds: ['2022-001', '2022-002'],
    resultado: { ...base.resultado, total, acertos },
  }
}

function carreira(codigo: number, nome: string): CarreiraCorte {
  return { codigo, nome, vagas: 10, cortes: { ac: 60, ep: 50, ppi: 40 } }
}

describe('UT-055: pontos comparáveis e situação (RN-018)', () => {
  it('compara só a Prova completa e a Prova de um ano com 90 questões', () => {
    expect(pontosComparaveis(entrada('completa', 90, 61))).toBe(61)
    expect(pontosComparaveis(entrada('ano', 90, 70))).toBe(70)
    expect(pontosComparaveis(entrada('personalizado', 90, 61))).toBeNull()
    expect(pontosComparaveis(entrada('ano', 89, 61))).toBeNull()
  })

  it('ano da prova só na Prova de um ano', () => {
    expect(anoDaProva(entrada('ano', 90, 70))).toBe(2022)
    expect(anoDaProva(entrada('completa', 90, 70))).toBeNull()
  })

  it('atingiu com nota igual ou acima do corte; falta abaixo; sem corte sem convocados', () => {
    expect(situacao(79, 79)).toEqual({ tipo: 'atingiu', acima: 0 })
    expect(situacao(82, 79)).toEqual({ tipo: 'atingiu', acima: 3 })
    expect(situacao(61, 79)).toEqual({ tipo: 'falta', faltam: 18 })
    expect(situacao(61, null)).toEqual({ tipo: 'sem-corte' })
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
