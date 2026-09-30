import { useState } from 'react'

import type { SimuladoEmAndamento } from '../../simulado/tipos'
import { decorridoMs, formatarTempo, restanteMs } from '../../utils/tempo'

export const AVISO_MS = 15 * 60 * 1000

interface Props {
  simulado: SimuladoEmAndamento
  agora: number
  onPausar: () => void
  onRetomar: () => void
}

export function Cronometro({ simulado, agora, onPausar, onRetomar }: Props) {
  const [oculto, setOculto] = useState(false)
  const restante = restanteMs(simulado, agora)
  const pausado = simulado.pausadoEm !== null
  const alerta = restante !== null && restante <= AVISO_MS

  const tempo =
    restante === null ? `Tempo: ${formatarTempo(decorridoMs(simulado, agora))}` : formatarTempo(restante)

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      <span
        role="timer"
        aria-label={restante === null ? 'Tempo decorrido' : 'Tempo restante'}
        className={`rounded-md px-2 py-1 text-center font-bold tabular-nums ${alerta ? 'bg-alerta-claro text-alerta' : 'bg-papel'}`}
      >
        {oculto ? 'Tempo oculto' : tempo}
        {pausado && <span className="ml-1.5 text-sm font-normal text-tinta-suave">(pausado)</span>}
      </span>
      <button
        type="button"
        onClick={() => setOculto((v) => !v)}
        aria-label={oculto ? 'Mostrar tempo' : 'Ocultar tempo'}
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-sm text-tinta-suave hover:text-tinta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {!oculto && <path d="M3 3l18 18" />}
        </svg>
        <span className="hidden sm:inline">{oculto ? 'Mostrar' : 'Ocultar'}</span>
      </button>
      {simulado.pausavel && (
        <button
          type="button"
          onClick={pausado ? onRetomar : onPausar}
          className="rounded-md border border-linha bg-papel px-2.5 py-1 text-sm font-semibold hover:border-caneta/50"
        >
          {pausado ? 'Retomar' : 'Pausar'}
        </button>
      )}
    </div>
  )
}
