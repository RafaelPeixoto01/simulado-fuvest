import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { instalarApiFalsa, json, SESSAO_ANONIMA } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { CarreiraAlvo, CarreiraCorte, NotasCorte, Sessao } from '../types'

const MEDICINA: CarreiraCorte = {
  codigo: 111,
  nome: 'Medicina (São Paulo, Bauru, Ribeirão Preto)',
  vagas: 244,
  cortes: { ac: 79, ep: 71, ppi: 60 },
}
const MUSICA: CarreiraCorte = { codigo: 524, nome: 'Música (São Paulo)', vagas: 50, cortes: { ac: 40, ep: 27, ppi: null } }
const PSICOLOGIA: CarreiraCorte = { codigo: 117, nome: 'Psicologia (São Paulo)', vagas: 51, cortes: { ac: 66, ep: 56, ppi: 48 } }
const MEDICINA_2024: CarreiraCorte = { codigo: 460, nome: 'Medicina (São Paulo)', vagas: 128, cortes: { ac: 79, ep: 73, ppi: 64 } }

const FONTE = (ano: number) => `https://www.fuvest.br/wp-content/uploads/fuvest_${ano}_notas_de_corte.pdf`
const NOTAS: Record<number, NotasCorte> = {
  2025: { anos: [2025, 2024], recente: 2025, ano: 2025, fonte: FONTE(2025), carreiras: [PSICOLOGIA, MEDICINA, MUSICA] },
  2024: { anos: [2025, 2024], recente: 2025, ano: 2024, fonte: FONTE(2024), carreiras: [MEDICINA_2024] },
}

function sessaoCom(carreira_alvo: CarreiraAlvo | null = null): Sessao {
  return {
    login_disponivel: true,
    usuario: { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza', carreira_alvo },
    acesso: 'conta',
  }
}

/** API falsa com as regras do backend (specs/08 §2.5): só carreiras do ano mais recente. */
function servidor(inicial: Sessao, extra: Parameters<typeof instalarApiFalsa>[0] = {}) {
  let sessao = inicial
  const fetch = instalarApiFalsa({
    'GET /api/sessao': () => json(200, sessao),
    'GET /api/historico': () => json(200, { entradas: [], rejeitadas: [] }),
    'GET /api/notas-corte': (_c, url) => json(200, NOTAS[Number(url.searchParams.get('ano'))] ?? NOTAS[2025]),
    'PUT /api/conta/carreira-alvo': (corpo) => {
      const { ano, codigo } = corpo as { ano: number; codigo: number }
      const alvo: CarreiraAlvo = { ano, codigo, carreira: NOTAS[2025].carreiras.find((c) => c.codigo === codigo)! }
      sessao = { ...sessao, usuario: { ...sessao.usuario!, carreira_alvo: alvo } }
      return json(200, alvo)
    },
    'DELETE /api/conta/carreira-alvo': () => {
      sessao = { ...sessao, usuario: { ...sessao.usuario!, carreira_alvo: null } }
      return new Response(null, { status: 204 })
    },
    ...extra,
  })
  const chamadas = (metodo: string) =>
    fetch.mock.calls.filter(([u, init]) => String(u) === '/api/conta/carreira-alvo' && init?.method === metodo)
  return { chamadas }
}

const linhas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const nomesDasLinhas = () => linhas().map((l) => within(l).getAllByRole('cell')[0].textContent)

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Página de notas de corte (UT-057)', () => {
  it('mostra o ano mais recente, as carreiras por nome e como ler o corte', async () => {
    servidor(sessaoCom())
    renderizar(<App />, { rota: '/notas-de-corte' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Notas de corte' })).toBeInTheDocument()
    expect(document.title).toBe('Notas de corte · Simulado Fuvest')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveValue('2025'))
    expect(nomesDasLinhas()).toEqual([MEDICINA.nome, MUSICA.nome, PSICOLOGIA.nome])
    const musica = within(linhas()[1]).getAllByRole('cell')
    expect(musica.map((c) => c.textContent?.replace(/^(Vagas|AC|EP|PPI)\s*/, ''))).toEqual(
      expect.arrayContaining(['50', '40', '27', '—']),
    )
    expect(screen.getByText(/menos de 27 pontos \(30% da prova\) é eliminado/)).toBeInTheDocument()
    expect(screen.getByText(/não uma previsão de aprovação/)).toBeInTheDocument()
    const fonte = screen.getByRole('link', { name: /Notas de Corte 2025/ })
    expect(fonte).toHaveAttribute('href', FONTE(2025))
    expect(fonte).toHaveAttribute('target', '_blank')
  })

  it('troca o ano pelo seletor; anos anteriores não têm o botão de carreira-alvo', async () => {
    servidor(sessaoCom())
    renderizar(<App />, { rota: '/notas-de-corte' })
    await screen.findByRole('button', { name: `Definir ${MEDICINA.nome} como carreira-alvo` })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ano' }), '2024')

    await waitFor(() => expect(nomesDasLinhas()).toEqual([MEDICINA_2024.nome]))
    expect(screen.queryByRole('button', { name: /como carreira-alvo/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Notas de Corte 2024/ })).toHaveAttribute('href', FONTE(2024))
  })

  it('ano da URL que não está na base mostra o mais recente com aviso', async () => {
    servidor(sessaoCom())
    renderizar(<App />, { rota: '/notas-de-corte?ano=2021' })

    expect(await screen.findByText('Não há notas de corte de 2021 na base. Mostrando FUVEST 2025.')).toBeInTheDocument()
  })

  it('busca pelo nome sem acento e pelo código, com a contagem', async () => {
    servidor(sessaoCom())
    renderizar(<App />, { rota: '/notas-de-corte' })
    expect(await screen.findByText('3 carreiras')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar carreira' }), 'musica')
    expect(nomesDasLinhas()).toEqual([MUSICA.nome])
    expect(screen.getByText('1 carreira')).toBeInTheDocument()

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar carreira' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar carreira' }), 'odontologia')
    expect(screen.getByText('Nenhuma carreira encontrada.')).toBeInTheDocument()
  })

  it('sem notas de corte publicadas', async () => {
    servidor(sessaoCom(), {
      'GET /api/notas-corte': () => json(200, { anos: [], recente: null, ano: null, fonte: null, carreiras: [] }),
    })
    renderizar(<App />, { rota: '/notas-de-corte' })

    expect(await screen.findByText('As notas de corte ainda não estão disponíveis.')).toBeInTheDocument()
  })
})

