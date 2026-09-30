import type { ReactNode } from 'react'

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
