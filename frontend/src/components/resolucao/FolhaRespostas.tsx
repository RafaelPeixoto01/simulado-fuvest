import { useEffect, useRef } from 'react'

import { LETRAS, type Letra } from '../../types'

interface Props {
  questaoIds: string[]
  respostas: Record<string, Letra>
  marcadas: string[]
  atual: number
  onIr: (indice: number) => void
  /** `bolhas`: folha óptica do desktop, em colunas; `grade`: botões de 48 px do painel do celular (D2, CR-001) */
  formato: 'bolhas' | 'grade'
}

const dois = (n: number) => String(n).padStart(2, '0')

/** Colunas da folha do desktop: 90 questões cabem inteiras em 3 colunas de 30 linhas (P1.4). */
function colunasDaFolha(total: number): number {
  if (total > 40) return 3
  return total > 15 ? 2 : 1
}

function Legenda() {
  return (
    <p aria-hidden="true" className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-tinta-suave">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-caneta" />
        respondida
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full border-[1.5px] border-optico" />
        em branco
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-alerta" />
        para revisar
      </span>
    </p>
  )
}

/** A folha de respostas óptica: número, bolinhas impressas em rosa e a marca a caneta. */
export function FolhaRespostas({ questaoIds, respostas, marcadas, atual, onIr, formato }: Props) {
  const total = questaoIds.length
  const respondidas = questaoIds.filter((id) => respostas[id]).length
  const paraRevisar = questaoIds.filter((id) => marcadas.includes(id)).length
  const resumo = `${respondidas} respondidas · ${total - respondidas} em branco${paraRevisar ? ` · ${paraRevisar} para revisar` : ''}`

  // No painel do celular, a questão atual já aparece à vista ao abrir
  const botaoAtual = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    botaoAtual.current?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  const rotulo = (id: string, i: number) => {
    const resposta = respostas[id]
    const revisar = marcadas.includes(id)
    return `Questão ${i + 1}: ${resposta ? `respondida ${resposta}` : 'em branco'}${revisar ? ', marcada para revisar' : ''}`
  }

  if (formato === 'grade') {
    return (
      <div className="flex min-h-0 flex-col gap-2.5">
        <p className="text-sm text-tinta-suave">{resumo}</p>
        <Legenda />
        <nav aria-label="Folha de respostas" className="-mx-1 min-h-0 overflow-y-auto px-1 pt-1.5 pb-1">
          <ol className="grid grid-cols-5 gap-2">
            {questaoIds.map((id, i) => {
              const resposta = respostas[id]
              const eAtual = i === atual
              return (
                <li key={id} className="relative">
                  <button
                    ref={eAtual ? botaoAtual : undefined}
                    type="button"
                    onClick={() => onIr(i)}
                    aria-label={rotulo(id, i)}
                    aria-current={eAtual ? 'step' : undefined}
                    className={`flex h-12 w-full items-center justify-between rounded-lg px-1.5 ${
                      eAtual ? 'border-2 border-caneta bg-caneta-clara' : 'border border-linha bg-papel'
                    }`}
                  >
                    <span className="text-sm font-bold tabular-nums text-optico">{dois(i + 1)}</span>
                    <span
                      aria-hidden="true"
                      className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] text-xs font-bold ${
                        resposta ? 'border-caneta bg-caneta text-papel' : 'border-optico'
                      }`}
                    >
                      {resposta ?? ''}
                    </span>
                  </button>
                  {marcadas.includes(id) && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-papel bg-alerta"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>
    )
  }

  const colunas = colunasDaFolha(total)
  const porColuna = Math.ceil(total / colunas)
  const trilha = `repeat(${colunas}, minmax(0, 1fr))`
  return (
    <div>
      <p className="text-sm text-tinta-suave">{resumo}</p>
      <nav aria-label="Folha de respostas" className="mt-3">
        {/* Letras A–E só no cabeçalho de cada coluna (D2): dentro das bolinhas, a 8 px, eram ilegíveis */}
        <div aria-hidden="true" className="grid gap-x-2" style={{ gridTemplateColumns: trilha }}>
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
        <ol
          className="grid grid-flow-col gap-x-2"
          style={{ gridTemplateColumns: trilha, gridTemplateRows: `repeat(${porColuna}, auto)` }}
        >
          {questaoIds.map((id, i) => {
            const resposta = respostas[id]
            const eAtual = i === atual
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onIr(i)}
                  aria-label={rotulo(id, i)}
                  aria-current={eAtual ? 'step' : undefined}
                  className={`flex h-5 w-full items-center gap-1 rounded px-1 ${
                    eAtual ? 'bg-caneta-clara shadow-[inset_0_0_0_1.5px_var(--color-caneta)]' : 'hover:bg-fundo'
                  }`}
                >
                  <span className="w-[1.125rem] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-optico">
                    {dois(i + 1)}
                  </span>
                  <span aria-hidden="true" className="flex gap-[3px]">
                    {LETRAS.map((letra) => (
                      <span
                        key={letra}
                        className={`size-[13px] rounded-full border-[1.2px] ${
                          resposta === letra ? 'border-caneta bg-caneta' : 'border-optico'
                        }`}
                      />
                    ))}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ml-0.5 size-1.5 shrink-0 rounded-full ${marcadas.includes(id) ? 'bg-alerta' : ''}`}
                  />
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="mt-2.5">
        <Legenda />
      </div>
    </div>
  )
}
