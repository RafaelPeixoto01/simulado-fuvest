import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api, type ApiError } from '../services/api'
import { chaveQuestoes, montarSimuladoEmAndamento, questoesVistas } from '../simulado/novoSimulado'
import { useSimulado } from '../simulado/useSimulado'
import { listarHistorico } from '../storage/historicoStorage'
import type { PedidoSimulado, QuestoesPorId } from '../types'

/** Gera o simulado, semeia o cache das questões, grava no navegador e abre a resolução. Fora da
 *  Prova de um ano, o pedido leva as questões do histórico: as inéditas vêm primeiro (CR-015). */
export function useIniciarSimulado() {
  const { despachar } = useSimulado()
  const queryClient = useQueryClient()
  const navegar = useNavigate()

  const mutacao = useMutation<void, ApiError, { pedido: PedidoSimulado; descricao: string }>({
    mutationFn: async ({ pedido, descricao }) => {
      const simulado = await api.gerarSimulado(
        pedido.modo === 'ano' ? pedido : { ...pedido, vistas: questoesVistas(listarHistorico()) },
      )
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
