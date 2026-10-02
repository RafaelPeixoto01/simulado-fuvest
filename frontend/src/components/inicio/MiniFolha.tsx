import { LETRAS } from '../../types'
import { numeroDaFolha } from '../../utils/folha'

// Uma marca a caneta por linha, como numa folha já preenchida: B, D, A, C, E
const MARCADAS = [1, 3, 0, 2, 4]

/** Miniatura da folha óptica no cartão da Prova completa (CR-009, E4): cabeçalho A–E e cinco
 *  linhas com as bolinhas impressas em rosa. Decorativa; a partir de 640 px. */
export function MiniFolha({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`rounded-[10px] border border-linha bg-fundo px-4 py-3.5 ${className}`}>
      {/* O cabeçalho repete a coluna do número (w-5) e o espaço das linhas: as letras ficam sobre as bolinhas */}
      <div className="flex gap-1.5 text-[10px] font-bold text-tinta-suave">
        <span className="w-5" />
        {LETRAS.map((letra) => (
          <span key={letra} className="w-4 text-center">
            {letra}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {MARCADAS.map((marcada, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-5 text-right text-[11px] font-bold tabular-nums text-optico-texto">
              {numeroDaFolha(i + 1)}
            </span>
            {LETRAS.map((letra, j) => (
              <span
                key={letra}
                className={`size-4 rounded-full ${j === marcada ? 'bg-caneta' : 'border-[1.5px] border-optico'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
