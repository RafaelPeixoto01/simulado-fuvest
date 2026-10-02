/** Uma bolinha da folha de respostas marcada a caneta: anel rosa e miolo azul-marinho (CR-008, I3). Decorativo. */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="17" cy="17" r="14" className="fill-none stroke-optico" strokeWidth={2.4} />
      <circle cx="17" cy="17" r="9.5" className="fill-grafite" />
    </svg>
  )
}
