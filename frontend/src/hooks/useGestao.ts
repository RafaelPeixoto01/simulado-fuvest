import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type ApiError, api } from '../services/api'
import type { OrdemEstudantes, PeriodoGestao, ResolucaoReportes, StatusReporte } from '../types'

/** Área de gestão (CR-013, specs/09). Ao trocar o período, a busca ou a página, os números
 *  anteriores ficam na tela (esmaecidos) até os novos chegarem. */
const CHAVE = 'gestao'

export function useGestaoUso(periodo: PeriodoGestao) {
  return useQuery({
    queryKey: [CHAVE, 'uso', periodo],
    queryFn: () => api.gestaoUso(periodo),
    placeholderData: keepPreviousData,
  })
}

export function useGestaoAprendizado(periodo: PeriodoGestao) {
  return useQuery({
    queryKey: [CHAVE, 'aprendizado', periodo],
    queryFn: () => api.gestaoAprendizado(periodo),
    placeholderData: keepPreviousData,
  })
}

export function useGestaoQualidade() {
  return useQuery({ queryKey: [CHAVE, 'qualidade'], queryFn: api.gestaoQualidade })
}

export function useGestaoReportes(status: StatusReporte) {
  return useQuery({
    queryKey: [CHAVE, 'reportes', status],
    queryFn: () => api.gestaoReportes(status),
    placeholderData: keepPreviousData,
  })
}

/** Marcar reportes como resolvidos: as listas e o resumo da Qualidade são buscados de novo. */
export function useResolverReportes() {
  const queryClient = useQueryClient()
  return useMutation<ResolucaoReportes, ApiError, number[]>({
    mutationFn: api.resolverReportes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useGestaoEstudantes(filtro: { busca: string; ordem: OrdemEstudantes; pagina: number }) {
  return useQuery({
    queryKey: [CHAVE, 'estudantes', filtro],
    queryFn: () => api.gestaoEstudantes(filtro),
    placeholderData: keepPreviousData,
  })
}
