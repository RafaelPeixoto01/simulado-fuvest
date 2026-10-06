import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import type { Usuario } from '../types'
import { primeiroNome } from '../utils/format'
import { Icone } from './Icone'

const ITEM = 'flex items-center rounded-[10px] px-3'
const itemMenu = ({ isActive }: { isActive: boolean }) =>
  `${ITEM} h-13 gap-3.5 text-[1.0625rem] ${isActive ? 'bg-caneta-clara font-bold text-caneta-escura' : 'font-medium text-tinta hover:bg-fundo'}`

function Item({ para, icone, children, aoEscolher }: { para: string; icone: ReactNode; children: string; aoEscolher: () => void }) {
  return (
    <li>
      <NavLink to={para} end className={itemMenu} onClick={aoEscolher}>
        <Icone className="size-5.5">{icone}</Icone>
        {children}
      </NavLink>
    </li>
  )
}

/** Menu do cabeçalho abaixo de 640 px (CR-007, O2): botão "Menu" e painel logo abaixo do
 *  cabeçalho, sobre o conteúdo escurecido. Fecha com Esc, toque fora, item, troca de rota e
 *  foco fora dele; aberto, trava a rolagem da página. */
export function MenuCelular({
  comConteudo,
  usuario,
  className = '',
}: {
  comConteudo: boolean
  usuario: Usuario | null
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLElement>(null)

  // Qualquer troca de rota fecha, inclusive o voltar do navegador (ajuste de estado no render)
  const { pathname } = useLocation()
  const [rota, setRota] = useState(pathname)
  if (rota !== pathname) {
    setRota(pathname)
    setAberto(false)
  }

  const fecharDevolvendoFoco = useCallback(() => {
    setAberto(false)
    botao.current?.focus()
  }, [])

  useEffect(() => {
    if (!aberto) return
    const fora = (alvo: EventTarget | null) =>
      !painel.current?.contains(alvo as Node) && !botao.current?.contains(alvo as Node)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharDevolvendoFoco()
    }
    // O fundo escuro fica por cima do conteúdo: o toque fecha sem acionar o que está por baixo.
    // No documento, e não só no fundo, para valer também no resto do cabeçalho (marca)
    const clique = (e: MouseEvent) => {
      if (fora(e.target)) setAberto(false)
    }
    // O conteúdo coberto pelo fundo não recebe o foco com o menu aberto: Tab para fora fecha
    const foco = (e: FocusEvent) => {
      if (fora(e.target)) setAberto(false)
    }
    // O cabeçalho não é fixo: rolar a página levaria o painel embora e deixaria só o fundo
    const html = document.documentElement
    const overflowAntes = html.style.overflow
    html.style.overflow = 'hidden'
    document.addEventListener('keydown', tecla)
    document.addEventListener('click', clique)
    document.addEventListener('focusin', foco)
    return () => {
      html.style.overflow = overflowAntes
      document.removeEventListener('keydown', tecla)
      document.removeEventListener('click', clique)
      document.removeEventListener('focusin', foco)
    }
  }, [aberto, fecharDevolvendoFoco])

  const nome = usuario ? primeiroNome(usuario.nome) : null

  return (
    <div className={className}>
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-principal"
        onClick={() => setAberto((a) => !a)}
        className={`flex h-11 items-center gap-1.5 rounded-lg border px-3 text-[0.9375rem] font-semibold ${aberto ? 'border-caneta bg-caneta-clara' : 'border-linha bg-papel'}`}
      >
        <Icone>{aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</Icone>
        Menu
      </button>

      {aberto && (
        <>
          {/* Abaixo do cabeçalho de 56 px, que fica claro */}
          <div data-testid="fundo-menu" aria-hidden="true" className="fixed inset-x-0 top-14 bottom-0 z-10 bg-tinta/35" />
          <nav
            ref={painel}
            id="menu-principal"
            aria-label="Menu"
            className="absolute inset-x-0 top-full z-20 border-b border-linha bg-papel shadow-[0_12px_24px_rgba(29,36,48,0.14)]"
          >
            <ul className="px-2 pt-2 pb-3">
              <Item para="/" aoEscolher={fecharDevolvendoFoco} icone={<path d="M4 11l8-7 8 7M6 10v10h12V10" />}>
                Início
              </Item>
              {comConteudo && (
                <>
                  <Item para="/desempenho" aoEscolher={fecharDevolvendoFoco} icone={<path d="M5 20V11M12 20V5M19 20v-6" />}>
                    Desempenho
                  </Item>
                  <Item
                    para="/historico"
                    aoEscolher={fecharDevolvendoFoco}
                    icone={
                      <>
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M12 7.5V12l3 2" />
                      </>
                    }
                  >
                    Histórico
                  </Item>
                  <Item
                    para="/notas-de-corte"
                    aoEscolher={fecharDevolvendoFoco}
                    icone={
                      <>
                        <circle cx="12" cy="12" r="8.5" />
                        <circle cx="12" cy="12" r="4" />
                      </>
                    }
                  >
                    Notas de corte
                  </Item>
                  {usuario?.admin && (
                    <Item
                      para="/gestao"
                      aoEscolher={fecharDevolvendoFoco}
                      icone={<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />}
                    >
                      Gestão
                    </Item>
                  )}
                </>
              )}
              {nome && (
                <li className="mt-1.5 border-t border-linha pt-1.5">
                  <NavLink
                    to="/conta"
                    onClick={fecharDevolvendoFoco}
                    className={`${ITEM} h-14 gap-3 hover:bg-fundo`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full bg-caneta-clara font-bold text-caneta-escura"
                    >
                      {nome[0].toUpperCase()}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[1.0625rem] font-semibold">{nome}</span>{' '}
                      <span className="text-[0.8125rem] text-tinta-suave">Conta e sair</span>
                    </span>
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  )
}
