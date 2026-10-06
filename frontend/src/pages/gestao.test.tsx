import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { CATALOGO, instalarApiFalsa, json, questaoFalsa } from '../test/apiFalsa'
import { renderizar } from '../test/renderizar'
import type {
  AprendizadoGestao,
  EstudantesGestao,
  QualidadeGestao,
  ReporteGestao,
  Sessao,
  UsoGestao,
} from '../types'

/** UT-069 a UT-074 e UT-076: área de gestão (CR-013, specs/09 §3). */

const ANA = { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza' }
const ADMIN: Sessao = { login_disponivel: true, usuario: { ...ANA, admin: true }, acesso: 'conta' }
const COMUM: Sessao = { login_disponivel: true, usuario: { ...ANA, admin: false }, acesso: 'conta' }
const SEM_LOGIN: Sessao = { login_disponivel: true, usuario: null, acesso: 'conta' }

const serie = (a: number, b: number) => [
  { inicio: '2026-10-05', total: a },
  { inicio: '2026-10-06', total: b },
]

const USO: UsoGestao = {
  periodo: '30',
  inicio: '2026-09-07',
  fim: '2026-10-06',
  granularidade: 'dia',
  cartoes: {
    estudantes: 1234,
    novos: 56,
    ativos_hoje: 12,
    ativos_7_dias: 80,
    ativos_30_dias: 300,
    logins: 410,
    gerados: 900,
    concluidos: 640,
    contas_excluidas: 3,
  },
  series: { cadastros: serie(2, 3), logins: serie(4, 5), ativos: serie(10, 12), gerados: serie(20, 30), concluidos: serie(15, 20) },
  modos: [
    { modo: 'completa', gerados: 100, concluidos: 60, taxa_conclusao: 60 },
    { modo: 'personalizado', gerados: 0, concluidos: 0, taxa_conclusao: null },
    { modo: 'ano', gerados: 40, concluidos: 30, taxa_conclusao: 75 },
    { modo: 'treino', gerados: 25, concluidos: null, taxa_conclusao: null },
  ],
  distribuicao: [
    { faixa: '0', estudantes: 5 },
    { faixa: '1', estudantes: 3 },
    { faixa: '2–5', estudantes: 2 },
    { faixa: '6–20', estudantes: 0 },
    { faixa: '21–50', estudantes: 0 },
  ],
  provas_ano: [{ codigo: '2027s1', rotulo: 'Simulado FUVEST 2027 · 1ª edição', concluidos: 9 }],
}

const APRENDIZADO: AprendizadoGestao = {
  periodo: '30',
  inicio: '2026-09-07',
  fim: '2026-10-06',
  modos: [
    { modo: 'completa', concluidos: 60, acerto_medio: 52.5, por_tempo: 10, tempo_medio_questao_s: 135 },
    { modo: 'personalizado', concluidos: 0, acerto_medio: null, por_tempo: null, tempo_medio_questao_s: null },
    { modo: 'ano', concluidos: 30, acerto_medio: 61, por_tempo: 0, tempo_medio_questao_s: 45 },
  ],
  disciplinas: [
    {
      disciplina: 'fisica',
      respostas: 200,
      acertos: 70,
      percentual: 35,
      assuntos: [{ assunto: 'optica', nome: 'Óptica', respostas: 50, acertos: 10, percentual: 20 }],
    },
  ],
  carreiras: [
    {
      ano: 2026, codigo: 111, nome: 'Medicina (São Paulo)', pontos_prova: 90, cortes: { ac: 79, ep: 71, ppi: 60 },
      estudantes: 8, com_prova_completa: 5, atingiriam: { ac: 1, ep: 2, ppi: 3 },
    },
    { ano: 2025, codigo: 999, nome: null, pontos_prova: 90, cortes: null, estudantes: 1, com_prova_completa: 0, atingiriam: null },
  ],
}

const QUALIDADE: QualidadeGestao = {
  base: { provas: 9, questoes: 780, anuladas: 6, sem_assunto: 0, sincronizado_em: '2026-10-06T12:00:00Z' },
  provas: [
    { codigo: '2026', rotulo: 'FUVEST 2026', tipo: 'vestibular', total_questoes: 90, questoes: 90, anuladas: 1, sincronizado_em: '2026-10-06T12:00:00Z' },
  ],
  disciplinas: [{ disciplina: 'fisica', questoes: 95 }],
  reportes: { pendentes: 2, resolvidos: 4, questoes_com_reporte_resolvido: 3, indice_resolvidos: 0.4 },
  suspeitas: [
    {
      questao_id: '2026-037', prova: 'FUVEST 2026', numero: 37, disciplina: 'fisica', assunto: 'Óptica', gabarito: 'B',
      respostas: 40, acertos: 4, percentual: 10, marcacoes: { a: 2, b: 4, c: 30, d: 1, e: 1, em_branco: 2 },
      motivos: ['acerto_baixo', 'alternativa_atrai'],
    },
  ],
}

const PENDENTES: ReporteGestao[] = [
  {
    id: 11, questao_id: '2026-037', tipo: 'gabarito', descricao: 'Acho que é C', status: 'pendente',
    criado_em: '2026-10-05T15:00:00Z', resolvido_em: null,
    questao: { prova: 'FUVEST 2026', numero: 37, disciplina: 'fisica', gabarito: 'B', anulada: false },
  },
  {
    id: 12, questao_id: '2019-001', tipo: 'figura', descricao: null, status: 'pendente',
    criado_em: '2026-10-06T15:00:00Z', resolvido_em: null, questao: null,
  },
]

const ESTUDANTES: EstudantesGestao = {
  total: 120,
  pagina: 1,
  por_pagina: 50,
  estudantes: [
    {
      id: 7, nome: 'Ana Souza', email: 'ana@exemplo.com', criado_em: '2026-10-01T12:00:00Z',
      ultimo_acesso_em: '2026-10-06T12:00:00Z', simulados: 4, carreira_alvo: 'Medicina (São Paulo)', admin: true,
    },
    {
      id: 8, nome: null, email: 'beto@exemplo.com', criado_em: '2026-10-02T12:00:00Z',
      ultimo_acesso_em: '2026-10-02T12:00:00Z', simulados: 0, carreira_alvo: null, admin: false,
    },
  ],
}

function servidor(sessao: Sessao, extra: Parameters<typeof instalarApiFalsa>[0] = {}) {
  return instalarApiFalsa({
    'GET /api/sessao': () => json(200, sessao),
    'GET /api/catalogo': () => json(200, CATALOGO),
    'GET /api/historico': () => json(200, { entradas: [], rejeitadas: [] }),
    'GET /api/gestao/uso': (_c, url) => json(200, { ...USO, periodo: url.searchParams.get('periodo') }),
    'GET /api/gestao/aprendizado': () => json(200, APRENDIZADO),
    'GET /api/gestao/qualidade': () => json(200, QUALIDADE),
    'GET /api/gestao/reportes': (_c, url) =>
      json(200, { reportes: url.searchParams.get('status') === 'pendente' ? PENDENTES : [] }),
    'GET /api/gestao/estudantes': () => json(200, ESTUDANTES),
    ...extra,
  })
}

const pedidos = (fetch: ReturnType<typeof servidor>, caminho: string) =>
  fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith(caminho))

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('Acesso à gestão (UT-069, UT-070, RN-020)', () => {
  it('o administrador vê o link no cabeçalho e no menu do celular', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/historico' })

    expect(await screen.findByRole('link', { name: 'Gestão' })).toHaveAttribute('href', '/gestao')
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    expect(within(menu).getByRole('link', { name: 'Gestão' })).toHaveAttribute('href', '/gestao')
  })

  it('uma conta comum não vê o link, e /gestao é "Página não encontrada" sem pedir os números', async () => {
    const fetch = servidor(COMUM)
    renderizar(<App />, { rota: '/gestao' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gestão' })).toBeNull()
    expect(pedidos(fetch, '/api/gestao')).toEqual([])
  })

  it('sem login, /gestao leva à apresentação', async () => {
    servidor(SEM_LOGIN)
    renderizar(<App />, { rota: '/gestao/estudantes' })

    expect(await screen.findByRole('link', { name: 'Entrar com Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?voltar=%2Fgestao%2Festudantes',
    )
  })

  it('o administrador vê as quatro abas, e o período segue ao trocar de aba', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao?periodo=7' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Gestão' })).toBeInTheDocument()
    const abas = within(screen.getByRole('navigation', { name: 'Seções da gestão' })).getAllByRole('link')
    expect(abas.map((a) => a.textContent)).toEqual(['Uso', 'Aprendizado', 'Qualidade', 'Estudantes'])
    expect(abas[0]).toHaveAttribute('aria-current', 'page')
    expect(abas[1]).toHaveAttribute('href', '/gestao/aprendizado?periodo=7')
    expect(document.title).toBe('Gestão · Uso · Simulado Fuvest')
  })
})

