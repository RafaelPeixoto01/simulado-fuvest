import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { Icone } from '../Icone'

/** Figura ampliada (P1.6, D7, CR-003): abre ajustada à tela e centralizada; "Tamanho real" mostra a
 *  imagem no tamanho natural, com rolagem. Esc, "Fechar" e o clique no fundo escuro fecham. */
export function ModalFigura({ src, alt, onFechar }: { src: string; alt: string; onFechar: () => void }) {
  const fechar = useRef<HTMLButtonElement>(null)
  const [real, setReal] = useState(false)
  // O efeito roda só ao abrir: um onFechar novo a cada render não pode refazer o foco
  const ultimoFechar = useRef(onFechar)
  useEffect(() => {
    ultimoFechar.current = onFechar
  })

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    fechar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ultimoFechar.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [])

  const fecharNoFundo = (e: MouseEvent) => {
    if (e.target === e.currentTarget) ultimoFechar.current()
  }
  const opcao = (ativa: boolean) => `h-10 px-3 text-sm font-semibold ${ativa ? 'bg-papel text-tinta' : 'text-papel'}`

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex flex-col bg-[rgb(20_25_34/0.96)]" onClick={fecharNoFundo}>
      <div className="flex items-center gap-4 px-3 py-2 sm:px-6 sm:py-3">
        <p className="hidden min-w-0 flex-1 truncate text-[15px] font-semibold text-papel sm:block">{alt}</p>
        <div className="flex flex-1 items-center justify-between gap-3 sm:flex-none">
          <div role="group" aria-label="Tamanho da figura" className="flex overflow-hidden rounded-lg border border-papel/40">
            <button type="button" aria-pressed={!real} onClick={() => setReal(false)} className={opcao(!real)}>
              Ajustar à tela
            </button>
            <button type="button" aria-pressed={real} onClick={() => setReal(true)} className={opcao(real)}>
              Tamanho real
            </button>
          </div>
          <button
            ref={fechar}
            type="button"
            aria-label="Fechar figura"
            onClick={() => ultimoFechar.current()}
            className="inline-flex size-11 items-center justify-center gap-1.5 rounded-lg bg-papel text-tinta sm:h-10 sm:w-auto sm:px-3.5 sm:text-sm sm:font-bold"
          >
            <Icone className="size-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </Icone>
            <span className="hidden sm:inline">Fechar</span>
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-auto p-3 sm:px-6 sm:pb-4" onClick={fecharNoFundo}>
        <img
          src={src}
          alt={alt}
          className={real ? 'm-auto max-w-none bg-papel' : 'm-auto size-full object-contain'}
        />
      </div>
      <p className="px-4 pb-4 text-[13px] text-papel/80">
        <span className="sm:hidden">Use dois dedos para aproximar ainda mais.</span>
        <span className="hidden sm:inline">Esc fecha · a figura cresce até ocupar a tela</span>
      </p>
    </div>
  )
}
