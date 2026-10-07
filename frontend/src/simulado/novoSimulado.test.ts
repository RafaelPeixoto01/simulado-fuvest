import { describe, expect, it } from 'vitest'

import { entradaFalsa } from '../test/apiFalsa'
import { LIMITE_VISTAS, questoesVistas } from './novoSimulado'

function feito(id: string, finalizadoEm: number, questaoIds: string[]) {
  return { ...entradaFalsa(id, finalizadoEm), questaoIds }
}

describe('questoesVistas (UT-077, CR-015)', () => {
  it('da vista mais recentemente para a mais antiga, sem repetição', () => {
    const historico = [
      feito('antigo', 1000, ['2098-001', '2098-002', '2099-005']),
      feito('recente', 3000, ['2099-005', '2027s1-010']),
      feito('meio', 2000, ['2098-002', '2098-003']),
    ]

    expect(questoesVistas(historico)).toEqual(['2099-005', '2027s1-010', '2098-002', '2098-003', '2098-001'])
  })

  it('sem histórico, lista vazia', () => {
    expect(questoesVistas([])).toEqual([])
  })

  it('deixa de fora id fora do formato, que faria o servidor recusar o pedido', () => {
    // Um array com um id válido passaria no regex (String(['2099-002']) === '2099-002')
    const adulterados = ['2099-001', 'lixo', '2099-1', ['2099-002'], 7] as unknown as string[]

    expect(questoesVistas([feito('a', 1, adulterados)])).toEqual(['2099-001'])
  })

  it('para no limite do servidor', () => {
    const ids = Array.from({ length: LIMITE_VISTAS + 10 }, (_, i) => `${2000 + Math.floor(i / 1000)}-${String(i % 1000).padStart(3, '0')}`)

    const vistas = questoesVistas([feito('a', 1, ids)])

    expect(LIMITE_VISTAS).toBe(4500)
    expect(vistas).toHaveLength(LIMITE_VISTAS)
    expect(vistas.at(-1)).toBe(ids[LIMITE_VISTAS - 1])
  })
})
