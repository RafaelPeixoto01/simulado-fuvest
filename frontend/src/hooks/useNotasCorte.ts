import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type ApiError, api } from '../services/api'
import type { CarreiraAlvo, Sessao } from '../types'
import { CHAVE_SESSAO } from './useSessao'

/** Notas de corte de um ano (CR-010); null pede o mais recente. Ao trocar de ano, a tabela
 *  anterior fica na tela até a nova chegar. */
export function useNotasCorte(ano: number | null) {
  return useQuery({
    queryKey: ['notas-corte', ano ?? 'recente'],
    queryFn: () => api.notasCorte(ano),
    placeholderData: keepPreviousData,
  })
}

/** Definir e remover a carreira-alvo (CR-010, RN-019). A sessão em cache passa a ter a nova:
 *  o resultado e o início a usam sem buscar de novo. */
export function useCarreiraAlvo() {
  const queryClient = useQueryClient()
  const guardar = (carreira_alvo: CarreiraAlvo | null) =>
    queryClient.setQueryData<Sessao>(CHAVE_SESSAO, (sessao) =>
      sessao?.usuario ? { ...sessao, usuario: { ...sessao.usuario, carreira_alvo } } : sessao,
    )

  const definir = useMutation<CarreiraAlvo, ApiError, { ano: number; codigo: number }>({
    mutationFn: api.definirCarreiraAlvo,
    onSuccess: guardar,
    // Saiu a lista de um ano novo depois que a página abriu (RN-019): busca a lista nova
    onError: (erro) => {
      if (erro.codigo === 'carreira_invalida') void queryClient.invalidateQueries({ queryKey: ['notas-corte'] })
    },
  })
  const remover = useMutation<void, ApiError>({
    mutationFn: api.removerCarreiraAlvo,
    onSuccess: () => guardar(null),
  })
  return { definir, remover }
}
