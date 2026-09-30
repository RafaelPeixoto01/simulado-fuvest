/** Cinco bolinhas da folha de respostas, uma preenchida a grafite. Decorativo. */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 58 10" className={className} aria-hidden="true" focusable="false">
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={5 + i * 12}
          cy={5}
          r={4}
          className={i === 2 ? 'fill-grafite stroke-grafite' : 'fill-none stroke-optico'}
          strokeWidth={1.4}
        />
      ))}
    </svg>
  )
}
