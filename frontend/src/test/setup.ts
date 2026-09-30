import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// O jsdom não implementa a rolagem da janela; a resolução rola ao topo ao trocar de questão (CR-001)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// Sem `globals: true` no Vitest, o Testing Library nao limpa o DOM sozinho
afterEach(() => {
  cleanup()
})
