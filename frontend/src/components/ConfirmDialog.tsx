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
  // O efeito roda só ao abrir: um onCancelar novo a cada render (o relógio da resolução
  // re-renderiza a cada segundo) não pode devolver o foco para "Cancelar" (CR-001)
  const ultimoCancelar = useRef(onCancelar)
  useEffect(() => {
    ultimoCancelar.current = onCancelar
  })

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    botaoCancelar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ultimoCancelar.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="w-full max-w-md rounded-2xl border border-linha bg-papel p-5"
      >
        <h2 id={idTitulo} className="text-lg">
          {titulo}
        </h2>
        {children && <div className="mt-2 text-tinta-suave">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={botaoCancelar}
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-borda-campo bg-papel px-4 py-2 font-semibold hover:border-caneta"
          >
            {cancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`rounded-md px-4 py-2 font-semibold text-fundo ${perigoso ? 'bg-erro hover:bg-erro/90' : 'bg-caneta hover:bg-caneta-escura'}`}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
