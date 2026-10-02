import type { ReactNode } from 'react'

/** Círculo feito à mão com caneta rosa em volta de uma palavra de título (CR-008, I5): no máximo
 *  um por tela. Decorativo: o texto do título (e o nome acessível) não muda. */
export function CirculoCaneta({ children, largura = 'w-[136%]' }: { children: ReactNode; largura?: string }) {
  return (
    <span className="relative whitespace-nowrap">
      {children}
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className={`pointer-events-none absolute -top-1 -left-3 h-[120%] ${largura}`}
      >
        <path
          d="M14 46 C 12 12, 186 6, 190 38 C 194 70, 40 80, 12 52"
          className="fill-none stroke-optico"
          strokeWidth={3}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}
