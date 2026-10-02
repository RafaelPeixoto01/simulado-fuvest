import '@fontsource-variable/atkinson-hyperlegible-next'
import '@fontsource-variable/literata'
// Títulos (CR-008); o itálico só é baixado se usado (saudação do início)
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import './index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.tsx'
import { queryClient } from './queryClient'
import { SimuladoProvider } from './simulado/SimuladoContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SimuladoProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SimuladoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
