import type { ReactNode } from 'react'

import { useTituloPagina } from '../hooks/useTituloPagina'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" className="py-10 text-tinta-suave">
      {texto}
    </div>
  )
}

export function ErroCarregamento({
  mensagem,
  onTentar,
}: {
  mensagem: string
  onTentar?: () => void
}) {
  return (
    <div role="alert" className="rounded-lg border border-erro/30 bg-erro-claro px-4 py-4">
      <p className="text-erro">{mensagem}</p>
      {onTentar && (
        <button
          type="button"
          onClick={onTentar}
          className="mt-3 rounded-md border border-erro/40 bg-papel px-3 py-1.5 text-sm font-semibold text-erro hover:bg-erro-claro"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-linha px-4 py-8 text-tinta-suave">{children}</div>
}

/** Produção sem login configurado (CR-006, D3): o site fecha em vez de abrir sem conta. */
export function SiteIndisponivel() {
  useTituloPagina('Site indisponível')
  return (
    <section className="max-w-prose px-4 py-10 sm:px-0">
      <h1 className="text-2xl font-bold">Site temporariamente indisponível</h1>
      <p className="mt-2 text-tinta-suave">Tente de novo em alguns minutos.</p>
    </section>
  )
}
