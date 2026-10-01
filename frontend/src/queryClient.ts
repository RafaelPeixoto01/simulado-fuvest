import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

import { CHAVE_SESSAO } from './hooks/useSessao'
import { definirAoErroDeAcesso } from './services/api'

/** Login obrigatório (CR-006): um 401 `nao_autenticado` ou um 503 `site_indisponivel` em
 *  qualquer chamada recarrega a sessão; o RequerConta leva então à apresentação (e o login volta
 *  para a página) ou mostra "temporariamente indisponível". */
export function criarQueryClient(padroes: DefaultOptions) {
  const cliente = new QueryClient({ defaultOptions: padroes })
  definirAoErroDeAcesso(() => void cliente.invalidateQueries({ queryKey: CHAVE_SESSAO }))
  return cliente
}

export const queryClient = criarQueryClient({
  queries: {
    staleTime: 5 * 60 * 1000, // questões e catálogo só mudam a cada deploy
    refetchOnWindowFocus: false,
    retry: 1,
  },
})
