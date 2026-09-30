import { useCallback, useState } from 'react'

import { LETRAS, type Alternativa, type Letra } from '../../types'
import { ModalFigura } from './ModalFigura'

export interface CorrecaoAlternativas {
  correta: Letra | null
  anulada: boolean
}

interface Props {
  alternativas: Partial<Record<Letra, Alternativa>>
  selecionada: Letra | null
  onSelecionar: (letra: Letra) => void
  correcao?: CorrecaoAlternativas | null
}

type Estado = 'neutra' | 'marcada' | 'correta' | 'errada'

const ESTILOS: Record<Estado, { linha: string; bolinha: string }> = {
  neutra: {
    linha: 'border-linha bg-papel hover:border-caneta/50',
    bolinha: 'border-optico text-optico',
  },
  marcada: {
    linha: 'border-caneta bg-caneta-clara',
    bolinha: 'border-caneta bg-caneta text-papel',
  },
  correta: {
    linha: 'border-acerto bg-acerto-claro',
    bolinha: 'border-acerto bg-acerto text-papel',
  },
  errada: {
    linha: 'border-erro bg-erro-claro',
    bolinha: 'border-erro bg-erro text-papel',
  },
}

export function Alternativas({ alternativas, selecionada, onSelecionar, correcao }: Props) {
  const [ampliada, setAmpliada] = useState<Letra | null>(null)
  const fechar = useCallback(() => setAmpliada(null), [])
  const corrigindo = Boolean(correcao)

  return (
    <div role="radiogroup" aria-label="Alternativas" className="space-y-2">
      {LETRAS.map((letra) => {
        const alt = alternativas[letra]
        if (!alt) return null
        const marcada = selecionada === letra
        const ehCorreta = Boolean(correcao && !correcao.anulada && correcao.correta === letra)
        const estado: Estado = corrigindo
          ? ehCorreta
            ? 'correta'
            : marcada && !correcao?.anulada
              ? 'errada'
              : marcada
                ? 'marcada'
                : 'neutra'
          : marcada
            ? 'marcada'
            : 'neutra'
        const estilo = ESTILOS[estado]
        const nome = `Alternativa ${letra}${alt.texto ? `: ${alt.texto}` : ' (figura)'}`

        return (
          <div key={letra} className="flex items-start gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={marcada}
              aria-label={nome}
              disabled={corrigindo}
              onClick={() => onSelecionar(letra)}
              className={`flex w-full min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-default ${estilo.linha}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${estilo.bolinha}`}
              >
                {letra}
              </span>
              <span className="min-w-0 flex-1">
                {alt.texto && (
                  <span className="block font-leitura text-[1.0625rem] leading-[1.6] whitespace-pre-line">
                    {alt.texto}
                  </span>
                )}
                {alt.figura && (
                  <img src={alt.figura} alt="" loading="lazy" className="mt-1 max-h-48 w-auto max-w-full bg-papel" />
                )}
                {corrigindo && (ehCorreta || marcada) && (
                  <span className="mt-1 flex flex-wrap gap-2 text-sm font-semibold">
                    {ehCorreta && <span className="text-acerto">Correta</span>}
                    {marcada && <span className={ehCorreta ? 'text-acerto' : 'text-erro'}>Sua resposta</span>}
                  </span>
                )}
              </span>
            </button>
            {alt.figura && (
              <button
                type="button"
                onClick={() => setAmpliada(letra)}
                className="mt-2 shrink-0 rounded-md px-2 py-1 text-sm text-caneta underline underline-offset-2"
                aria-label={`Ampliar figura da alternativa ${letra}`}
              >
                Ampliar
              </button>
            )}
          </div>
        )
      })}
      {correcao?.anulada && (
        <p className="rounded-md bg-alerta-claro px-3 py-2 text-sm text-alerta">
          Questão anulada pela FUVEST: o ponto vale para todos.
        </p>
      )}
      {ampliada && alternativas[ampliada]?.figura && (
        <ModalFigura
          src={alternativas[ampliada]!.figura!}
          alt={`Figura da alternativa ${ampliada}`}
          onFechar={fechar}
        />
      )}
    </div>
  )
}
