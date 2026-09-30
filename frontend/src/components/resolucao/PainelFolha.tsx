import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'

import { Icone } from '../Icone'

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Tab e Shift+Tab circulam dentro do painel enquanto ele está aberto. */
function prenderTab(e: KeyboardEvent, raiz: HTMLElement) {
  const itens = Array.from(raiz.querySelectorAll<HTMLElement>(FOCAVEIS))
  if (itens.length === 0) return
  const primeiro = itens[0]
  const ultimo = itens[itens.length - 1]
  const ativo = document.activeElement
  if (e.shiftKey && (ativo === primeiro || !raiz.contains(ativo))) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && (ativo === ultimo || !raiz.contains(ativo))) {
    e.preventDefault()
    primeiro.focus()
  }
}

interface Props {
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}

/** Folha de respostas do celular como painel inferior (P1.5, CR-001): diálogo modal com foco
 *  no botão Fechar, Tab preso, Esc e clique fora fecham, e a página de trás não rola. */
export function PainelFolha({ onFechar, children, rodape }: Props) {
  const idTitulo = useId()
  const painel = useRef<HTMLDivElement>(null)
  const botaoFechar = useRef<HTMLButtonElement>(null)
  // O relógio re-renderiza a página a cada segundo: o efeito não pode depender do callback
  const fechar = useRef(onFechar)
  useEffect(() => {
    fechar.current = onFechar
  })

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    botaoFechar.current?.focus()
    const html = document.documentElement
    const overflowAntes = html.style.overflow
    html.style.overflow = 'hidden'
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current()
      else if (e.key === 'Tab' && painel.current) prenderTab(e, painel.current)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      html.style.overflow = overflowAntes
      anterior?.focus({ preventScroll: true })
    }
  }, [])

  // Só fecha o clique que começa e termina no fundo: arrastar da grade até o fundo não fecha
  const apertouNoFundo = useRef(false)
  const noFundo = (e: MouseEvent) => e.target === e.currentTarget

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-end bg-tinta/45"
      onMouseDown={(e) => {
        apertouNoFundo.current = noFundo(e)
      }}
      onClick={(e) => {
        if (apertouNoFundo.current && noFundo(e)) fechar.current()
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="flex max-h-[88dvh] flex-col rounded-t-2xl bg-papel shadow-[0_-8px_24px_rgb(29_36_48/0.18)]"
      >
        <div className="flex items-center justify-between pt-2 pr-2 pl-4">
          <h2 id={idTitulo} className="text-lg font-bold">
            Folha de respostas
          </h2>
          <button
            ref={botaoFechar}
            type="button"
            aria-label="Fechar folha"
            onClick={() => fechar.current()}
            className="inline-flex size-11 items-center justify-center rounded-lg text-tinta hover:bg-fundo"
          >
            <Icone className="size-[22px]">
              <path d="M6 6l12 12M18 6L6 18" />
            </Icone>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{children}</div>
        {rodape && <div className="border-t border-linha px-4 pt-3 pb-4">{rodape}</div>}
      </div>
    </div>
  )
}
