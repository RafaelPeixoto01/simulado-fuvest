import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { criarQueryClient } from '../queryClient'
import { SimuladoProvider } from '../simulado/SimuladoContext'

export function renderizar(
  ui: ReactElement,
  { rota = '/', estado }: { rota?: string; estado?: unknown } = {},
) {
  // O mesmo cliente do site (401 recarrega a sessão — CR-006), sem novas tentativas
  const queryClient = criarQueryClient({ queries: { retry: false }, mutations: { retry: false } })
  const [pathname, busca] = rota.split('?')
  return render(
    <QueryClientProvider client={queryClient}>
      <SimuladoProvider>
        <MemoryRouter initialEntries={[{ pathname, search: busca ? `?${busca}` : '', state: estado }]}>{ui}</MemoryRouter>
      </SimuladoProvider>
    </QueryClientProvider>,
  )
}
