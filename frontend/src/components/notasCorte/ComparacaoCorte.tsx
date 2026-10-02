import { useId } from 'react'
import { Link } from 'react-router-dom'

import type { CarreiraAlvo, CortesModalidades } from '../../types'
import { MODALIDADES, situacao, type Situacao } from '../../utils/notasCorte'
import { CARTAO, LINK } from '../estilos'

// A situação é escrita; a cor só reforça (WCAG 1.4.1)
function textoSituacao(s: Situacao): string {
  if (s.tipo === 'atingiu') return `atingiu (+${s.acima})`
  if (s.tipo === 'falta') return `faltam ${s.faltam}`
  return 'sem convocados'
}

const COR_SITUACAO: Record<Situacao['tipo'], string> = {
  atingiu: 'font-semibold text-acerto',
  falta: 'font-semibold text-erro',
  'sem-corte': 'text-tinta-suave',
}

/** "AC 79 · EP 71 · PPI 60", com o nome da modalidade na sigla (CR-010). Com `pontos`, a situação
 *  curta depois de cada corte: "AC 79 (faltam 18)", "PPI 60 (atingiu)". */
export function CortesEmLinha({ cortes, pontos }: { cortes: CortesModalidades; pontos?: number }) {
  return (
    <span className="tabular-nums">
      {MODALIDADES.map((m, i) => {
        const corte = cortes[m.chave]
        const s = pontos === undefined ? null : situacao(pontos, corte)
        return (
          <span key={m.chave}>
            {i > 0 && ' · '}
            <abbr title={m.nome} className="no-underline">
              {m.sigla}
            </abbr>{' '}
            {corte ?? '—'}
            {s && s.tipo !== 'sem-corte' && ` (${s.tipo === 'atingiu' ? 'atingiu' : textoSituacao(s)})`}
          </span>
        )
      })}
    </span>
  )
}

/** Bloco "Notas de corte" do resultado (Prova completa e Prova de um ano com 90 questões, RN-018). */
export function ComparacaoCorte({
  pontos,
  alvo,
  anoDaProva,
  comUsuario,
}: {
  pontos: number
  alvo: CarreiraAlvo | null
  anoDaProva: number | null
  comUsuario: boolean
}) {
  const idTitulo = useId()
  const linkDoAno = anoDaProva !== null && (
    <Link to={`/notas-de-corte?ano=${anoDaProva}`} className={LINK}>
      Ver as notas de corte de {anoDaProva}
    </Link>
  )

  let conteudo
  if (alvo?.carreira) {
    const { carreira } = alvo
    conteudo = (
      <>
        <p className="mt-1 text-sm text-tinta-suave">
          Sua carreira-alvo: <strong className="font-semibold text-tinta">{carreira.nome}</strong> · corte FUVEST{' '}
          {alvo.ano}
        </p>
        <ul aria-label="Cortes da carreira-alvo" className="mt-3 space-y-1.5">
          {MODALIDADES.map((m) => {
            const corte = carreira.cortes[m.chave]
            const s = situacao(pontos, corte)
            return (
              <li key={m.chave} className="tabular-nums">
                {m.nome}: {corte !== null && `corte ${corte} — `}
                <span className={COR_SITUACAO[s.tipo]}>{textoSituacao(s)}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-tinta-suave">Referência para ir à 2ª fase, não previsão de aprovação.</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/notas-de-corte" className={LINK}>
            Ver todas as notas de corte
          </Link>
          {linkDoAno}
        </p>
      </>
    )
  } else if (alvo) {
    conteudo = (
      <>
        <p className="mt-1">Sua carreira-alvo não está mais na lista.</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/notas-de-corte" className={LINK}>
            Escolher de novo
          </Link>
          {linkDoAno}
        </p>
      </>
    )
  } else {
    conteudo = (
      <>
        {comUsuario && <p className="mt-1">Compare sua nota com o corte da carreira que você quer.</p>}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/notas-de-corte" className={LINK}>
            {comUsuario ? 'Escolher carreira-alvo' : 'Ver as notas de corte'}
          </Link>
          {linkDoAno}
        </p>
      </>
    )
  }

  return (
    <section aria-labelledby={idTitulo} className={`${CARTAO} p-4 sm:p-5`}>
      <h2 id={idTitulo} className="text-lg">
        Notas de corte
      </h2>
      {conteudo}
    </section>
  )
}

/** Linha do cartão "Seu último simulado" no início: os três cortes e a situação de cada um. Sem os
 *  dados da carreira, nada: o aviso de escolher de novo fica no resultado e na página (specs/08 §3). */
export function LinhaCortes({ pontos, alvo }: { pontos: number; alvo: CarreiraAlvo }) {
  if (!alvo.carreira) return null
  return (
    <p className="mt-3 text-sm">
      <span className="font-semibold">
        Corte {alvo.ano} · {alvo.carreira.nome}:
      </span>{' '}
      <CortesEmLinha cortes={alvo.carreira.cortes} pontos={pontos} />
    </p>
  )
}
