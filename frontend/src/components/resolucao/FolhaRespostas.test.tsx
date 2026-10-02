import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FolhaRespostas } from './FolhaRespostas'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `2099-${String(i + 1).padStart(3, '0')}`)

describe('FolhaRespostas (CR-001, D2)', () => {
  it('no desktop, 90 questões ficam em 3 colunas com as letras só no cabeçalho', () => {
    render(
      <FolhaRespostas formato="bolhas" questaoIds={ids(90)} respostas={{ '2099-001': 'C' }} marcadas={[]} atual={0} onIr={() => {}} />,
    )
    const folha = screen.getByRole('navigation', { name: 'Folha de respostas' })
    const lista = within(folha).getByRole('list')
    expect(lista.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect(lista.style.gridTemplateRows).toBe('repeat(30, auto)')
    // Cabeçalho A–E em cada coluna; nenhuma letra dentro das bolinhas
    expect(within(folha).getAllByText('A')).toHaveLength(3)
    const primeira = within(folha).getByRole('button', { name: 'Questão 1: respondida C' })
    expect(primeira).not.toHaveTextContent('C')
    expect(primeira).toHaveAttribute('aria-current', 'step')
  })

  it('divide em 2 colunas acima de 15 questões e em 1 até 15', () => {
    const { rerender } = render(
      <FolhaRespostas formato="bolhas" questaoIds={ids(20)} respostas={{}} marcadas={[]} atual={0} onIr={() => {}} />,
    )
    expect(screen.getByRole('list').style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')

    rerender(<FolhaRespostas formato="bolhas" questaoIds={ids(10)} respostas={{}} marcadas={[]} atual={0} onIr={() => {}} />)
    expect(screen.getByRole('list').style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))')
  })

  it('resume respondidas, em branco e para revisar', () => {
    render(
      <FolhaRespostas
        formato="bolhas"
        questaoIds={ids(5)}
        respostas={{ '2099-001': 'A', '2099-004': 'E' }}
        marcadas={['2099-002']}
        atual={1}
        onIr={() => {}}
      />,
    )
    expect(screen.getByText('2 respondidas · 3 em branco · 1 para revisar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Questão 2: em branco, marcada para revisar' })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('no celular, a grade mostra a letra marcada e o toque leva à questão', async () => {
    const onIr = vi.fn()
    render(
      <FolhaRespostas formato="grade" questaoIds={ids(10)} respostas={{ '2099-003': 'B' }} marcadas={['2099-003']} atual={0} onIr={onIr} />,
    )
    const celula = screen.getByRole('button', { name: 'Questão 3: respondida B, marcada para revisar' })
    expect(celula).toHaveTextContent('03B')
    expect(celula.className).toContain('h-12') // 48 px (WCAG 2.5.8)

    await userEvent.click(celula)
    expect(onIr).toHaveBeenCalledWith(2)
  })
})

describe('Marcas de sincronismo do painel (UT-054, CR-009 A2)', () => {
  const grade = (n: number) =>
    render(<FolhaRespostas formato="grade" questaoIds={ids(n)} respostas={{}} marcadas={[]} atual={0} onIr={() => {}} />)
  const marcasDa = (nav: HTMLElement) => nav.parentElement!.querySelector<HTMLElement>('[aria-hidden="true"].absolute')!

  it('ficam na altura visível da grade, abaixo do resumo e da legenda, fora da área que rola', () => {
    grade(90)
    const nav = screen.getByRole('navigation', { name: 'Folha de respostas' })
    const marcas = marcasDa(nav)
    expect(nav.contains(marcas)).toBe(false)
    const legenda = screen.getByText('para revisar').closest('p')!
    expect(legenda.compareDocumentPosition(marcas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(marcas.children).toHaveLength(14) // 18 linhas: no máximo 14
  })

  it('num simulado curto, em que a grade cabe inteira, são no máximo 2 por linha, para não se amontoarem', () => {
    const { unmount } = grade(3)
    expect(marcasDa(screen.getByRole('navigation')).children).toHaveLength(2)
    unmount()

    grade(10)
    expect(marcasDa(screen.getByRole('navigation')).children).toHaveLength(4)
  })

  it('não aparecem na folha do desktop, que tem as marcas do cartão', () => {
    render(<FolhaRespostas formato="bolhas" questaoIds={ids(10)} respostas={{}} marcadas={[]} atual={0} onIr={() => {}} />)
    expect(document.querySelector('[aria-hidden="true"].absolute')).toBeNull()
  })
})
