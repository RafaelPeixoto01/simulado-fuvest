import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api, type ApiError } from '../services/api'
import type { HistoricoEntry, SimuladoEmAndamento } from '../simulado/tipos'
import { adicionarAoHistorico } from '../storage/historicoStorage'
import { decorridoMs } from '../utils/tempo'
import { CHAVE_HISTORICO_QUERY } from './useHistorico'

export interface EstadoResultado {
  entrada: HistoricoEntry
  naoSalvo: boolean
  expirouFora: boolean
}

interface Opcoes {
  porTempo: boolean
  expirouFora: boolean
}

/** Corrige, grava no histórico e abre o resultado, que descarta o simulado (specs/04 §2.3).
 *  Se a correção falhar, nada é descartado: as respostas continuam salvas. */
export function useFinalizarSimulado(simulado: SimuladoEmAndamento | null) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()

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
      // Com conta, a entrada nova (pendente) vai para o servidor na próxima sincronização,
      // que a tela de resultado dispara ao montar o Layout (CR-005)
      void queryClient.invalidateQueries({ queryKey: CHAVE_HISTORICO_QUERY })
      const estado: EstadoResultado = { entrada, naoSalvo: !salvo, expirouFora }
      // O descarte fica com a tela de resultado (ao montar): descartar aqui faria a
      // resolução, ainda montada, redirecionar para o início antes da navegação
      // (o navigate do React Router roda como transição, com prioridade menor)
      navegar(`/resultado/${entrada.id}`, { state: estado })
    },
  })

  return {
    finalizar: (opcoes: Opcoes) => mutacao.mutate(opcoes),
    finalizando: mutacao.isPending,
    erro: mutacao.error,
  }
}
