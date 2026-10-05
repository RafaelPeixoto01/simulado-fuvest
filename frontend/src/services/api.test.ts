import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, urlEntrar } from './api'

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia o pedido de simulado como JSON e devolve o corpo', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respostaJson(200, { modo: 'ano', questoes: [] }))
    vi.stubGlobal('fetch', fetchFalso)

    const simulado = await api.gerarSimulado({ modo: 'ano', prova: '2025' })

    expect(simulado.modo).toBe('ano')
    const [url, init] = fetchFalso.mock.calls[0]
    expect(url).toBe('/api/simulados')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ modo: 'ano', prova: '2025' })
  })

  it('junta os ids na consulta de questões', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respostaJson(200, { questoes: [] }))
    vi.stubGlobal('fetch', fetchFalso)

    await api.questoes(['2025-001', '2025-002'])

    expect(fetchFalso.mock.calls[0][0]).toBe('/api/questoes?ids=2025-001%2C2025-002')
  })

  it('erro de domínio vira ApiError com código e dados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respostaJson(409, {
          detail: { codigo: 'questoes_insuficientes', mensagem: 'Só existem 12', disponiveis: 12 },
        }),
      ),
    )

    const erro = await api.gerarSimulado({ modo: 'completa' }).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({ status: 409, codigo: 'questoes_insuficientes', message: 'Só existem 12' })
    expect((erro as ApiError).dados).toMatchObject({ disponiveis: 12 })
  })

  it('limite de requisições tem mensagem própria', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson(429, { detail: 'Muitas requisições. Tente novamente em instantes.' })),
    )

    const erro = await api.catalogo().catch((e: unknown) => e)

    expect(erro).toMatchObject({ status: 429, message: 'Muitas requisições. Tente novamente em instantes.' })
  })

  it('falha de rede vira ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const erro = await api.catalogo().catch((e: unknown) => e)

    expect(erro).toMatchObject({ status: 0, message: 'Sem conexão com o servidor. Verifique sua internet.' })
  })

  it('resposta 204 (sair, limpar, excluir) resolve sem corpo (UT-032)', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchFalso)

    await expect(api.sair()).resolves.toBeUndefined()

    const [url, init] = fetchFalso.mock.calls[0]
    expect(url).toBe('/api/sessao')
    expect(init.method).toBe('DELETE')
  })

  it('a URL de entrar leva o caminho de volta', () => {
    expect(urlEntrar('/conta')).toBe('/api/auth/google?voltar=%2Fconta')
  })
})
