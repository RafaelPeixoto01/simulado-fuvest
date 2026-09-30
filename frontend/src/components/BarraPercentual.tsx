/** Barra em CSS; quem a usa mostra o valor também em texto (cor não é o único indicador). */
export function BarraPercentual({ percentual, fina = false }: { percentual: number; fina?: boolean }) {
  return (
    <div className={`mt-1 overflow-hidden rounded-full bg-linha ${fina ? 'h-1.5' : 'h-2'}`} aria-hidden="true">
      <div className="h-full rounded-full bg-caneta" style={{ width: `${percentual}%` }} />
    </div>
  )
}
