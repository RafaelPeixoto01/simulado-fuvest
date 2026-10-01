import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'

/** Totais da base para a apresentação, sem login (CR-007). */
export function useVitrine() {
  // Os totais só mudam com um deploy: sem novas buscas ao voltar para a aba
  return useQuery({ queryKey: ['vitrine'], queryFn: api.vitrine, staleTime: Infinity })
}
