import { LETRAS, type Letra } from '../../types'

interface Props {
  questaoIds: string[]
  respostas: Record<string, Letra>
  marcadas: string[]
  atual: number
  onIr: (indice: number) => void
}

const dois = (n: number) => String(n).padStart(2, '0')

/** A folha de respostas óptica: número, cinco bolinhas impressas em rosa e a marca a caneta. */
export function FolhaRespostas({ questaoIds, respostas, marcadas, atual, onIr }: Props) {
  const respondidas = questaoIds.filter((id) => respostas[id]).length
  const linhasPorColuna = questaoIds.length > 15 ? Math.ceil(questaoIds.length / 2) : questaoIds.length

  return (
    <nav aria-label="Folha de respostas" className="rounded-lg border border-optico/40 bg-papel p-3">
      <p className="mb-2 text-sm text-tinta-suave">
        {respondidas} respondidas, {questaoIds.length - respondidas} em branco
        {marcadas.length > 0 && `, ${marcadas.length} para revisar`}
      </p>
      <ol
        className="grid grid-flow-col gap-x-4"
        style={{ gridTemplateRows: `repeat(${linhasPorColuna}, auto)` }}
      >
        {questaoIds.map((id, i) => {
          const resposta = respostas[id]
          const revisar = marcadas.includes(id)
          const rotulo = `Questão ${i + 1}: ${resposta ? `respondida ${resposta}` : 'em branco'}${revisar ? ', marcada para revisar' : ''}`
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onIr(i)}
                aria-label={rotulo}
                aria-current={i === atual ? 'step' : undefined}
                className={`flex w-full items-center gap-1 rounded px-1 py-0.5 ${i === atual ? 'bg-caneta-clara outline-1 outline-caneta' : 'hover:bg-fundo'}`}
              >
                <span className="w-5 text-right text-xs font-bold tabular-nums text-optico">{dois(i + 1)}</span>
                {LETRAS.map((letra) => (
                  <span
                    key={letra}
                    aria-hidden="true"
                    className={`flex size-3.5 items-center justify-center rounded-full border text-[0.5rem] leading-none font-bold ${
                      resposta === letra ? 'border-caneta bg-caneta text-papel' : 'border-optico/70 text-optico/80'
                    }`}
                  >
                    {letra}
                  </span>
                ))}
                <span
                  aria-hidden="true"
                  className={`ml-0.5 size-2 rounded-full ${revisar ? 'bg-alerta' : 'bg-transparent'}`}
                  title={revisar ? 'Marcada para revisar' : undefined}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-tinta-suave">
        <span aria-hidden="true" className="size-2 rounded-full bg-alerta" /> marcada para revisar
      </p>
    </nav>
  )
}
