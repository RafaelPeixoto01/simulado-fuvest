import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api, type ApiError } from '../services/api'
import { chaveQuestoes, montarSimuladoEmAndamento } from '../simulado/novoSimulado'
import { useSimulado } from '../simulado/useSimulado'
import type { PedidoSimulado, QuestoesPorId } from '../types'

/** Gera o simulado, semeia o cache das questões, grava no navegador e abre a resolução. */
export function useIniciarSimulado() {
  const { despachar } = useSimulado()
  const queryClient = useQueryClient()
  const navegar = useNavigate()

  const mutacao = useMutation<void, ApiError, { pedido: PedidoSimulado; descricao: string }>({
    mutationFn: async ({ pedido, descricao }) => {
      const simulado = await api.gerarSimulado(pedido)
      const ids = simulado.questoes.map((q) => q.id)
      queryClient.setQueryData<QuestoesPorId>(chaveQuestoes(ids), {
        questoes: simulado.questoes,
        textos_base: simulado.textos_base,
        nao_encontradas: [],
      })
      despachar({
        tipo: 'INICIAR',
        simulado: montarSimuladoEmAndamento(simulado, descricao, Date.now(), crypto.randomUUID()),
      })
      navegar('/simulado')
    },
  })

  return {
    iniciar: (pedido: PedidoSimulado, descricao: string) => mutacao.mutate({ pedido, descricao }),
    iniciando: mutacao.isPending,
    erro: mutacao.error,
    limparErro: mutacao.reset,
  }
}
