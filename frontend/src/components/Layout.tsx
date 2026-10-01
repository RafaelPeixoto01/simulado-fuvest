import { Link, NavLink, Outlet } from 'react-router-dom'

import { useHistorico } from '../hooks/useHistorico'
import { useSessao } from '../hooks/useSessao'
import { primeiroNome } from '../utils/format'
import { Marca } from './Marca'
import { MenuCelular } from './MenuCelular'

const itemNav = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 text-sm ${isActive ? 'text-caneta underline underline-offset-4' : 'text-tinta-suave hover:text-tinta'}`

export function Layout() {
  const { data: sessao } = useSessao()
  // Com conta, envia as pendentes e traz o histórico da conta em qualquer página (ADR-011)
  useHistorico()
  // Login obrigatório (CR-006): Desempenho e Histórico só aparecem com acesso ao conteúdo
  // (sem conta, levariam à apresentação; com o site indisponível, ao aviso)
  const comConteudo = !sessao || sessao.acesso === 'livre' || (sessao.acesso === 'conta' && !!sessao.usuario)
  // Abaixo de 640 px os links não cabem em linha (CR-004): vão para o menu (CR-007, O2).
  // Sem conta não há menu, só "Entrar" (O2.4)
  const usuario = sessao?.usuario ?? null
  const comMenu = comConteudo || !!usuario

  return (
    <div className="flex min-h-screen flex-col">
      {/* 56 px fixos no celular (O2.3); acima do conteúdo para o painel do menu */}
      <header className="relative z-30 h-14 border-b border-linha bg-papel sm:h-auto">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:py-3">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-tinta">
            <Marca className="h-2.5 w-auto" />
            Simulado Fuvest
          </Link>
          {comMenu && <MenuCelular comConteudo={comConteudo} usuario={usuario} className="sm:hidden" />}
          <nav className={`items-center gap-1 ${comMenu ? 'hidden sm:flex' : 'flex'}`}>
            {comConteudo && (
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
