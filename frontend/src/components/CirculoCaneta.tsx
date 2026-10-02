// Folga igual dos dois lados da palavra: o círculo fica centrado nela. A margem da palavra afasta as
// vizinhas, para o traço não cortar as letras delas: folga maior pede margem maior
const PALAVRA = { circulo: '-left-3 w-[calc(100%+1.5rem)]', margem: 'mx-1' } // "reais"
const NUMERO = { circulo: '-left-2 w-[calc(100%+1rem)]', margem: 'mx-1' } // dois algarismos (acertos)
// Um algarismo (CR-009, A1): com 8 px, o círculo ficava estreito e quase encostava no número
const ALGARISMO = { circulo: '-left-4 w-[calc(100%+2rem)]', margem: 'mx-3' }

/** Círculo feito à mão com caneta rosa em volta de uma palavra ou número de título (CR-008, I5): no
 *  máximo um por tela. Decorativo: o texto do título (e o nome acessível) não muda. A folga sai do
 *  conteúdo: palavra, número de um algarismo ou de dois. */
export function CirculoCaneta({ children }: { children: string | number }) {
  const folga = typeof children === 'string' ? PALAVRA : String(children).length === 1 ? ALGARISMO : NUMERO
  return (
    <span className={`relative whitespace-nowrap ${folga.margem}`}>
      {children}
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className={`pointer-events-none absolute -top-1 h-[120%] ${folga.circulo}`}
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
