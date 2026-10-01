import { Link, NavLink, Outlet } from 'react-router-dom'

import { useHistorico } from '../hooks/useHistorico'
import { useSessao } from '../hooks/useSessao'
import { primeiroNome } from '../utils/format'
import { Marca } from './Marca'

const itemNav = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 text-sm ${isActive ? 'text-caneta underline underline-offset-4' : 'text-tinta-suave hover:text-tinta'}`

export function Layout() {
  const { data: sessao } = useSessao()
  // Com conta, envia as pendentes e traz o histórico da conta em qualquer página (ADR-011)
  useHistorico()
  // Login obrigatório (CR-006): sem conta, Desempenho e Histórico só levariam à apresentação
  const semAcesso = !!sessao && !sessao.usuario && sessao.acesso !== 'livre'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-tinta">
            <Marca className="h-2.5 w-auto" />
            Simulado Fuvest
          </Link>
          {/* No celular os links ficam empilhados: lado a lado, estouram 320 px (CR-004) */}
          <nav className="flex flex-col items-end sm:flex-row sm:gap-1">
            {!semAcesso && (
              <>
                <NavLink to="/desempenho" className={itemNav}>
                  Desempenho
                </NavLink>
                <NavLink to="/historico" className={itemNav}>
                  Histórico
                </NavLink>
              </>
            )}
            {(sessao?.usuario || sessao?.login_disponivel) && (
              <NavLink to="/conta" className={itemNav}>
                {sessao.usuario ? primeiroNome(sessao.usuario.nome) : 'Entrar'}
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-linha">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-tinta-suave">
          Este site não é afiliado à FUVEST nem à USP. As questões vêm do{' '}
          <a
            className="underline underline-offset-2 hover:text-tinta"
            href="https://www.fuvest.br/acervo/"
            target="_blank"
            rel="noreferrer"
          >
            acervo oficial da FUVEST
          </a>
          .{' '}
          <Link className="underline underline-offset-2 hover:text-tinta" to="/privacidade">
            Privacidade
          </Link>
        </p>
      </footer>
    </div>
  )
}
