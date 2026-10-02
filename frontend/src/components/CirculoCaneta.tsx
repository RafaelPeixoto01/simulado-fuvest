import type { ReactNode } from 'react'

// Folga igual dos dois lados da palavra: o círculo fica centrado nela. A margem da palavra (mx-1) afasta
// as vizinhas, para o traço não cortar as letras delas
const FOLGA = {
  normal: '-left-3 w-[calc(100%+1.5rem)]', // palavra ("reais")
  justa: '-left-2 w-[calc(100%+1rem)]', // número curto (acertos): não invade as palavras vizinhas
}

/** Círculo feito à mão com caneta rosa em volta de uma palavra de título (CR-008, I5): no máximo
 *  um por tela. Decorativo: o texto do título (e o nome acessível) não muda. */
export function CirculoCaneta({ children, folga = 'normal' }: { children: ReactNode; folga?: keyof typeof FOLGA }) {
  return (
    <span className="relative mx-1 whitespace-nowrap">
      {children}
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className={`pointer-events-none absolute -top-1 h-[120%] ${FOLGA[folga]}`}
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
