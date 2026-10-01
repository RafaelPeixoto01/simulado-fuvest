import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSessao } from '../hooks/useSessao'
import { Carregando, SiteIndisponivel } from './Estados'

/** Porteiro das rotas (CR-006, RN-017, ADR-012). Sem login, mostra `semConta` (o início passa a
 *  apresentação) ou leva à apresentação com `?voltar=<rota>`. Com o site indisponível, avisa. */
export function RequerConta({ children, semConta }: { children?: ReactNode; semConta?: ReactNode }) {
  const sessao = useSessao()
  const { pathname } = useLocation()

  if (sessao.isPending) return <Carregando />
  if (sessao.isSuccess) {
    const { acesso, usuario } = sessao.data
    if (acesso === 'indisponivel') return <SiteIndisponivel />
    if (acesso === 'conta' && !usuario) {
      return semConta ?? <Navigate replace to={`/?${new URLSearchParams({ voltar: pathname })}`} />
    }
  }
  // Erro de rede ao verificar a sessão: a página abre. A API continua protegida, e um estudante
  // no meio de uma prova de 5 h não pode ser barrado por uma falha momentânea
  return children ?? <Outlet />
}
