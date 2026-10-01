import { MutationCache, QueryCache, QueryClient, type DefaultOptions } from '@tanstack/react-query'

import { CHAVE_SESSAO } from './hooks/useSessao'
import { ApiError } from './services/api'

/** Login obrigatório (CR-006): um 401 em qualquer chamada recarrega a sessão. Se ela acabou,
 *  o RequerConta leva à apresentação, e o login volta para a página. */
export function criarQueryClient(padroes: DefaultOptions) {
  const recarregarSessao = (erro: unknown) => {
    if (erro instanceof ApiError && erro.status === 401) {
      void cliente.invalidateQueries({ queryKey: CHAVE_SESSAO })
    }
  }
  const cliente: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: recarregarSessao }),
    mutationCache: new MutationCache({ onError: recarregarSessao }),
    defaultOptions: padroes,
  })
  return cliente
}

export const queryClient = criarQueryClient({
  queries: {
    staleTime: 5 * 60 * 1000, // questões e catálogo só mudam a cada deploy
    refetchOnWindowFocus: false,
    retry: 1,
  },
})
