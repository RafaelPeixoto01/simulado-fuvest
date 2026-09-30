import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api, type ApiError } from '../services/api'
import type { HistoricoEntry, SimuladoEmAndamento } from '../simulado/tipos'
import { useSimulado } from '../simulado/useSimulado'
import { adicionarAoHistorico } from '../storage/historicoStorage'
import { decorridoMs } from '../utils/tempo'

export interface EstadoResultado {
  entrada: HistoricoEntry
  naoSalvo: boolean
  expirouFora: boolean
}

interface Opcoes {
  porTempo: boolean
  expirouFora: boolean
}

/** Corrige, grava no histórico, descarta o simulado e abre o resultado (specs/04 §2.3).
 *  Se a correção falhar, nada é descartado: as respostas continuam salvas. */
export function useFinalizarSimulado(simulado: SimuladoEmAndamento | null) {
  const { despachar } = useSimulado()
  const navegar = useNavigate()

  const mutacao = useMutation<HistoricoEntry, ApiError, Opcoes>({
    mutationFn: async ({ porTempo }) => {
      if (!simulado) throw new Error('Nenhum simulado em andamento')
      const agora = Date.now()
      const resultado = await api.corrigir(
        simulado.questaoIds.map((id) => ({ questao_id: id, resposta: simulado.respostas[id] ?? null })),
      )
      const decorrido = decorridoMs(simulado, agora)
      return {
        versao: 1,
        id: simulado.id,
        modo: simulado.modo,
        descricao: simulado.descricao,
        iniciadoEm: simulado.iniciadoEm,
        finalizadoEm: agora,
        tempoGastoMs: simulado.tempoLimiteS ? Math.min(decorrido, simulado.tempoLimiteS * 1000) : decorrido,
        tempoLimiteS: simulado.tempoLimiteS,
        finalizadoPorTempo: porTempo,
        questaoIds: simulado.questaoIds,
        resultado,
      }
    },
    onSuccess: (entrada, { expirouFora }) => {
      const salvo = adicionarAoHistorico(entrada)
      const estado: EstadoResultado = { entrada, naoSalvo: !salvo, expirouFora }
      navegar(`/resultado/${entrada.id}`, { state: estado })
      despachar({ tipo: 'DESCARTAR' })
    },
  })

  return {
    finalizar: (opcoes: Opcoes) => mutacao.mutate(opcoes),
    finalizando: mutacao.isPending,
    erro: mutacao.error,
  }
}
