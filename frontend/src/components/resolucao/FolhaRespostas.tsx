import { useEffect, useRef } from 'react'

import { LETRAS, type Letra } from '../../types'
import { colunasDaFolha, numeroDaFolha, trilhaDaFolha } from '../../utils/folha'
import { CabecalhoLetras } from '../CabecalhoLetras'
import { MarcasSincronismo } from '../MarcasSincronismo'

interface Props {
  questaoIds: string[]
  respostas: Record<string, Letra>
  marcadas: string[]
  atual: number
  onIr: (indice: number) => void
  /** `bolhas`: folha óptica do desktop, em colunas; `grade`: botões de 48 px do painel do celular (D2, CR-001) */
  formato: 'bolhas' | 'grade'
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
  const revisar = new Set(marcadas)
  const paraRevisar = questaoIds.filter((id) => revisar.has(id)).length
  const resumo = `${respondidas} ${respondidas === 1 ? 'respondida' : 'respondidas'} · ${total - respondidas} em branco${paraRevisar ? ` · ${paraRevisar} para revisar` : ''}`

  // No painel do celular, a questão atual já aparece à vista ao abrir
  const botaoAtual = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    botaoAtual.current?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  const rotulo = (id: string, i: number) => {
    const resposta = respostas[id]
    return `Questão ${i + 1}: ${resposta ? `respondida ${resposta}` : 'em branco'}${revisar.has(id) ? ', marcada para revisar' : ''}`
  }

  if (formato === 'grade') {
    return (
      <div className="flex min-h-0 flex-col gap-2.5">
        <p className="text-sm text-tinta-suave">{resumo}</p>
        <Legenda />
        {/* Marcas de sincronismo do painel (CR-008, I5) na altura visível da grade, abaixo da legenda e fora
            da área que rola (CR-009, A2): ficam paradas, como as do impresso. Até 14; num simulado curto,
            em que a grade cabe inteira, no máximo 2 por linha, para não se amontoarem */}
        <div className="relative flex min-h-0 flex-col">
          <MarcasSincronismo
            quantidade={Math.min(14, 2 * Math.ceil(total / 5))}
            posicao="-left-3 top-1.5 bottom-1"
            tamanho="h-1 w-2"
          />
          <nav aria-label="Folha de respostas" className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1 pt-1.5 pb-1">
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
                      <span className="text-sm font-bold tabular-nums text-optico-texto">{numeroDaFolha(i + 1)}</span>
                      <span
                        aria-hidden="true"
                        className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] text-xs font-bold ${
                          resposta ? 'border-caneta bg-caneta text-fundo' : 'border-optico'
                        }`}
                      >
                        {resposta ?? ''}
                      </span>
                    </button>
                    {revisar.has(id) && (
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
      </div>
    )
  }

  const colunas = colunasDaFolha(total)
  const porColuna = Math.ceil(total / colunas)
  const trilha = trilhaDaFolha(colunas)
  return (
    <div>
      <p className="text-sm text-tinta-suave">{resumo}</p>
      <nav aria-label="Folha de respostas" className="mt-3">
        <CabecalhoLetras colunas={colunas} />
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
                  <span className="w-[1.125rem] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-optico-texto">
                    {numeroDaFolha(i + 1)}
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
                    className={`ml-0.5 size-1.5 shrink-0 rounded-full ${revisar.has(id) ? 'bg-alerta' : ''}`}
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
