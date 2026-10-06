import { useId, useState } from 'react'

import type { PontoSerie } from '../types'
import { CARTAO } from './estilos'

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** "06/10" de "2026-10-06", sem passar por Date: o dia já é o de Brasília, não o do navegador. */
function diaMesIso(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

interface Props {
  titulo: string
  pontos: PontoSerie[]
  granularidade: 'dia' | 'semana'
  /** Plural do que é contado: "cadastros", "logins" */
  unidade: string
  /** Usuários ativos: o cabeçalho traz a média por dia, e cada semana já é uma média (specs/09 §2.4) */
  media?: boolean
}

/** Colunas de uma série só (CR-013, specs/09 §3; regras da skill de dataviz): colunas de até
 *  24 px com 4 px arredondados no topo e 2 px de papel entre elas, na cor de ação; a leitura do
 *  valor aparece ao passar o ponteiro, e os números ficam numa tabela que abre ("Ver os números").
 *  As colunas são decorativas para leitores de tela: a tabela é a fonte. */
export function GraficoColunas({ titulo, pontos, granularidade, unidade, media = false }: Props) {
  const [destaque, setDestaque] = useState<number | null>(null)
  const idTitulo = useId()
  const maximo = Math.max(0, ...pontos.map((p) => p.total))
  const soma = pontos.reduce((total, p) => total + p.total, 0)
  const resumo = media
    ? `média de ${numero.format(pontos.length ? soma / pontos.length : 0)} por dia`
    : `${numero.format(soma)} no período`
  const rotulo = (p: PontoSerie) => (granularidade === 'dia' ? diaMesIso(p.inicio) : `semana de ${diaMesIso(p.inicio)}`)
  const ponto = destaque !== null ? pontos[destaque] : null

  return (
    <figure aria-labelledby={idTitulo} className={`${CARTAO} p-4`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id={idTitulo} className="font-semibold">
          {titulo}
        </span>
        <span className="text-sm tabular-nums text-tinta-suave">{resumo}</span>
      </figcaption>
      {pontos.length === 0 ? (
        <p className="mt-3 text-sm text-tinta-suave">Sem dados no período.</p>
      ) : (
        <div aria-hidden="true" className="mt-3">
          {/* Leitura do valor sob o ponteiro; sem ponteiro, o maior valor (o topo da escala) */}
          <p className="h-5 text-xs tabular-nums text-tinta-suave">
            {ponto ? (
              <>
                {rotulo(ponto)}: <strong className="font-semibold text-tinta">{numero.format(ponto.total)}</strong>{' '}
                {media ? 'por dia' : unidade}
              </>
            ) : (
              `máximo ${numero.format(maximo)}`
            )}
          </p>
          <div className="flex h-28 items-end gap-0.5 border-b border-linha" onPointerLeave={() => setDestaque(null)}>
            {pontos.map((p, i) => (
              // A coluna inteira é a área do ponteiro, maior que a barra
              <div
                key={p.inicio}
                data-testid="coluna"
                className="flex h-full min-w-0 flex-1 items-end justify-center"
                onPointerEnter={() => setDestaque(i)}
              >
                <div
                  className={`w-full max-w-6 rounded-t-[4px] ${i === destaque ? 'bg-tinta-suave' : 'bg-caneta'}`}
                  // Valor pequeno ainda aparece (2 px); zero fica só na linha de base
                  style={{ height: `${maximo > 0 ? (p.total / maximo) * 100 : 0}%`, minHeight: p.total > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-tinta-suave">
            <span>{rotulo(pontos[0])}</span>
            {pontos.length > 1 && <span>{rotulo(pontos[pontos.length - 1])}</span>}
          </div>
        </div>
      )}
      {pontos.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-tinta-suave hover:text-tinta">Ver os números</summary>
          <table className="mt-2 w-full tabular-nums">
            <caption className="sr-only">{titulo}</caption>
            <thead>
              <tr className="text-left text-tinta-suave">
                <th scope="col" className="py-1 font-normal">
                  {granularidade === 'dia' ? 'Dia' : 'Semana de'}
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  {media ? 'Média por dia' : unidade[0].toUpperCase() + unidade.slice(1)}
                </th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.inicio} className="border-t border-linha">
                  <td className="py-1">{diaMesIso(p.inicio)}</td>
                  <td className="py-1 text-right">{numero.format(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  )
}
