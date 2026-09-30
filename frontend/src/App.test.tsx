import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('mostra o nome do produto', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Simulado Fuvest' })).toBeInTheDocument()
  })

  it('avisa que o site não é afiliado à FUVEST/USP', () => {
    render(<App />)

    expect(screen.getByText(/não é afiliado à FUVEST/i)).toBeInTheDocument()
  })
})
