import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ItemCorrigido } from '../../types'
import { FolhaCorrigida } from './FolhaCorrigida'

const ITENS: ItemCorrigido[] = [
  { questao_id: 'q1', resposta: 'A', correta: 'A', anulada: false, acertou: true, disciplina: 'fisica' },
  { questao_id: 'q2', resposta: 'B', correta: 'C', anulada: false, acertou: false, disciplina: 'fisica' },
  { questao_id: 'q3', resposta: null, correta: 'D', anulada: false, acertou: false, disciplina: 'fisica' },
  { questao_id: 'q4', resposta: 'E', correta: 'A', anulada: true, acertou: true, disciplina: 'fisica' },
]
const IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] // q5: removida da base

function bolinhas(nome: RegExp) {
  const linha = screen.getByRole('button', { name: nome })
  return Array.from(linha.querySelectorAll('span[aria-hidden="true"] > span')) as HTMLElement[]
}

describe('FolhaCorrigida no desktop (D5, CR-003)', () => {
  it('marcada preenchida (verde se acertou, vermelha se errou) e correta contornada em verde', () => {
    render(<FolhaCorrigida formato="bolhas" questaoIds={IDS} itens={ITENS} atual={0} onIr={() => {}} />)

    const [a1] = bolinhas(/^Questão 1:/)
    expect(a1.className).toContain('bg-acerto')

    const [, b2, c2] = bolinhas(/^Questão 2:/)
    expect(b2.className).toContain('bg-erro')
    expect(c2.className).toContain('border-2 border-acerto')

    const q3 = bolinhas(/^Questão 3:/)
    expect(q3[3].className).toContain('border-2 border-acerto') // D, a correta, com a questão em branco
    expect(q3.filter((b) => b.className.includes('bg-'))).toHaveLength(0)

    // Anulada: a correta não é contornada (o ponto vale para todos)
    expect(bolinhas(/^Questão 4:/)[0].className).not.toContain('border-2')
  })

  it('tem cabeçalho A–E e nenhuma letra dentro das bolinhas (P2.2)', () => {
    render(<FolhaCorrigida formato="bolhas" questaoIds={IDS} itens={ITENS} atual={0} onIr={() => {}} />)

    const folha = screen.getByRole('list', { name: 'Folha de respostas corrigida' })
    for (const linha of within(folha).getAllByRole('button')) expect(linha.textContent).toMatch(/^\d\d$/)
    expect(screen.getAllByText('A')).toHaveLength(1) // 5 questões: uma coluna, um cabeçalho
    expect(screen.getByRole('button', { name: 'Questão 5: removida da base' }).className).toContain('opacity-40')
  })
})
