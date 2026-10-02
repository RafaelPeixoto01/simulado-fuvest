import { useId } from 'react'

import { IconePausa } from '../Icone'

/** Pausar esconde a questão até retomar (P1.8, D3, CR-001): o relógio parado não pode virar tempo extra de leitura. */
export function TelaPausa({ onRetomar }: { onRetomar: () => void }) {
  const idTitulo = useId()
  return (
    <section
      aria-labelledby={idTitulo}
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center"
    >
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-caneta-clara text-caneta">
        <IconePausa className="size-7" />
      </span>
      <h2 id={idTitulo} className="text-2xl">
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
