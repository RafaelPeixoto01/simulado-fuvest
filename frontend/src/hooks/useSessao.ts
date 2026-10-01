import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'

export const CHAVE_SESSAO = ['sessao']

/** Quem está conectado (CR-005). Muda só por login (página recarrega), sair ou excluir. */
export function useSessao() {
  return useQuery({ queryKey: CHAVE_SESSAO, queryFn: api.sessao })
}
