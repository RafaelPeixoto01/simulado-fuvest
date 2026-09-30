import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { ConfigurarPersonalizadoPage } from './pages/ConfigurarPersonalizadoPage'
import { EscolherAnoPage } from './pages/EscolherAnoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { HomePage } from './pages/HomePage'
import { NaoEncontradaPage } from './pages/NaoEncontradaPage'
import { ResolucaoPage } from './pages/ResolucaoPage'
import { ResultadoPage } from './pages/ResultadoPage'
import { TreinoPage } from './pages/TreinoPage'

export default function App() {
  return (
    <Routes>
      {/* Modo foco (CR-001, D5): a resolução não tem o cabeçalho nem o rodapé do site */}
      <Route path="simulado" element={<ResolucaoPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="novo/personalizado" element={<ConfigurarPersonalizadoPage />} />
        <Route path="novo/ano" element={<EscolherAnoPage />} />
        <Route path="treino" element={<TreinoPage />} />
        <Route path="resultado/:id" element={<ResultadoPage />} />
        <Route path="historico" element={<HistoricoPage />} />
        <Route path="*" element={<NaoEncontradaPage />} />
      </Route>
    </Routes>
  )
}
