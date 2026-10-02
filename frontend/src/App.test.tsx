import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { RolarAoTopo } from './components/RolarAoTopo'
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

/** Botões que navegam como os links e o voltar do navegador. */
function Navegacao() {
  const navegar = useNavigate()
  return (
    <>
      <button type="button" onClick={() => navegar('/historico')}>outra página</button>
      <button type="button" onClick={() => navegar('/historico?filtro=1')}>só a busca</button>
      <button type="button" onClick={() => navegar(-1)}>voltar</button>
    </>
  )
}

describe('Rolagem ao trocar de página (CR-009, R1)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    vi.mocked(window.scrollTo).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('a página nova abre no topo, inclusive ao voltar; não rola ao abrir nem quando muda só a busca', async () => {
    renderizar(
      <>
        <RolarAoTopo />
        <Navegacao />
      </>,
    )
    expect(window.scrollTo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'outra página' }))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 })

    await userEvent.click(screen.getByRole('button', { name: 'só a busca' }))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'voltar' }))
    await userEvent.click(screen.getByRole('button', { name: 'voltar' }))
    // /historico?filtro=1 → /historico (mesmo caminho) → / (caminho novo)
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
  })

  it('vale para as rotas do site: o link da página não encontrada leva ao início no topo', async () => {
    renderizar(<App />, { rota: '/nao-existe' })
    expect(window.scrollTo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
  })
})
