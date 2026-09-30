import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('abre ajustada à tela; "Tamanho real" mostra o tamanho natural (P1.6, CR-003)', async () => {
    render(<Figura src="/figuras/2099/q015-1.webp" alt="Figura da questão 15" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' }))

    const dialogo = screen.getByRole('dialog', { name: 'Figura da questão 15' })
    const ajustar = within(dialogo).getByRole('button', { name: 'Ajustar à tela' })
    const real = within(dialogo).getByRole('button', { name: 'Tamanho real' })
    const imagem = within(dialogo).getByRole('img', { name: 'Figura da questão 15' })
    expect(ajustar).toHaveAttribute('aria-pressed', 'true')
    expect(imagem.className).toContain('object-contain')
    expect(within(dialogo).getByRole('button', { name: 'Fechar figura' })).toHaveFocus()

    await userEvent.click(real)
    expect(real).toHaveAttribute('aria-pressed', 'true')
    expect(ajustar).toHaveAttribute('aria-pressed', 'false')
    expect(imagem.className).toContain('max-w-none')
    expect(imagem.className).not.toContain('object-contain')
  })

  it('fecha pelo botão e pelo fundo escuro, mas não ao clicar na figura', async () => {
    render(<Figura src="/figuras/2099/q015-1.webp" alt="Figura da questão 15" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' }))

    const dialogo = screen.getByRole('dialog', { name: 'Figura da questão 15' })
    await userEvent.click(within(dialogo).getByRole('img', { name: 'Figura da questão 15' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(dialogo)
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fechar figura' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' })).toHaveFocus()
  })

  it('ajustada à tela, o clique na faixa escura em volta da figura fecha; na figura, não', async () => {
    render(<Figura src="/figuras/2099/q015-1.webp" alt="Figura da questão 15" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar: Figura da questão 15' }))

    // Figura 400 × 100 numa área de 800 × 800: pintada em 800 × 200, de y = 300 a y = 500
    const imagem = within(screen.getByRole('dialog')).getByRole('img')
    Object.defineProperty(imagem, 'naturalWidth', { value: 400 })
    Object.defineProperty(imagem, 'naturalHeight', { value: 100 })
    imagem.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}) })

    fireEvent.click(imagem, { clientX: 400, clientY: 400 })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(imagem, { clientX: 400, clientY: 100 })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('imagem que não carrega vira aviso', () => {
    render(<Figura src="/quebrada.webp" alt="Figura X" />)

    fireEvent.error(screen.getByAltText('Figura X'))

    expect(screen.getByText('Não foi possível carregar a figura.')).toBeInTheDocument()
  })
})
