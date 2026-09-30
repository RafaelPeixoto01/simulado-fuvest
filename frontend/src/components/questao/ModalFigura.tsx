import { useEffect, useRef } from 'react'

/** Figura em tamanho natural, com rolagem (zoom nativo do navegador no celular). */
export function ModalFigura({ src, alt, onFechar }: { src: string; alt: string; onFechar: () => void }) {
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    fechar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [onFechar])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex flex-col bg-tinta/85"
      onClick={onFechar}
    >
      <div className="flex justify-end p-3">
        <button
          ref={fechar}
          type="button"
          onClick={onFechar}
          className="rounded-md bg-papel px-3 py-1.5 text-sm font-semibold text-tinta"
        >
          Fechar
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <img
          src={src}
          alt={alt}
          className="mx-auto max-w-none bg-papel"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
