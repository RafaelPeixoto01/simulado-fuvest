import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { ApiError, api } from '../services/api'
import { listarHistorico } from '../storage/historicoStorage'
import { apagarHistoricoDoNavegador, historicoSemConta, sincronizarHistorico } from '../storage/sincronizacao'
import type { Sessao } from '../types'
import { CHAVE_HISTORICO_QUERY } from './useHistorico'
import { CHAVE_SESSAO, useSessao } from './useSessao'

function semConta(queryClient: QueryClient) {
  queryClient.setQueryData<Sessao>(CHAVE_SESSAO, (antes) => ({
    login_disponivel: antes?.login_disponivel ?? true,
    usuario: null,
  }))
  // Evita mostrar, por um instante, a lista anônima de antes do login
  queryClient.setQueryData([...CHAVE_HISTORICO_QUERY, 'sem-conta'], listarHistorico())
}

/** Sair (RN-016, D2): envia as pendentes, encerra a sessão e apaga o histórico deste
 *  navegador, que continua na conta. Se o envio falhar, nada é apagado. */
export function useSair() {
  const queryClient = useQueryClient()
  const usuario = useSessao().data?.usuario ?? null

  return useMutation<void, Error>({
    mutationFn: async () => {
      await queryClient.cancelQueries({ queryKey: CHAVE_HISTORICO_QUERY })
      if (usuario) {
        try {
          await sincronizarHistorico(usuario.id)
        } catch (erro) {
          if (!(erro instanceof ApiError && erro.status === 401)) throw erro
          // A sessão já tinha acabado: sai do espelho, mas as pendentes ficam (D1)
          await api.sair()
          historicoSemConta()
          return
        }
      }
      await api.sair()
      apagarHistoricoDoNavegador()
    },
    onSuccess: () => semConta(queryClient),
  })
}

/** Excluir conta (RF-026): apaga tudo no servidor e o histórico deste navegador. */
export function useExcluirConta() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError>({
    mutationFn: async () => {
      await queryClient.cancelQueries({ queryKey: CHAVE_HISTORICO_QUERY })
      await api.excluirConta()
      apagarHistoricoDoNavegador()
    },
    onSuccess: () => semConta(queryClient),
  })
}
