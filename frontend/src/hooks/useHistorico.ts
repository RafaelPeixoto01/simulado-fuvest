import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError, api } from '../services/api'
import type { HistoricoEntry } from '../simulado/tipos'
import { gravarMarcaConta, limparHistorico, listarHistorico, substituirHistorico } from '../storage/historicoStorage'
import { exclusivo, historicoSemConta, sincronizarHistorico } from '../storage/sincronizacao'
import { useSessao } from './useSessao'

export const CHAVE_HISTORICO_QUERY = ['historico']

function chave(usuarioId: number | undefined) {
  return [...CHAVE_HISTORICO_QUERY, usuarioId ?? 'sem-conta']
}

/** A lista que Histórico, Resultado e painel mostram (CR-005, ADR-011): sem conta, a do
 *  navegador; com conta, a da conta (sincronizada). Enquanto a sessão carrega, se ela
 *  falhar ou durante a sincronização, vale o que está no navegador: nunca fica vazia à toa. */
export function useHistorico() {
  const sessao = useSessao()
  const usuario = sessao.data?.usuario ?? null
  // O que havia no navegador ao montar: lido uma vez (identidade estável entre renders)
  const [doNavegador] = useState(listarHistorico)

  const consulta = useQuery<HistoricoEntry[], Error>({
    queryKey: chave(usuario?.id),
    queryFn: async () => {
      // Um 401 (sessão vencida) recarrega a sessão pelo QueryCache (criarQueryClient, CR-006)
      return usuario ? sincronizarHistorico(usuario.id) : historicoSemConta()
    },
    // Só depois de saber quem está conectado: "sem conta" apaga o espelho de uma conta
    enabled: sessao.isSuccess,
    placeholderData: doNavegador,
    staleTime: usuario ? 60_000 : 0,
    refetchOnWindowFocus: !!usuario, // traz o que mudou em outro dispositivo
  })

  return {
    entradas: consulta.data ?? doNavegador,
    usuario,
    sincronizando: sessao.isPending || consulta.isFetching,
    erroSincronizacao: consulta.isError,
  }
}

/** "Limpar histórico": com conta, apaga na conta (todos os dispositivos — RN-016). */
export function useLimparHistorico() {
  const queryClient = useQueryClient()
  const usuario = useSessao().data?.usuario ?? null

  return useMutation<void, ApiError>({
    // Na fila: uma sincronização em andamento termina antes (ou reenviaria o que foi limpo)
    mutationFn: () =>
      exclusivo(async () => {
        if (usuario) {
          await api.limparHistoricoDaConta()
          substituirHistorico([])
          gravarMarcaConta({ conta: usuario.id, ids: [] })
        } else {
          limparHistorico()
        }
      }),
    onSuccess: () => queryClient.setQueryData(chave(usuario?.id), []),
  })
}