describe('Aba Uso (UT-071)', () => {
  it('mostra os cartões, os gráficos, os modos, a distribuição e as provas', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao' })

    const estudantes = (await screen.findByText('Estudantes', { selector: 'dt' })).parentElement!
    expect(estudantes).toHaveTextContent('1.234')
    expect(estudantes).toHaveTextContent('+56 no período')
    expect(screen.getByText('Ativos em 7 dias', { selector: 'dt' }).parentElement).toHaveTextContent('80')
    expect(screen.getByText('De 07/09/2026 a 06/10/2026, por dia')).toBeInTheDocument()
    expect(screen.getAllByRole('figure')).toHaveLength(5)

    const modos = screen.getByRole('region', { name: 'Simulados por modo' })
    const linhas = within(modos).getAllByRole('row').map((r) => r.textContent)
    expect(linhas[1]).toBe('Prova completa1006060%')
    expect(linhas[2]).toBe('Personalizado00—')
    expect(linhas[4]).toBe('Treino25——')
    expect(screen.getByText('5 estudantes (50%)')).toBeInTheDocument()
    expect(screen.getByText('Simulado FUVEST 2027 · 1ª edição')).toBeInTheDocument()
  })

  it('troca o período pela URL e pede os números de novo', async () => {
    const fetch = servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao' })

    await screen.findByText('Estudantes', { selector: 'dt' })
    expect(pedidos(fetch, '/api/gestao/uso')).toEqual(['/api/gestao/uso?periodo=30'])
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'Últimos 90 dias')

    await waitFor(() => expect(pedidos(fetch, '/api/gestao/uso')).toContain('/api/gestao/uso?periodo=90'))
    expect(screen.getByLabelText('Período')).toHaveValue('90')
  })

  it('erro ao carregar oferece tentar de novo', async () => {
    servidor(ADMIN, { 'GET /api/gestao/uso': () => json(500, { detail: 'erro' }) })
    renderizar(<App />, { rota: '/gestao' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os números.')
  })
})

