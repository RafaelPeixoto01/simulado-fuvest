import { useId } from 'react'

import { LETRAS, type ItemCorrigido, type Letra } from '../../types'
import { colunasDaFolha, numeroDaFolha, trilhaDaFolha } from '../../utils/folha'
import { CabecalhoLetras } from '../CabecalhoLetras'
import { Icone } from '../Icone'
import { situacao, type Situacao } from './revisao'

function rotulo(numero: number, item: ItemCorrigido | undefined): string {
  if (!item) return `Questão ${numero}: removida da base`
  if (item.anulada) return `Questão ${numero}: anulada, ponto para todos`
  if (item.acertou) return `Questão ${numero}: acertou ${item.resposta}`
  if (!item.resposta) return `Questão ${numero}: em branco, correta ${item.correta}`
  return `Questão ${numero}: marcou ${item.resposta}, correta ${item.correta}`
}

const IconeCerto = ({ className }: { className: string }) => (
  <Icone className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icone>
)
const IconeErrado = ({ className }: { className: string }) => (
  <Icone className={className}>
    <path d="M7 7l10 10M17 7L7 17" />
  </Icone>
)

// Célula da grade do celular (D5): cor, borda e marca por situação
const CELULA: Record<Situacao, string> = {
  acerto: 'border-acerto/40 bg-acerto-claro text-acerto',
  erro: 'border-erro/40 bg-erro-claro text-erro',
  branco: 'border-dashed border-borda-campo bg-papel text-tinta-suave',
  anulada: 'border-alerta/40 bg-alerta-claro text-alerta',
  removida: 'border-dashed border-linha bg-fundo text-tinta-suave',
}

// Bolinha do desktop (D5): a marcada preenchida (verde se acertou, vermelha se errou);
// a correta contornada em verde quando o estudante errou ou deixou em branco
function estiloBolinha(item: ItemCorrigido | undefined, letra: Letra): string {
  if (item?.resposta === letra) {
    // Anulada vale ponto para todos, mas a letra marcada não é "a certa": fica em âmbar
    if (item.anulada) return 'border-[1.2px] border-alerta bg-alerta'
    return item.acertou ? 'border-[1.2px] border-acerto bg-acerto' : 'border-[1.2px] border-erro bg-erro'
  }
  if (item && !item.anulada && !item.acertou && item.correta === letra) return 'border-2 border-acerto'
  return 'border-[1.2px] border-optico'
}

interface Props {
  questaoIds: string[]
  itens: ItemCorrigido[]
  /** Questão aberta na revisão */
  atual: number
  /** Abre a questão na revisão (P1.7) */
  onIr: (indice: number) => void
  /** `grade`: células de 50 px do celular; `bolhas`: folha óptica da barra lateral do desktop (D5, CR-003) */
  formato: 'grade' | 'bolhas'
}

