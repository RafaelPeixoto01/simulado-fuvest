import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

import { useSessao } from '../hooks/useSessao'
import { NaoEncontradaPage } from '../pages/NaoEncontradaPage'
import { Carregando } from './Estados'

/** Porteiro da área de gestão (CR-013, RN-020), dentro do RequerConta. Sem `usuario.admin`
 *  (inclusive no modo livre e com erro ao ler a sessão), a área não existe. Só esconde: quem
 *  protege os dados é o servidor (404 em /api/gestao para quem não é admin). */
export function RequerAdmin({ children }: { children?: ReactNode }) {
  const sessao = useSessao()
  if (sessao.isPending) return <Carregando />
  if (!sessao.data?.usuario?.admin) return <NaoEncontradaPage />
  return children ?? <Outlet />
}
