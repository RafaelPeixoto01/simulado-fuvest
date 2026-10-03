import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import type { HistoricoEntry } from '../simulado/tipos'
import { CATALOGO, instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type { CarreiraAlvo, Sessao } from '../types'

const MEDICINA = 'Medicina (São Paulo, Bauru, Ribeirão Preto)'
const ALVO: CarreiraAlvo = {
  ano: 2025,
  codigo: 111,
  pontos_prova: 90,
  carreira: { codigo: 111, nome: MEDICINA, vagas: 244, cortes: { ac: 79, ep: 71, ppi: 60 } },
}

function sessao(carreira_alvo: CarreiraAlvo | null): Sessao {
  return { login_disponivel: true, usuario: { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza', carreira_alvo }, acesso: 'conta' }
}

/** Simulado com `total` questões e 61 acertos; a prova sai dos ids (Prova de um ano). */
function entrada(modo: HistoricoEntry['modo'], total = 90, ano: number | string = 2022): HistoricoEntry {
  const id = `${ano}-001`
  return {
    versao: 1,
    id: `sim-${modo}`,
    modo,
    descricao: modo === 'ano' ? `FUVEST ${ano}` : 'Simulado',
    iniciadoEm: 1_000,
    finalizadoEm: 2_000,
    tempoGastoMs: 1_000,
    tempoLimiteS: 18_000,
    finalizadoPorTempo: false,
    questaoIds: [id],
    resultado: {
      itens: [{ questao_id: id, resposta: 'A', correta: 'A', anulada: false, acertou: true, disciplina: 'fisica' }],
      total,
      acertos: 61,
      percentual: 67.8,
      por_disciplina: [{ disciplina: 'fisica', total, acertos: 61, percentual: 67.8 }],
      ignoradas: [],
    },
  }
}

function api(s: Sessao, historico: HistoricoEntry[]) {
  instalarApiFalsa({
    'GET /api/sessao': () => json(200, s),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/historico': () => json(200, { entradas: historico, rejeitadas: [] }),
    'POST /api/historico': () => json(200, { entradas: historico, rejeitadas: [] }),
    'GET /api/questoes': (_c, url) =>
      json(200, { questoes: url.searchParams.get('ids')!.split(',').map((q) => questaoFalsa(q)), textos_base: {}, nao_encontradas: [] }),
    'GET /api/vitrine': () => json(200, { total_questoes: 270, anos: [2025, 2024, 2023] }),
  })
}

const bloco = () => screen.findByRole('region', { name: 'Notas de corte' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Notas de corte no resultado (UT-059)', () => {
  it('Prova de um ano: os três cortes da carreira-alvo, com a diferença, e o link do ano', async () => {
    api(sessao(ALVO), [entrada('ano')])
    renderizar(<App />, { rota: '/resultado/sim-ano' })

    const regiao = await bloco()
    expect(regiao).toHaveTextContent(`Sua carreira-alvo: ${MEDICINA} · corte FUVEST 2025`)
    const itens = within(within(regiao).getByRole('list', { name: 'Cortes da carreira-alvo' })).getAllByRole('listitem')
    expect(itens.map((i) => i.textContent)).toEqual([
      'Ampla concorrência: corte 79 — faltam 18',
      'Escola pública: corte 71 — faltam 10',
      'Escola pública PPI: corte 60 — atingiu (+1)',
    ])
    expect(regiao).toHaveTextContent('Referência para ir à 2ª fase, não previsão de aprovação.')
    expect(within(regiao).getByRole('link', { name: 'Ver todas as notas de corte' })).toHaveAttribute('href', '/notas-de-corte')
    expect(within(regiao).getByRole('link', { name: 'Ver as notas de corte de 2022' })).toHaveAttribute(
      'href',
      '/notas-de-corte?ano=2022',
    )
  })

  it('Prova completa: sem o link do ano; modalidade sem convocados', async () => {
    const semPpi: CarreiraAlvo = { ...ALVO, carreira: { ...ALVO.carreira!, cortes: { ac: 79, ep: 71, ppi: null } } }
    api(sessao(semPpi), [entrada('completa')])
    renderizar(<App />, { rota: '/resultado/sim-completa' })

    const regiao = await bloco()
    expect(within(regiao).getAllByRole('listitem')[2]).toHaveTextContent('Escola pública PPI: sem convocados')
    expect(within(regiao).queryByRole('link', { name: /Ver as notas de corte de/ })).toBeNull()
  })

  it('sem carreira-alvo, o convite para escolher', async () => {
    api(sessao(null), [entrada('ano')])
    renderizar(<App />, { rota: '/resultado/sim-ano' })

    const regiao = await bloco()
    expect(regiao).toHaveTextContent('Compare sua nota com o corte da carreira que você quer.')
    expect(within(regiao).getByRole('link', { name: 'Escolher carreira-alvo' })).toHaveAttribute('href', '/notas-de-corte')
  })

  it('carreira-alvo que saiu da lista', async () => {
    api(sessao({ ano: 2025, codigo: 999, pontos_prova: 90, carreira: null }), [entrada('ano')])
    renderizar(<App />, { rota: '/resultado/sim-ano' })

    const regiao = await bloco()
    expect(regiao).toHaveTextContent('Sua carreira-alvo não está mais na lista.')
    expect(within(regiao).getByRole('link', { name: 'Escolher de novo' })).toHaveAttribute('href', '/notas-de-corte')
  })

  it('Personalizado não mostra o bloco', async () => {
    api(sessao(ALVO), [entrada('personalizado')])
    renderizar(<App />, { rota: '/resultado/sim-personalizado' })
    expect(await screen.findByRole('heading', { level: 1, name: /Você acertou 61 de 90/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Notas de corte' })).toBeNull()
  })
})

describe('Comparação proporcional (UT-063, CR-011)', () => {
  it('Prova completa de 80 com a lista de 90: a nota convertida, com 1 casa, como estimativa', async () => {
    api(sessao(ALVO), [entrada('completa', 80)])
    renderizar(<App />, { rota: '/resultado/sim-completa' })

    const regiao = await bloco()
    expect(regiao).toHaveTextContent('Sua nota: 61 de 80 · equivale a 68,6 de 90 (estimativa)')
    const itens = within(within(regiao).getByRole('list', { name: 'Cortes da carreira-alvo' })).getAllByRole('listitem')
    expect(itens.map((i) => i.textContent)).toEqual([
      'Ampla concorrência: corte 79 — faltam 10,4',
      'Escola pública: corte 71 — faltam 2,4',
      'Escola pública PPI: corte 60 — atingiu (+8,6)',
    ])
  })

  it('na mesma escala (80 e lista de 80) compara direto, sem estimativa', async () => {
    api(sessao({ ...ALVO, ano: 2027, pontos_prova: 80 }), [entrada('completa', 80)])
    renderizar(<App />, { rota: '/resultado/sim-completa' })

    const regiao = await bloco()
    expect(regiao).not.toHaveTextContent('estimativa')
    expect(within(regiao).getAllByRole('listitem')[0]).toHaveTextContent('Ampla concorrência: corte 79 — faltam 18')
  })

  it('simulado oficial na Prova de um ano: convertido e sem o link de uma lista do ano', async () => {
    api(sessao(ALVO), [entrada('ano', 80, '2027s1')])
    renderizar(<App />, { rota: '/resultado/sim-ano' })

    const regiao = await bloco()
    expect(regiao).toHaveTextContent('equivale a 68,6 de 90 (estimativa)')
    expect(within(regiao).queryByRole('link', { name: /Ver as notas de corte de/ })).toBeNull()
  })
})

describe('Notas de corte no início (UT-060)', () => {
  const cartao = () => screen.findByRole('region', { name: 'Seu último simulado' })

  it('último simulado de 90 questões com carreira-alvo: a linha dos cortes', async () => {
    api(sessao(ALVO), [entrada('ano')])
    renderizar(<App />)

    expect(await cartao()).toHaveTextContent(
      `Corte 2025 · ${MEDICINA}: AC 79 (faltam 18) · EP 71 (faltam 10) · PPI 60 (atingiu)`,
    )
    expect(await cartao()).not.toHaveTextContent('estimativa')
  })

  it('último simulado de 80 questões com a lista de 90: a linha com a nota convertida (UT-064)', async () => {
    api(sessao(ALVO), [entrada('completa', 80)])
    renderizar(<App />)

    const texto = (await cartao()).textContent
    expect(texto).toContain(`Corte 2025 · ${MEDICINA}: AC 79 (faltam 10,4) · EP 71 (faltam 2,4) · PPI 60 (atingiu)`)
    expect(texto).toContain('Sua nota: 61 de 80 · equivale a 68,6 de 90 (estimativa)')
  })

  it('sem carreira-alvo, ou com o último simulado Personalizado, sem a linha', async () => {
    api(sessao(null), [entrada('ano')])
    const { unmount } = renderizar(<App />)
    expect(await cartao()).not.toHaveTextContent('Corte 2025')
    unmount()

    api(sessao(ALVO), [entrada('personalizado')])
    renderizar(<App />)
    expect(await cartao()).not.toHaveTextContent('Corte 2025')
  })
})

describe('Textos de privacidade com a carreira-alvo (UT-061)', () => {
  const GUARDAMOS = 'Guardamos só seu nome, seu e-mail, os resultados dos simulados concluídos e a carreira-alvo, se você escolher uma.'
  const SEM_LOGIN: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }

  it('apresentação e Conta', async () => {
    api(SEM_LOGIN, [])
    const { unmount } = renderizar(<App />)
    expect(await screen.findByText(new RegExp(`^É grátis\\. ${GUARDAMOS}`))).toBeInTheDocument()
    unmount()

    renderizar(<App />, { rota: '/conta' })
    expect(await screen.findByText(new RegExp(`^${GUARDAMOS}`))).toBeInTheDocument()
  })

  it('Privacidade', async () => {
    api(SEM_LOGIN, [])
    renderizar(<App />, { rota: '/privacidade' })

    expect(
      await screen.findByText(/a carreira-alvo que você escolher nas notas de corte \(não guardamos a sua modalidade de concorrência\)/),
    ).toBeInTheDocument()
  })
})
