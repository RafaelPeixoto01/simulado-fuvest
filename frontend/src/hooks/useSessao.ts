import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'

export const CHAVE_SESSAO = ['sessao']

/** Quem está conectado (CR-005). Muda só por login (página recarrega), sair ou excluir. */
export function useSessao() {
  return useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: api.sessao,
    // Com erro de rede e sem dados, refazer a busca a cada componente que monta volta a sessão
    // para "pending": o RequerConta desmontaria a página e a remontaria sem fim (CR-006).
    // Ela volta sozinha quando a conexão retorna (refetchOnReconnect), num 401 ou ao recarregar
    retryOnMount: false,
  })
}
