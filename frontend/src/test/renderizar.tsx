import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { SimuladoProvider } from '../simulado/SimuladoContext'

export function renderizar(
  ui: ReactElement,
  { rota = '/', estado }: { rota?: string; estado?: unknown } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SimuladoProvider>
        <MemoryRouter initialEntries={[{ pathname: rota, state: estado }]}>{ui}</MemoryRouter>
      </SimuladoProvider>
    </QueryClientProvider>,
  )
}
