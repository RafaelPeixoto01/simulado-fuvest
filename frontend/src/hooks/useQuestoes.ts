import { useQuery } from '@tanstack/react-query'

import { api } from '../services/api'
import { chaveQuestoes } from '../simulado/novoSimulado'

/** Conteúdo das questões por id: vem do cache semeado na geração ou da API ao retomar. */
export function useQuestoes(ids: string[]) {
  return useQuery({
    queryKey: chaveQuestoes(ids),
    queryFn: () => api.questoes(ids),
    enabled: ids.length > 0,
    staleTime: Infinity,
  })
}
