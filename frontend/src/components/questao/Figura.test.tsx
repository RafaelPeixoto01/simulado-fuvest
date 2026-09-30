import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Figura } from './Figura'

describe('Figura', () => {
  it('amplia ao clicar e fecha com Esc', async () => {
    render(<Figura src="/figuras/2099/q015-1.webp" alt="Figura da questão 15" />)

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' }))

    const dialogo = screen.getByRole('dialog', { name: 'Figura da questão 15' })
    expect(dialogo).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('imagem que não carrega vira aviso', () => {
    render(<Figura src="/quebrada.webp" alt="Figura X" />)

    fireEvent.error(screen.getByAltText('Figura X'))

    expect(screen.getByText('Não foi possível carregar a figura.')).toBeInTheDocument()
  })
})
