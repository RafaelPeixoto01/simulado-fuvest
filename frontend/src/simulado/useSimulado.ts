import { useContext } from 'react'

import { ContextoSimulado, type ValorSimulado } from './contexto'

export function useSimulado(): ValorSimulado {
  const valor = useContext(ContextoSimulado)
  if (!valor) throw new Error('useSimulado precisa estar dentro de <SimuladoProvider>')
  return valor
}
