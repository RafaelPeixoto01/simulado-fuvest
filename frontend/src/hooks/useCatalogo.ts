import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'

export function useCatalogo() {
  return useQuery({ queryKey: ['catalogo'], queryFn: api.catalogo })
}