describe('Carreira-alvo na página (UT-058)', () => {
  it('define a carreira-alvo na lista mais recente', async () => {
    const { chamadas } = servidor(sessaoCom())
    renderizar(<App />, { rota: '/notas-de-corte' })
    expect(await screen.findByText(/Escolha uma carreira-alvo para comparar/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: `Definir ${MEDICINA.nome} como carreira-alvo` }))

    expect(await screen.findByRole('status')).toHaveTextContent(`${MEDICINA.nome} agora é a sua carreira-alvo.`)
    expect(JSON.parse(String(chamadas('PUT')[0][1]!.body))).toEqual({ ano: 2025, codigo: 111 })
    const cartao = screen.getByRole('region', { name: 'Sua carreira-alvo' })
    expect(cartao).toHaveTextContent(MEDICINA.nome)
    expect(cartao).toHaveTextContent('AC 79')
    expect(within(linhas()[0]).getByText('Sua carreira-alvo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Definir ${MEDICINA.nome} como carreira-alvo` })).toBeNull()
  })

  it('remove a carreira-alvo', async () => {
    const { chamadas } = servidor(sessaoCom({ ano: 2025, codigo: 111, carreira: MEDICINA }))
    renderizar(<App />, { rota: '/notas-de-corte' })

    await userEvent.click(await screen.findByRole('button', { name: 'Remover' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Carreira-alvo removida.')
    expect(chamadas('DELETE')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Sua carreira-alvo' })).toBeNull()
  })

  it('carreira-alvo de uma lista anterior pede para escolher de novo', async () => {
    servidor(sessaoCom({ ano: 2024, codigo: 460, carreira: MEDICINA_2024 }))
    renderizar(<App />, { rota: '/notas-de-corte' })

    expect(await screen.findByText(/Sua carreira-alvo é da lista de 2024\. Escolha de novo na lista de 2025/)).toBeInTheDocument()
  })

  it('carreira-alvo que saiu da lista', async () => {
    servidor(sessaoCom({ ano: 2025, codigo: 999, carreira: null }))
    renderizar(<App />, { rota: '/notas-de-corte' })

    expect(await screen.findByText('Sua carreira-alvo não está mais na lista. Escolha outra.')).toBeInTheDocument()
  })

  it('erro ao salvar', async () => {
    servidor(sessaoCom(), { 'PUT /api/conta/carreira-alvo': () => json(500, { detail: 'falhou' }) })
    renderizar(<App />, { rota: '/notas-de-corte' })

    await userEvent.click(await screen.findByRole('button', { name: `Definir ${MEDICINA.nome} como carreira-alvo` }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a carreira-alvo. Tente novamente.')
  })

  it('sem usuário (desenvolvimento sem login): tabela sem carreira-alvo', async () => {
    instalarApiFalsa({ 'GET /api/notas-corte': () => json(200, NOTAS[2025]), 'GET /api/sessao': () => json(200, SESSAO_ANONIMA) })
    renderizar(<App />, { rota: '/notas-de-corte' })

    await waitFor(() => expect(nomesDasLinhas()).toHaveLength(3))
    expect(screen.queryByRole('button', { name: /como carreira-alvo/ })).toBeNull()
    expect(screen.queryByText(/Escolha uma carreira-alvo/)).toBeNull()
  })

  it('link "Notas de corte" no cabeçalho e no menu do celular', async () => {
    servidor(sessaoCom())
    renderizar(<App />, { rota: '/privacidade' })

    const links = await screen.findAllByRole('link', { name: 'Notas de corte' })
    expect(links[0]).toHaveAttribute('href', '/notas-de-corte')
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    expect(within(screen.getByRole('navigation', { name: 'Menu' })).getByRole('link', { name: 'Notas de corte' })).toHaveAttribute(
      'href',
      '/notas-de-corte',
    )
  })
})
