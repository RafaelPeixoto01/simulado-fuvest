import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { ApiError, api } from '../services/api'
import { listarHistorico } from '../storage/historicoStorage'
import { apagarHistoricoDoNavegador, exclusivo, historicoSemConta, sincronizarAgora } from '../storage/sincronizacao'
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

/** Sair (RN-016, D2): envia as pendentes, encerra a sessão e tira do navegador o histórico
 *  da conta, que continua lá. Se o envio falhar, nada é apagado. As recusadas pelo
 *  servidor, que só existem aqui, ficam. */
export function useSair() {
  const queryClient = useQueryClient()
  const usuario = useSessao().data?.usuario ?? null

  return useMutation<void, Error>({
    mutationFn: () =>
      exclusivo(async () => {
        if (usuario) {
          try {
            await sincronizarAgora(usuario.id)
          } catch (erro) {
            // Sessão que já tinha acabado (401) segue: as pendentes não iriam mesmo
            if (!(erro instanceof ApiError && erro.status === 401)) throw erro
          }
        }
        await api.sair()
        historicoSemConta()
      }),
    onSuccess: () => semConta(queryClient),
  })
}

/** Excluir conta (RF-026): apaga tudo no servidor e o histórico deste navegador. */
export function useExcluirConta() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError>({
    mutationFn: () =>
      exclusivo(async () => {
        await api.excluirConta()
        apagarHistoricoDoNavegador()
      }),
    onSuccess: () => semConta(queryClient),
  })
}
