import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { RequerConta } from './components/RequerConta'
import { RolarAoTopo } from './components/RolarAoTopo'
import { ApresentacaoPage } from './pages/ApresentacaoPage'
import { ConfigurarPersonalizadoPage } from './pages/ConfigurarPersonalizadoPage'
import { ContaPage } from './pages/ContaPage'
import { DesempenhoPage } from './pages/DesempenhoPage'
import { EscolherAnoPage } from './pages/EscolherAnoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { HomePage } from './pages/HomePage'
import { NaoEncontradaPage } from './pages/NaoEncontradaPage'
import { PrivacidadePage } from './pages/PrivacidadePage'
import { ResolucaoPage } from './pages/ResolucaoPage'
import { ResultadoPage } from './pages/ResultadoPage'
import { TreinoPage } from './pages/TreinoPage'

export default function App() {
  return (
    <>
      {/* Toda página nova começa no topo (CR-009) */}
      <RolarAoTopo />
      <Routes>
        {/* Modo foco (CR-001, D5): a resolução não tem o cabeçalho nem o rodapé do site */}
        <Route
          path="simulado"
          element={
            <RequerConta>
              <ResolucaoPage />
            </RequerConta>
          }
        />
        <Route element={<Layout />}>
          {/* Login obrigatório (CR-006): sem conta, abrem só a apresentação, a Conta e a Privacidade */}
          <Route
            index
            element={
              <RequerConta semConta={<ApresentacaoPage />}>
                <HomePage />
              </RequerConta>
            }
          />
          <Route path="conta" element={<ContaPage />} />
          <Route path="privacidade" element={<PrivacidadePage />} />
          <Route element={<RequerConta />}>
            <Route path="novo/personalizado" element={<ConfigurarPersonalizadoPage />} />
            <Route path="novo/ano" element={<EscolherAnoPage />} />
            <Route path="treino" element={<TreinoPage />} />
            <Route path="resultado/:id" element={<ResultadoPage />} />
            <Route path="historico" element={<HistoricoPage />} />
            <Route path="desempenho" element={<DesempenhoPage />} />
          </Route>
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Routes>
    </>
  )
}
