import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, api } from '../services/api'
import type { HistoricoEntry } from '../simulado/tipos'
import { gravarMarcaConta, limparHistorico, listarHistorico, substituirHistorico } from '../storage/historicoStorage'
import { historicoSemConta, sincronizarHistorico } from '../storage/sincronizacao'
import { CHAVE_SESSAO, useSessao } from './useSessao'

export const CHAVE_HISTORICO_QUERY = ['historico']

function chave(usuarioId: number | undefined) {
  return [...CHAVE_HISTORICO_QUERY, usuarioId ?? 'sem-conta']
}

/** A lista que Histórico, Resultado e painel mostram (CR-005, ADR-011): sem conta, a do
 *  navegador; com conta, a da conta (sincronizada). Enquanto a sessão carrega, se ela
 *  falhar ou durante a sincronização, vale o que está no navegador: nunca fica vazia à toa. */
export function useHistorico() {
  const queryClient = useQueryClient()
  const sessao = useSessao()
  const usuario = sessao.data?.usuario ?? null

  const consulta = useQuery<HistoricoEntry[], Error>({
    queryKey: chave(usuario?.id),
    queryFn: async () => {
      if (!usuario) return historicoSemConta()
      try {
        return await sincronizarHistorico(usuario.id)
      } catch (erro) {
        // Sessão vencida no meio do caminho: recarrega a sessão (vira "sem conta")
        if (erro instanceof ApiError && erro.status === 401) {
          void queryClient.invalidateQueries({ queryKey: CHAVE_SESSAO })
        }
        throw erro
      }
    },
    // Só depois de saber quem está conectado: "sem conta" apaga o espelho de uma conta
    enabled: sessao.isSuccess,
    placeholderData: () => listarHistorico(),
    staleTime: usuario ? 60_000 : 0,
    refetchOnWindowFocus: !!usuario, // traz o que mudou em outro dispositivo
  })

  return {
    entradas: consulta.data ?? listarHistorico(),
    usuario,
    loginDisponivel: sessao.data?.login_disponivel ?? false,
    sincronizando: sessao.isPending || consulta.isFetching,
    erroSincronizacao: consulta.isError,
  }
}

/** "Limpar histórico": com conta, apaga na conta (todos os dispositivos — RN-016). */
export function useLimparHistorico() {
  const queryClient = useQueryClient()
  const usuario = useSessao().data?.usuario ?? null

  return useMutation<void, ApiError>({
    mutationFn: async () => {
      await queryClient.cancelQueries({ queryKey: CHAVE_HISTORICO_QUERY })
      if (usuario) {
        await api.limparHistoricoDaConta()
        substituirHistorico([])
        gravarMarcaConta({ conta: usuario.id, ids: [] })
      } else {
        limparHistorico()
      }
    },
    onSuccess: () => queryClient.setQueryData(chave(usuario?.id), []),
  })
}
