import { describe, expect, it } from 'vitest'

import css from './index.css?raw'

// Contraste WCAG 2.x calculado a partir dos tokens reais do index.css (CR-002):
// se alguém mudar uma cor, o par que ficar abaixo do mínimo quebra aqui.

function token(nome: string): string {
  const achado = css.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`))
  if (!achado) throw new Error(`token --color-${nome} não encontrado`)
  return achado[1]
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(token(a)), luminancia(token(b))].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

describe('contraste dos tokens (WCAG AA)', () => {
  it.each([
    ['tinta', 'fundo'],
    ['tinta-suave', 'fundo'],
    ['tinta-suave', 'papel'],
    ['tinta-suave', 'caneta-clara'], // texto secundário na seleção (CR-008)
    ['optico-texto', 'papel'], // P2.1: letras A–E e números da folha
    ['optico-texto', 'fundo'], // número da questão na bolinha (CR-008)
    ['optico-texto', 'caneta-clara'], // número da questão atual na folha
    ['acerto', 'acerto-claro'], // P2.3: "Correta"
    ['acerto', 'papel'],
    ['erro', 'erro-claro'],
    ['alerta', 'alerta-claro'],
    ['caneta', 'papel'], // links
    ['fundo', 'caneta'], // texto do botão primário (CR-008)
  ])('texto %s sobre %s ≥ 4,5:1', (texto, fundo) => {
    expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['borda-campo', 'papel'], // P2.4: borda de campo
    ['borda-campo', 'fundo'], // e do botão secundário no creme (CR-008)
    // Anel de foco (CR-008): com 2 px de afastamento, encosta no fundo ou no papel, não no botão
    ['foco', 'fundo'],
    ['foco', 'papel'],
    // Rosa decorativo (anéis das bolinhas, marca): é gráfico, não texto (WCAG 1.4.11)
    ['optico', 'papel'],
    ['optico', 'fundo'],
  ])('%s sobre %s ≥ 3:1', (cor, fundo) => {
    expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(3)
  })
})