describe('Aba Aprendizado (UT-072)', () => {
  it('mostra os modos, as disciplinas com os assuntos e as carreiras-alvo', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao/aprendizado' })

    const modos = await screen.findByRole('region', { name: 'Aprendizado por modo' })
    const linhas = within(modos).getAllByRole('row').map((r) => r.textContent)
    expect(linhas[1]).toBe('Prova completa6052,5%10%2 min 15 s')
    expect(linhas[2]).toBe('Personalizado0———')
    expect(screen.getByRole('heading', { level: 3, name: 'Física' })).toBeInTheDocument()
    expect(screen.getByText('70 de 200 respostas (35%)')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Assuntos de Física' })).getByText('Óptica')).toBeInTheDocument()

    const carreiras = screen.getByRole('region', { name: 'Carreiras-alvo e cortes' })
    expect(within(carreiras).getByRole('rowheader', { name: /Medicina \(São Paulo\)/ })).toBeInTheDocument()
    expect(within(carreiras).getByText('de 5 com Prova completa')).toBeInTheDocument()
    expect(within(carreiras).getByText(/2025 · código 999 \(fora da lista\)/)).toBeInTheDocument()
    expect(document.title).toBe('Gestão · Aprendizado · Simulado Fuvest')
  })
})

describe('Aba Qualidade (UT-073)', () => {
  it('mostra a base, o resumo dos reportes e as questões suspeitas', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao/qualidade' })

    expect((await screen.findByText('Questões válidas', { selector: 'dt' })).parentElement).toHaveTextContent('780')
    expect(screen.getByRole('region', { name: 'Provas da base' })).toHaveTextContent('FUVEST 2026')
    expect(screen.getByText(/2 pendentes · 4 resolvidos · 3 questões com reporte resolvido \(0,4% das válidas; meta abaixo de 2%\)/)).toBeInTheDocument()

    const suspeita = screen.getByRole('heading', { level: 3, name: 'FUVEST 2026, questão 37' }).closest('li')!
    expect(suspeita).toHaveTextContent('Acerto de 10% em 40 respostas · gabarito B')
    expect(suspeita).toHaveTextContent('Acerto abaixo de 15%')
    expect(suspeita).toHaveTextContent('A alternativa C foi mais marcada que a correta')
    expect(within(suspeita).getByRole('list', { name: 'Marcações da questão 37' })).toHaveTextContent('B (correta)')
  })

  it('marca os reportes escolhidos como resolvidos e recarrega a lista', async () => {
    const resolvidos: number[][] = []
    const fetch = servidor(ADMIN, {
      'POST /api/gestao/reportes/resolver': (corpo) => {
        resolvidos.push((corpo as { ids: number[] }).ids)
        return json(200, { resolvidos: [11], ja_resolvidos: [], inexistentes: [] })
      },
    })
    renderizar(<App />, { rota: '/gestao/qualidade' })

    const botao = await screen.findByRole('button', { name: 'Marcar 0 como resolvidos' })
    expect(botao).toBeDisabled()
    expect(screen.getByText('2019-001: questão fora da base')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar reporte 11' }))
    await userEvent.click(screen.getByRole('button', { name: 'Marcar 1 como resolvido' }))

    expect(await screen.findByText('1 reporte marcado como resolvido.')).toBeInTheDocument()
    expect(resolvidos).toEqual([[11]])
    await waitFor(() => expect(pedidos(fetch, '/api/gestao/reportes?status=pendente')).toHaveLength(2))
  })

  it('abre a questão reportada com o gabarito marcado e sem "Reportar problema"', async () => {
    servidor(ADMIN, {
      'GET /api/questoes': () => json(200, { questoes: [questaoFalsa('2026-037')], textos_base: {}, nao_encontradas: [] }),
    })
    renderizar(<App />, { rota: '/gestao/qualidade' })

    const reporte = (await screen.findByText(/FUVEST 2026, questão 37 · Física · gabarito B/)).closest('li')!
    await userEvent.click(within(reporte).getByRole('button', { name: 'Ver questão' }))

    expect(await within(reporte).findByText('Enunciado da questão 2026-037')).toBeInTheDocument()
    expect(within(reporte).getByRole('radio', { name: /Alternativa B/ })).toBeDisabled()
    expect(within(reporte).queryByRole('button', { name: 'Reportar problema' })).toBeNull()
    expect(within(reporte).getByRole('button', { name: 'Esconder questão' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('alterna para os resolvidos recentemente', async () => {
    const fetch = servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao/qualidade' })

    await userEvent.click(await screen.findByRole('button', { name: 'Resolvidos recentemente' }))

    expect(await screen.findByText('Nenhum reporte resolvido.')).toBeInTheDocument()
    expect(pedidos(fetch, '/api/gestao/reportes?status=resolvido')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Resolvidos recentemente' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Aba Estudantes (UT-074)', () => {
  it('lista as contas com a paginação', async () => {
    servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao/estudantes' })

    const tabela = await screen.findByRole('region', { name: 'Estudantes' })
    expect(within(tabela).getByRole('rowheader', { name: /Ana Souza/ })).toHaveTextContent('admin')
    expect(within(tabela).getByText('Sem nome')).toBeInTheDocument()
    expect(within(tabela).getByText('Medicina (São Paulo)')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3 · 120 estudantes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('busca, ordem e página vão para o pedido', async () => {
    const fetch = servidor(ADMIN)
    renderizar(<App />, { rota: '/gestao/estudantes' })
    await screen.findByRole('region', { name: 'Estudantes' })

    await userEvent.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'ana')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() =>
      expect(pedidos(fetch, '/api/gestao/estudantes')).toContain('/api/gestao/estudantes?ordem=cadastro&pagina=1&busca=ana'),
    )
    await userEvent.selectOptions(screen.getByLabelText('Ordem'), 'Último acesso mais recente')
    await waitFor(() =>
      expect(pedidos(fetch, '/api/gestao/estudantes')).toContain('/api/gestao/estudantes?ordem=acesso&pagina=1&busca=ana'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() =>
      expect(pedidos(fetch, '/api/gestao/estudantes')).toContain('/api/gestao/estudantes?ordem=acesso&pagina=2&busca=ana'),
    )
  })

  it('nenhum resultado', async () => {
    servidor(ADMIN, { 'GET /api/gestao/estudantes': () => json(200, { ...ESTUDANTES, total: 0, estudantes: [] }) })
    renderizar(<App />, { rota: '/gestao/estudantes?busca=zz' })

    expect(await screen.findByText('Nenhum estudante encontrado.')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar por nome ou e-mail')).toHaveValue('zz')
  })
})

describe('Privacidade (UT-076)', () => {
  it('diz que o responsável vê a lista de contas e que os números do site não identificam ninguém', async () => {
    servidor(COMUM)
    renderizar(<App />, { rota: '/privacidade' })

    expect(await screen.findByText(/as datas de cadastro e do último\s+acesso/)).toBeInTheDocument()
    expect(screen.getByText(/O responsável pelo site vê a lista de contas/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Números do site' })).toBeInTheDocument()
    expect(screen.getByText(/Esses números não identificam ninguém e continuam depois que uma conta é excluída/)).toBeInTheDocument()
  })
})