/** A folha de respostas depois da correção, clicável: leva cada questão à revisão. */
export function FolhaCorrigida({ questaoIds, itens, atual, onIr, formato }: Props) {
  const idTitulo = useId()
  const porId = new Map(itens.map((i) => [i.questao_id, i]))
  const acertos = itens.filter((i) => i.acertou).length
  const erros = itens.filter((i) => !i.acertou && i.resposta !== null).length
  const brancos = itens.filter((i) => !i.acertou && i.resposta === null).length
  // Os acertos incluem as anuladas, como a nota (RN-008); o selo delas explica a diferença
  const anuladas = itens.filter((i) => i.anulada).length

  const cabecalho = (
    <>
      <h2 id={idTitulo} className={formato === 'grade' ? 'text-xl' : ''}>
        Folha corrigida
      </h2>
      <p className="text-sm text-tinta-suave">
        {formato === 'grade' ? 'Toque numa questão para revisá-la.' : 'Clique numa questão para revisá-la.'}
      </p>
      <p className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-acerto-claro px-2.5 py-1 text-acerto">
          <IconeCerto className="size-3.5" />
          {acertos} {acertos === 1 ? 'acerto' : 'acertos'}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-erro-claro px-2.5 py-1 text-erro">
          <IconeErrado className="size-3.5" />
          {erros} {erros === 1 ? 'erro' : 'erros'}
        </span>
        <span className="flex items-center gap-1 rounded-full border border-dashed border-borda-campo bg-papel px-2.5 py-[3px] text-tinta-suave">
          – {brancos} em branco
        </span>
        {anuladas > 0 && (
          <span className="rounded-full bg-alerta-claro px-2.5 py-1 text-alerta">
            {anuladas} {anuladas === 1 ? 'anulada' : 'anuladas'} (conta como acerto)
          </span>
        )}
      </p>
    </>
  )

  if (formato === 'grade') {
    return (
      <section aria-labelledby={idTitulo}>
        {cabecalho}
        <ol aria-label="Folha de respostas corrigida" className="mt-3 grid grid-cols-6 gap-1.5">
          {questaoIds.map((id, i) => {
            const item = porId.get(id)
            const s = situacao(item)
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-label={rotulo(i + 1, item)}
                  aria-current={i === atual ? 'true' : undefined}
                  onClick={() => onIr(i)}
                  className={`flex h-[50px] w-full flex-col items-center justify-center gap-px rounded-lg border ${CELULA[s]} ${
                    i === atual ? 'ring-2 ring-caneta ring-offset-2' : ''
                  }`}
                >
                  <span className="text-[11px] tabular-nums text-tinta-suave">{numeroDaFolha(i + 1)}</span>
                  <span aria-hidden="true" className="flex items-center gap-0.5 text-sm font-bold">
                    {s === 'acerto' && <IconeCerto className="size-3 [stroke-width:3]" />}
                    {s === 'erro' && <IconeErrado className="size-[11px] [stroke-width:3]" />}
                    {s === 'acerto' || s === 'erro' ? item?.resposta : s === 'anulada' ? 'anul.' : '–'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }

  const colunas = colunasDaFolha(questaoIds.length)
  const porColuna = Math.ceil(questaoIds.length / colunas)
  const trilha = trilhaDaFolha(colunas)
  return (
    <section aria-labelledby={idTitulo}>
      {cabecalho}
      <CabecalhoLetras colunas={colunas} className="mt-3" />
      <ol
        aria-label="Folha de respostas corrigida"
        className="grid grid-flow-col gap-x-2"
        style={{ gridTemplateColumns: trilha, gridTemplateRows: `repeat(${porColuna}, auto)` }}
      >
        {questaoIds.map((id, i) => {
          const item = porId.get(id)
          const s = situacao(item)
          return (
            <li key={id}>
              <button
                type="button"
                aria-label={rotulo(i + 1, item)}
                aria-current={i === atual ? 'true' : undefined}
                onClick={() => onIr(i)}
                className={`flex h-5 w-full items-center gap-1 rounded px-1 ${
                  i === atual ? 'bg-caneta-clara shadow-[inset_0_0_0_1.5px_var(--color-caneta)]' : 'hover:bg-fundo'
                } ${s === 'removida' ? 'opacity-40' : ''}`}
              >
                <span className="w-[1.125rem] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-optico-texto">
                  {numeroDaFolha(i + 1)}
                </span>
                <span aria-hidden="true" className="flex gap-[3px]">
                  {LETRAS.map((letra) => (
                    <span key={letra} className={`size-[13px] rounded-full ${estiloBolinha(item, letra)}`} />
                  ))}
                </span>
                <span
                  aria-hidden="true"
                  className={`ml-0.5 size-1.5 shrink-0 rounded-full ${s === 'anulada' ? 'bg-alerta' : ''}`}
                />
              </button>
            </li>
          )
        })}
      </ol>
      <p aria-hidden="true" className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-tinta-suave">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-acerto" />
          acertou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-erro" />
          errou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-acerto" />
          correta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-alerta" />
          anulada
        </span>
      </p>
    </section>
  )
}
