import { useState, type ReactNode } from 'react'

import type { SimuladoEmAndamento } from '../../simulado/tipos'
import { decorridoMs, formatarTempo, restanteMs } from '../../utils/tempo'

export const AVISO_MS = 15 * 60 * 1000

interface Props {
  simulado: SimuladoEmAndamento
  agora: number
  onPausar: () => void
  onRetomar: () => void
}

// No celular os botões são só ícone, com 44 px; a partir de 640 px ganham texto (CR-001)
const BOTAO_ICONE =
  'inline-flex size-11 items-center justify-center gap-1.5 rounded-lg text-tinta-suave hover:text-tinta sm:h-10 sm:w-auto sm:px-2.5 sm:text-sm'

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function Cronometro({ simulado, agora, onPausar, onRetomar }: Props) {
  const [oculto, setOculto] = useState(false)
  const restante = restanteMs(simulado, agora)
  const pausado = simulado.pausadoEm !== null
  const alerta = restante !== null && restante <= AVISO_MS

  // Sem limite, mostra o decorrido; o prefixo some no celular para a barra caber em 320 px
  const tempo =
    restante === null ? (
      <>
        <span className="hidden sm:inline">Tempo: </span>
        {formatarTempo(decorridoMs(simulado, agora))}
      </>
    ) : (
      formatarTempo(restante)
    )
  const cor = alerta
    ? 'border-alerta/40 bg-alerta-claro text-alerta'
    : pausado || oculto
      ? 'border-linha bg-papel text-tinta-suave'
      : 'border-linha bg-papel'

  return (
    <div className="flex items-center gap-0.5 sm:gap-2">
      <span
        role="timer"
        aria-label={restante === null ? 'Tempo decorrido' : 'Tempo restante'}
        className={`min-w-[5.5rem] rounded-lg border px-2.5 py-1.5 text-center font-bold tabular-nums sm:text-lg ${cor}`}
      >
        {pausado ? 'Pausado' : oculto ? 'Oculto' : tempo}
      </span>
      <button
        type="button"
        onClick={() => setOculto((v) => !v)}
        aria-label={oculto ? 'Mostrar tempo' : 'Ocultar tempo'}
        className={BOTAO_ICONE}
      >
        <Icone>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {!oculto && <path d="M3 3l18 18" />}
        </Icone>
        <span className="hidden sm:inline">{oculto ? 'Mostrar' : 'Ocultar'}</span>
      </button>
      {simulado.pausavel && (
        <button
          type="button"
          onClick={pausado ? onRetomar : onPausar}
          aria-label={pausado ? 'Retomar' : 'Pausar'}
          className={`${BOTAO_ICONE} sm:border sm:border-linha sm:bg-papel sm:px-3 sm:font-semibold sm:text-tinta sm:hover:border-caneta/50`}
        >
          <Icone>
            {pausado ? (
              <path d="M7 5l12 7-12 7V5Z" />
            ) : (
              <>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </>
            )}
          </Icone>
          <span className="hidden sm:inline">{pausado ? 'Retomar' : 'Pausar'}</span>
        </button>
      )}
    </div>
  )
}
