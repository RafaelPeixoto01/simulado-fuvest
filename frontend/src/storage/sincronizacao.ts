// Histórico da conta com espelho no navegador (CR-005, ADR-011, specs/07 §2.4).
// Regra de segurança: só sai do navegador o que a marca registra como confirmado pelo
// servidor. Uma entrada pendente (sem conta, D1, ou sem rede) nunca é apagada aqui.

import { api } from '../services/api'
import type { HistoricoEntry } from '../simulado/tipos'
import {
  gravarMarcaConta,
  LIMITE_HISTORICO,
  lerMarcaConta,
  limparHistorico,
  listarHistorico,
  removerMarcaConta,
  substituirHistorico,
} from './historicoStorage'

const maisRecentePrimeiro = (a: HistoricoEntry, b: HistoricoEntry) => b.finalizadoEm - a.finalizadoEm

// Uma operação por vez sobre o histórico: uma sincronização que termina depois de "Sair",
// "Limpar" ou "Excluir" regravaria o espelho (ou reenviaria entradas) já apagado
let fila: Promise<unknown> = Promise.resolve()

/** Roda `tarefa` depois das operações em andamento, e as seguintes esperam por ela. */
export function exclusivo<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa)
  fila = resultado.catch(() => undefined)
  return resultado
}

// Recusadas pelo servidor nesta carga da página: não são reenviadas a cada sincronização.
// Depois de recarregar (talvez com um deploy que as aceite), são tentadas de novo
const recusadasNestaCarga = new Set<string>()

/** Sincronização sem fila: só dentro de `exclusivo` (ex.: o envio de pendentes do "Sair"). */
export async function sincronizarAgora(usuarioId: number): Promise<HistoricoEntry[]> {
  let marca = lerMarcaConta()
  const lido = listarHistorico()
  const lidas = new Set(lido.map((e) => e.id))
  let local = lido
  if (marca && marca.conta !== usuarioId) {
    // Espelho de outra conta, cuja sessão acabou sem "Sair": não vai para esta (D2)
    const daOutra = new Set(marca.ids)
    local = local.filter((e) => !daOutra.has(e.id))
    marca = null
  }
  const confirmadas = new Set(marca?.ids ?? [])
  const naoConfirmadas = local.filter((e) => !confirmadas.has(e.id))
  const pendentes = naoConfirmadas.filter((e) => !recusadasNestaCarga.has(e.id))

  const resposta = pendentes.length > 0 ? await api.enviarHistorico(pendentes) : await api.historico()

  for (const id of resposta.rejeitadas) recusadasNestaCarga.add(id)
  const daConta = new Set(resposta.entradas.map((e) => e.id))
  // Recusadas ficam só neste navegador; e o que outra aba gravou enquanto a chamada
  // andava continua pendente, para a próxima sincronização
  const soNoNavegador = [
    ...naoConfirmadas.filter((e) => recusadasNestaCarga.has(e.id)),
    ...listarHistorico().filter((e) => !lidas.has(e.id)),
  ].filter((e) => !daConta.has(e.id))
  const lista = [...resposta.entradas, ...soNoNavegador].sort(maisRecentePrimeiro).slice(0, LIMITE_HISTORICO)

  substituirHistorico(lista)
  gravarMarcaConta({ conta: usuarioId, ids: [...daConta] })
  return lista
}

/** Envia as pendentes, recebe o histórico da conta e faz dele o histórico deste navegador. */
export function sincronizarHistorico(usuarioId: number): Promise<HistoricoEntry[]> {
  return exclusivo(() => sincronizarAgora(usuarioId))
}

/** Sem sessão: tira do navegador o espelho da conta (D2); as pendentes ficam (D1),
 *  inclusive as que o servidor recusou, que só existem aqui. */
export function historicoSemConta(): HistoricoEntry[] {
  const marca = lerMarcaConta()
  if (marca) {
    const daConta = new Set(marca.ids)
    substituirHistorico(listarHistorico().filter((e) => !daConta.has(e.id)))
    removerMarcaConta()
  }
  return listarHistorico()
}

/** "Excluir conta": nada do histórico fica neste navegador. */
export function apagarHistoricoDoNavegador(): void {
  limparHistorico()
  removerMarcaConta()
}

/** Só para os testes: zera a memória das recusadas (cada teste é uma "carga de página"). */
export function esquecerRecusadas(): void {
  recusadasNestaCarga.clear()
}
