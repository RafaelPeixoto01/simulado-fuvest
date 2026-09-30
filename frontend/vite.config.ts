import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Em dev, o backend FastAPI roda na porta 8000 (CLAUDE.md, Comandos Essenciais)
const BACKEND = 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/figuras': BACKEND,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Só o index.css é processado: o teste de contraste lê os tokens dele (CR-002)
    css: { include: [/src[\\/]index\.css/] },
  },
})
