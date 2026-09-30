import type { ReactNode } from 'react'

/** Ícone de traço (24 × 24), decorativo: o nome acessível fica no botão que o contém. */
export function Icone({ children, className = 'size-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function IconePausa({ className }: { className?: string }) {
  return (
    <Icone className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </Icone>
  )
}
