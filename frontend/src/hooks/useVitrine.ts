import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'

/** Totais da base para a apresentação, sem login (CR-007). */
export function useVitrine() {
  return useQuery({ queryKey: ['vitrine'], queryFn: api.vitrine })
}
