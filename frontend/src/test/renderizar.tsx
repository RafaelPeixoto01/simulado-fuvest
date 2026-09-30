import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { SimuladoProvider } from '../simulado/SimuladoContext'

export function renderizar(ui: ReactElement, { rota = '/' }: { rota?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SimuladoProvider>
        <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
      </SimuladoProvider>
    </QueryClientProvider>,
  )
}
