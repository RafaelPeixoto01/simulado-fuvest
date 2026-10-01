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

/** Envia as pendentes, recebe o histórico da conta e faz dele o histórico deste navegador. */
export async function sincronizarHistorico(usuarioId: number): Promise<HistoricoEntry[]> {
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
  const pendentes = local.filter((e) => !confirmadas.has(e.id))

  const resposta = pendentes.length > 0 ? await api.enviarHistorico(pendentes) : await api.historico()

  const daConta = new Set(resposta.entradas.map((e) => e.id))
  const recusadas = new Set(resposta.rejeitadas)
  // Recusadas pelo servidor ficam só neste navegador; e o que outra aba gravou enquanto
  // a chamada andava continua pendente, para a próxima sincronização
  const soNoNavegador = [
    ...pendentes.filter((e) => recusadas.has(e.id)),
    ...listarHistorico().filter((e) => !lidas.has(e.id)),
  ].filter((e) => !daConta.has(e.id))
  const lista = [...resposta.entradas, ...soNoNavegador].sort(maisRecentePrimeiro).slice(0, LIMITE_HISTORICO)

  substituirHistorico(lista)
  gravarMarcaConta({ conta: usuarioId, ids: [...daConta] })
  return lista
}

/** Sem sessão: tira do navegador o espelho da conta (D2); as pendentes ficam (D1). */
export function historicoSemConta(): HistoricoEntry[] {
  const marca = lerMarcaConta()
  if (marca) {
    const daConta = new Set(marca.ids)
    substituirHistorico(listarHistorico().filter((e) => !daConta.has(e.id)))
    removerMarcaConta()
  }
  return listarHistorico()
}

/** "Sair" e "Excluir conta": nada do histórico fica neste navegador (D2). */
export function apagarHistoricoDoNavegador(): void {
  limparHistorico()
  removerMarcaConta()
}
