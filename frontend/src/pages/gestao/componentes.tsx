import type { ReactNode } from 'react'

import { CARTAO } from '../../components/estilos'
import type { PeriodoGestao } from '../../types'
import { PERIODOS } from './periodo'

/** Partes repetidas das abas da gestão (CR-013, specs/09 §3). */

export function SeletorPeriodo({ periodo, onMudar }: { periodo: PeriodoGestao; onMudar: (p: PeriodoGestao) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      Período
      <select
        value={periodo}
        onChange={(e) => onMudar(e.target.value as PeriodoGestao)}
        className="rounded-md border border-borda-campo bg-papel px-3 py-2 text-base font-normal"
      >
        {PERIODOS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Um número de destaque dentro de um `<dl>`. */
export function CartaoNumero({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className={`${CARTAO} p-4`}>
      <dt className="text-sm text-tinta-suave">{rotulo}</dt>
      <dd className="mt-1 font-titulo text-2xl font-[650] tabular-nums">{valor}</dd>
      {detalhe && <dd className="mt-0.5 text-xs text-tinta-suave">{detalhe}</dd>}
    </div>
  )
}

/** Os números anteriores ficam na tela, esmaecidos, enquanto os novos chegam (sem pular o layout). */
export function Atualizando({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  return (
    <div aria-busy={ativo} className={ativo ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {children}
    </div>
  )
}

export function Secao({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: ReactNode }) {
  const id = `secao-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl">
        {titulo}
      </h2>
      {nota && <p className="mt-1 text-sm text-tinta-suave">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Tabela com rolagem lateral própria: a página nunca rola de lado (360 px). */
export function TabelaRolavel({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <div className={`${CARTAO} overflow-x-auto`} role="region" aria-label={rotulo} tabIndex={0}>
      <table className="w-full min-w-max text-left text-sm tabular-nums">{children}</table>
    </div>
  )
}

export const CELULA = 'px-3 py-2'
export const CABECALHO = 'px-3 py-2 font-semibold text-tinta-suave'
