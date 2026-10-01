import { vi } from 'vitest'

import type { HistoricoEntry } from '../simulado/tipos'
import type { Catalogo, Questao, Sessao, Simulado } from '../types'

type Manipulador = (corpo: unknown, url: URL) => Response | Promise<Response>

export function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Sem conta e com o login desligado: o padrão de todo teste que não fala de conta (CR-005). */
export const SESSAO_ANONIMA: Sessao = { login_disponivel: false, usuario: null }

/** Substitui o fetch global roteando por "METODO /caminho". Devolve o mock para inspeção.
 *  `GET /api/sessao` responde SESSAO_ANONIMA, a menos que o teste a substitua. */
export function instalarApiFalsa(rotas: Record<string, Manipulador>) {
  const todas: Record<string, Manipulador> = { 'GET /api/sessao': () => json(200, SESSAO_ANONIMA), ...rotas }
  const falso = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), 'http://localhost')
    const chave = `${init?.method ?? 'GET'} ${url.pathname}`
    const manipulador = todas[chave]
    if (!manipulador) return json(404, { detail: `sem rota falsa para ${chave}` })
    const corpo = init?.body ? JSON.parse(String(init.body)) : undefined
    return manipulador(corpo, url)
  })
  vi.stubGlobal('fetch', falso)
  return falso
}

export const CATALOGO: Catalogo = {
  provas: [
    { ano: 2025, versao: 'V1', total_questoes: 90, url_prova: 'https://www.fuvest.br/p2025.pdf', url_gabarito: 'https://www.fuvest.br/g2025.pdf' },
    { ano: 2024, versao: 'V1', total_questoes: 90, url_prova: 'https://www.fuvest.br/p2024.pdf', url_gabarito: 'https://www.fuvest.br/g2024.pdf' },
  ],
  disciplinas: [
    { slug: 'biologia', nome: 'Biologia', total_questoes: 22, assuntos: [] },
    {
      slug: 'fisica',
      nome: 'Física',
      total_questoes: 24,
      assuntos: [
        { slug: 'optica', nome: 'Óptica', total_questoes: 14 },
        { slug: 'eletrodinamica', nome: 'Eletrodinâmica e circuitos', total_questoes: 10 },
      ],
    },
    { slug: 'geografia', nome: 'Geografia', total_questoes: 22, assuntos: [] },
    { slug: 'historia', nome: 'História', total_questoes: 22, assuntos: [] },
    { slug: 'ingles', nome: 'Inglês', total_questoes: 20, assuntos: [] },
    { slug: 'matematica', nome: 'Matemática', total_questoes: 24, assuntos: [] },
    { slug: 'portugues', nome: 'Português', total_questoes: 24, assuntos: [] },
    {
      slug: 'quimica',
      nome: 'Química',
      total_questoes: 20,
      assuntos: [{ slug: 'organica', nome: 'Química orgânica', total_questoes: 20 }],
    },
  ],
  total_questoes: 178,
  distribuicao_completa: { biologia: 11, fisica: 12, geografia: 11, historia: 11, ingles: 10, matematica: 12, portugues: 12, quimica: 11 },
  completa_disponivel: true,
}

export function questaoFalsa(id: string, extra: Partial<Questao> = {}): Questao {
  const [ano, numero] = id.split('-').map(Number)
  return {
    id,
    ano,
    numero,
    disciplina: 'fisica',
    disciplinas_secundarias: [],
    texto_base_id: null,
    enunciado: [{ texto: `Enunciado da questão ${id}`, figura: null }],
    alternativas: {
      A: { texto: `A da ${id}`, figura: null },
      B: { texto: `B da ${id}`, figura: null },
      C: { texto: `C da ${id}`, figura: null },
      D: { texto: `D da ${id}`, figura: null },
      E: { texto: `E da ${id}`, figura: null },
    },
    ...extra,
  }
}

export function simuladoFalso(ids: string[], extra: Partial<Simulado> = {}): Simulado {
  return {
    modo: 'completa',
    questoes: ids.map((id) => questaoFalsa(id)),
    textos_base: {},
    tempo_limite_s: 18000,
    pausavel: false,
    disponiveis: ids.length,
    semente: 1,
    ...extra,
  }
}

/** Entrada de histórico mínima e válida (1 questão de Física, acertada). */
export function entradaFalsa(id: string, finalizadoEm: number): HistoricoEntry {
  return {
    versao: 1,
    id,
    modo: 'ano',
    descricao: `Simulado ${id}`,
    iniciadoEm: finalizadoEm - 1000,
    finalizadoEm,
    tempoGastoMs: 1000,
    tempoLimiteS: 18000,
    finalizadoPorTempo: false,
    questaoIds: ['2099-001'],
    resultado: {
      itens: [{ questao_id: '2099-001', resposta: 'A', correta: 'A', anulada: false, acertou: true, disciplina: 'fisica' }],
      total: 1,
      acertos: 1,
      percentual: 100,
      por_disciplina: [],
      ignoradas: [],
    },
  }
}
