import { createContext, type Dispatch } from 'react'

import type { AcaoSimulado, SimuladoEmAndamento } from './tipos'

export interface ValorSimulado {
  simulado: SimuladoEmAndamento | null
  despachar: Dispatch<AcaoSimulado>
  storageOk: boolean
}

export const ContextoSimulado = createContext<ValorSimulado | null>(null)
