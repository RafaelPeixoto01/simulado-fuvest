import { useId } from 'react'

/** Pausar esconde a questão até retomar (P1.8, D3, CR-001): o relógio parado não pode virar tempo extra de leitura. */
export function TelaPausa({ onRetomar }: { onRetomar: () => void }) {
  const idTitulo = useId()
  return (
    <section
      aria-labelledby={idTitulo}
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-caneta-clara text-caneta">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </span>
      <h2 id={idTitulo} className="text-2xl font-bold">
        Simulado pausado
      </h2>
      <p className="max-w-sm text-tinta-suave">O cronômetro está parado e a questão fica oculta até você retomar.</p>
      <button
        type="button"
        onClick={onRetomar}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-lg bg-caneta px-8 font-bold text-papel hover:bg-caneta-escura"
      >
        Retomar
      </button>
    </section>
  )
}
