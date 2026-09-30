import { describe, expect, it } from 'vitest'

import { formatarDataHora, formatarPercentual } from './format'

describe('format', () => {
  it('percentual em pt-BR com uma casa', () => {
    expect(formatarPercentual(68.9)).toBe('68,9%')
    expect(formatarPercentual(100)).toBe('100%')
    expect(formatarPercentual(0)).toBe('0%')
  })

  it('data e hora curtas em pt-BR', () => {
    expect(formatarDataHora(new Date(2026, 8, 29, 22, 5).getTime())).toBe('29/09/2026 22:05')
  })
})
