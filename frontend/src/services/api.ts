import type { HistoricoEntry } from '../simulado/tipos'
import type {
  AprendizadoGestao,
  CarreiraAlvo,
  Catalogo,
  Correcao,
  EstudantesGestao,
  NotasCorte,
  OrdemEstudantes,
  PeriodoGestao,
  QualidadeGestao,
  ReporteGestao,
  ResolucaoReportes,
  StatusReporte,
  UsoGestao,
  PedidoSimulado,
  QuestoesPorId,
  RespostaItem,
  Sessao,
  Simulado,
  TipoReporte,
  Vitrine,
} from '../types'

/** Histórico da conta (CR-005): do mais recente para o mais antigo + ids recusados no envio. */
export interface RespostaHistorico {
  entradas: HistoricoEntry[]
  rejeitadas: string[]
}

export class ApiError extends Error {
  readonly status: number
  readonly codigo?: string
  readonly dados?: Record<string, unknown>

  constructor(status: number, mensagem: string, codigo?: string, dados?: Record<string, unknown>) {
    super(mensagem)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.dados = dados
  }
}

const MENSAGEM_PADRAO = 'Não foi possível completar a operação. Tente novamente.'

// Login obrigatório (CR-006): a sessão acabou (401 nao_autenticado) ou o site fechou
// (503 site_indisponivel). Vale para qualquer chamada, inclusive as feitas fora do React Query
// (Treino, reporte); o app registra aqui o que fazer (recarregar a sessão — queryClient.ts)
let aoErroDeAcesso: ((erro: ApiError) => void) | null = null

export function definirAoErroDeAcesso(tratar: ((erro: ApiError) => void) | null) {
  aoErroDeAcesso = tratar
}

function erroDeAcesso(erro: ApiError): boolean {
  return (
    (erro.status === 401 && erro.codigo === 'nao_autenticado') ||
    (erro.status === 503 && erro.codigo === 'site_indisponivel')
  )
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.')
  }
  if (resposta.ok) {
    if (resposta.status === 204) return undefined as T // sair, limpar, excluir: sem corpo
    return (await resposta.json()) as T
  }
  let detalhe: unknown
  try {
    detalhe = ((await resposta.json()) as { detail?: unknown }).detail
  } catch {
    detalhe = undefined
  }
  // Erro de dominio: {codigo, mensagem, ...}; 429 e outros: detail em texto
  if (detalhe && typeof detalhe === 'object' && 'codigo' in detalhe) {
    const d = detalhe as Record<string, unknown>
    const erro = new ApiError(resposta.status, String(d.mensagem ?? MENSAGEM_PADRAO), String(d.codigo), d)
    if (erroDeAcesso(erro)) aoErroDeAcesso?.(erro)
    throw erro
  }
  throw new ApiError(resposta.status, typeof detalhe === 'string' ? detalhe : MENSAGEM_PADRAO)
}

function post<T>(caminho: string, corpo: unknown): Promise<T> {
  return requisitar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) })
}

function put<T>(caminho: string, corpo: unknown): Promise<T> {
  return requisitar<T>(caminho, { method: 'PUT', body: JSON.stringify(corpo) })
}

function apagar(caminho: string): Promise<void> {
  return requisitar<void>(caminho, { method: 'DELETE' })
}

/** O login é uma navegação de página inteira, nunca um fetch (ADR-010). */
export function urlEntrar(voltar: string): string {
  return `/api/auth/google?${new URLSearchParams({ voltar })}`
}

export const api = {
  catalogo: () => requisitar<Catalogo>('/api/catalogo'),
  // Pública (CR-007): só os totais da base, para a apresentação
  vitrine: () => requisitar<Vitrine>('/api/vitrine'),
  gerarSimulado: (pedido: PedidoSimulado) => post<Simulado>('/api/simulados', pedido),
  questoes: (ids: string[]) =>
    requisitar<QuestoesPorId>(`/api/questoes?${new URLSearchParams({ ids: ids.join(',') })}`),
  corrigir: (respostas: RespostaItem[]) => post<Correcao>('/api/correcoes', { respostas }),
  reportar: (dados: { questao_id: string; tipo: TipoReporte; descricao?: string }) =>
    post<{ id: number }>('/api/reportes', dados),
  // Conta (CR-005): o cookie de sessão vai sozinho (mesma origem)
  sessao: () => requisitar<Sessao>('/api/sessao'),
  sair: () => apagar('/api/sessao'),
  historico: () => requisitar<RespostaHistorico>('/api/historico'),
  enviarHistorico: (entradas: HistoricoEntry[]) => post<RespostaHistorico>('/api/historico', { entradas }),
  limparHistoricoDaConta: () => apagar('/api/historico'),
  excluirConta: () => apagar('/api/conta'),
  // Notas de corte e carreira-alvo (CR-010): sem ano, o mais recente
  notasCorte: (ano: number | null) =>
    requisitar<NotasCorte>(ano ? `/api/notas-corte?${new URLSearchParams({ ano: String(ano) })}` : '/api/notas-corte'),
  definirCarreiraAlvo: (pedido: { ano: number; codigo: number }) =>
    put<CarreiraAlvo>('/api/conta/carreira-alvo', pedido),
  removerCarreiraAlvo: () => apagar('/api/conta/carreira-alvo'),
  // Área de gestão (CR-013): só o administrador; para os demais, 404
  gestaoUso: (periodo: PeriodoGestao) => requisitar<UsoGestao>(`/api/gestao/uso?${new URLSearchParams({ periodo })}`),
  gestaoAprendizado: (periodo: PeriodoGestao) =>
    requisitar<AprendizadoGestao>(`/api/gestao/aprendizado?${new URLSearchParams({ periodo })}`),
  gestaoQualidade: () => requisitar<QualidadeGestao>('/api/gestao/qualidade'),
  gestaoReportes: (status: StatusReporte) =>
    requisitar<{ reportes: ReporteGestao[] }>(`/api/gestao/reportes?${new URLSearchParams({ status })}`),
  resolverReportes: (ids: number[]) => post<ResolucaoReportes>('/api/gestao/reportes/resolver', { ids }),
  gestaoEstudantes: ({ busca, ordem, pagina }: { busca: string; ordem: OrdemEstudantes; pagina: number }) => {
    const params = new URLSearchParams({ ordem, pagina: String(pagina) })
    if (busca) params.set('busca', busca)
    return requisitar<EstudantesGestao>(`/api/gestao/estudantes?${params}`)
  },
}
