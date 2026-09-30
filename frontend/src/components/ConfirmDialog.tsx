import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  titulo: string
  children?: ReactNode
  confirmar: string
  cancelar?: string
  perigoso?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function ConfirmDialog({
  titulo,
  children,
  confirmar,
  cancelar = 'Cancelar',
  perigoso = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId()
  const botaoCancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    botaoCancelar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [onCancelar])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="w-full max-w-md rounded-xl border border-linha bg-papel p-5 shadow-lg"
      >
        <h2 id={idTitulo} className="text-lg font-bold">
          {titulo}
        </h2>
        {children && <div className="mt-2 text-tinta-suave">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={botaoCancelar}
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-linha px-4 py-2 font-semibold hover:bg-fundo"
          >
            {cancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`rounded-md px-4 py-2 font-semibold text-papel ${perigoso ? 'bg-erro hover:bg-erro/90' : 'bg-caneta hover:bg-caneta-escura'}`}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
