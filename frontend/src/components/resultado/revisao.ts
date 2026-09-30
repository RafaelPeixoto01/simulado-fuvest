import type { Disciplina, ItemCorrigido } from '../../types'

export type FiltroRevisao = 'todas' | 'erradas' | 'branco'

/** Questão aberta na revisão (posição em `questaoIds`) e os filtros ativos (D6, CR-003). */
export interface EstadoRevisao {
  indice: number
  filtro: FiltroRevisao
  disciplina: Disciplina | ''
}

export type Situacao = 'acerto' | 'erro' | 'branco' | 'anulada' | 'removida'

export const REVISAO_INICIAL: EstadoRevisao = { indice: 0, filtro: 'todas', disciplina: '' }

/** Sem item: a questão saiu da base antes da correção (vai em `ignoradas`). */
export function situacao(item: ItemCorrigido | undefined): Situacao {
  if (!item) return 'removida'
  if (item.anulada) return 'anulada'
  if (item.acertou) return 'acerto'
  return item.resposta === null ? 'branco' : 'erro'
}

/** Posições das questões que passam no filtro e na disciplina, na ordem do simulado. */
export function filtrarRevisao(
  questaoIds: string[],
  porId: Map<string, ItemCorrigido>,
  filtro: FiltroRevisao,
  disciplina: Disciplina | '',
): number[] {
  return questaoIds.flatMap((id, indice) => {
    const item = porId.get(id)
    if (disciplina && item?.disciplina !== disciplina) return []
    const s = situacao(item)
    if (filtro === 'erradas' && s !== 'erro') return []
    if (filtro === 'branco' && s !== 'branco') return []
    return [indice]
  })
}

/** Abrir uma questão pela folha: se ela não passa nos filtros atuais, eles voltam para "Todas". */
export function abrirQuestao(
  estado: EstadoRevisao,
  indice: number,
  questaoIds: string[],
  porId: Map<string, ItemCorrigido>,
): EstadoRevisao {
  const visivel = filtrarRevisao(questaoIds, porId, estado.filtro, estado.disciplina).includes(indice)
  return visivel ? { ...estado, indice } : { indice, filtro: 'todas', disciplina: '' }
}

/** Trocar os filtros mantém a questão aberta se ela continua visível; senão abre a primeira da lista. */
export function trocarFiltros(
  estado: EstadoRevisao,
  filtro: FiltroRevisao,
  disciplina: Disciplina | '',
  questaoIds: string[],
  porId: Map<string, ItemCorrigido>,
): EstadoRevisao {
  const lista = filtrarRevisao(questaoIds, porId, filtro, disciplina)
  const indice = lista.includes(estado.indice) ? estado.indice : (lista[0] ?? estado.indice)
  return { indice, filtro, disciplina }
}
