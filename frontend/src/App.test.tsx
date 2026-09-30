import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { renderizar } from './test/renderizar'

describe('App', () => {
  beforeEach(() => {
    // A Home consulta o catálogo; aqui basta que a chamada não quebre
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra o nome do produto como link para o início', () => {
    renderizar(<App />)

    expect(screen.getByRole('link', { name: 'Simulado Fuvest' })).toHaveAttribute('href', '/')
  })

  it('avisa que o site não é afiliado à FUVEST/USP', () => {
    renderizar(<App />)

    expect(screen.getByText(/não é afiliado à FUVEST/i)).toBeInTheDocument()
  })

  it('rota desconhecida mostra página não encontrada com volta ao início', () => {
    renderizar(<App />, { rota: '/nao-existe' })

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
  })

  it('tem link para o histórico', () => {
    renderizar(<App />)

    expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute('href', '/historico')
  })
})
