import type { Bloco } from '../../types'
import { Figura } from './Figura'

/** Texto sempre como texto React (escapado), nunca HTML: sem XSS por construcao. */
export function Blocos({ blocos, altFigura }: { blocos: Bloco[]; altFigura: string }) {
  const figuras = blocos.flatMap((b, i) => (b.figura ? [i] : []))
  return (
    <div className="space-y-3">
      {blocos.map((bloco, i) => {
        if (bloco.figura) {
          const k = figuras.indexOf(i) + 1
          const alt = figuras.length > 1 ? `${altFigura} (${k} de ${figuras.length})` : altFigura
          return <Figura key={i} src={bloco.figura} alt={alt} />
        }
        return (
          <p key={i} className="font-leitura text-[1.0625rem] leading-[1.7] whitespace-pre-line sm:text-lg">
            {bloco.texto}
          </p>
        )
      })}
    </div>
  )
}
