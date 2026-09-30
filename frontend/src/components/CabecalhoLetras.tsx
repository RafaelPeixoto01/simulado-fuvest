import { LETRAS } from '../types'
import { trilhaDaFolha } from '../utils/folha'

/** Letras A–E no cabeçalho de cada coluna da folha óptica: dentro das bolinhas, a 8 px, eram
 *  ilegíveis (P2.2). Alinhadas com o número (18 px) e as bolinhas (13 px, 3 px de espaço). */
export function CabecalhoLetras({ colunas, className = '' }: { colunas: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`grid gap-x-2 ${className}`} style={{ gridTemplateColumns: trilhaDaFolha(colunas) }}>
      {Array.from({ length: colunas }, (_, c) => (
        <div key={c} className="flex h-4 items-center gap-1 px-1">
          <span className="w-[1.125rem] shrink-0" />
          <span className="flex gap-[3px]">
            {LETRAS.map((letra) => (
              <span key={letra} className="w-[13px] text-center text-[10px] font-bold text-tinta-suave">
                {letra}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
