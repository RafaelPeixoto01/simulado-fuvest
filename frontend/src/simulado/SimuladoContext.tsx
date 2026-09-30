import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'

import { carregarSimulado, descartarSimulado, salvarSimulado } from '../storage/simuladoStorage'
import { storageDisponivel } from '../storage/storage'
import { ContextoSimulado } from './contexto'
import { reducerSimulado } from './reducer'

export function SimuladoProvider({ children }: { children: ReactNode }) {
  const [storageOk] = useState(storageDisponivel)
  const [simulado, despachar] = useReducer(reducerSimulado, null, carregarSimulado)

  // Persiste a cada acao: recarregar ou fechar a aba nao perde nada (RF-016)
  useEffect(() => {
    if (simulado) salvarSimulado(simulado)
    else descartarSimulado()
  }, [simulado])

  const valor = useMemo(() => ({ simulado, despachar, storageOk }), [simulado, storageOk])
  return <ContextoSimulado.Provider value={valor}>{children}</ContextoSimulado.Provider>
}
