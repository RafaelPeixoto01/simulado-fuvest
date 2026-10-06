import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GraficoColunas } from './GraficoColunas'

/** UT-075: gráfico de colunas da gestão (CR-013, specs/09 §3). */

const PONTOS = [
  { inicio: '2026-10-04', total: 0 },
  { inicio: '2026-10-05', total: 2 },
  { inicio: '2026-10-06', total: 8 },
]

describe('GraficoColunas (UT-075)', () => {
  it('total do período, escala, datas das pontas e tabela com os números', async () => {
    render(<GraficoColunas titulo="Cadastros" pontos={PONTOS} granularidade="dia" unidade="cadastros" />)

    const figura = screen.getByRole('figure', { name: /Cadastros/ })
    expect(figura).toHaveTextContent('10 no período')
    expect(figura).toHaveTextContent('máximo 8')
    expect(figura).toHaveTextContent('04/10')
    const colunas = within(figura).getAllByTestId('coluna')
    expect(colunas).toHaveLength(3)
    // Coluna zero só com a linha de base; a maior ocupa a altura toda
    expect((colunas[0].firstChild as HTMLElement).style.height).toBe('0%')
    expect((colunas[2].firstChild as HTMLElement).style.height).toBe('100%')
    expect((colunas[1].firstChild as HTMLElement).style.minHeight).toBe('2px')

    await userEvent.click(screen.getByText('Ver os números'))
    const tabela = screen.getByRole('table', { name: 'Cadastros' })
    expect(within(tabela).getAllByRole('row').map((r) => r.textContent)).toEqual([
      'DiaCadastros',
      '04/100',
      '05/102',
      '06/108',
    ])
  })

  it('o ponteiro sobre uma coluna mostra o valor dela', () => {
    render(<GraficoColunas titulo="Logins" pontos={PONTOS} granularidade="dia" unidade="logins" />)

    fireEvent.pointerEnter(screen.getAllByTestId('coluna')[1])

    expect(screen.getByRole('figure')).toHaveTextContent('05/10: 2 logins')
  })

  it('média por dia e semanas', () => {
    render(<GraficoColunas titulo="Usuários ativos" pontos={PONTOS} granularidade="semana" unidade="usuários" media />)

    const figura = screen.getByRole('figure')
    expect(figura).toHaveTextContent('média de 3,3 por dia')
    expect(figura).toHaveTextContent('semana de 04/10')
    expect(within(figura).getByRole('columnheader', { name: 'Média por dia' })).toBeInTheDocument()
  })

  it('sem pontos', () => {
    render(<GraficoColunas titulo="Logins" pontos={[]} granularidade="dia" unidade="logins" />)

    expect(screen.getByText('Sem dados no período.')).toBeInTheDocument()
    expect(screen.queryByText('Ver os números')).toBeNull()
  })
})
