import type { HistoricoEntry } from '../../simulado/tipos'
import { formatarDataHora, formatarPercentual } from '../../utils/format'
import { formatarDuracao } from '../../utils/tempo'
import { CirculoCaneta } from '../CirculoCaneta'

export function ResumoResultado({ entrada }: { entrada: HistoricoEntry }) {
  const { acertos, total, percentual } = entrada.resultado
  const medio = total > 0 ? entrada.tempoGastoMs / total : 0
  return (
    <section>
      <p className="text-sm text-tinta-suave">
        {entrada.descricao}, {formatarDataHora(entrada.finalizadoEm)}
      </p>
      <h1 className="mt-1 text-3xl sm:text-4xl">
        Você acertou{' '}
        {/* Círculo de caneta no número de acertos (CR-008, I5) */}
        <CirculoCaneta>{acertos}</CirculoCaneta> de {total}{' '}
        {total === 1 ? 'questão' : 'questões'}
      </h1>
      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-sm text-tinta-suave">Aproveitamento</dt>
          <dd className="font-titulo text-2xl font-[650] tabular-nums">{formatarPercentual(percentual)}</dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">Tempo gasto</dt>
          <dd className="font-titulo text-2xl font-[650] tabular-nums">{formatarDuracao(entrada.tempoGastoMs)}</dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">Tempo médio por questão</dt>
          <dd className="font-titulo text-2xl font-[650] tabular-nums">{formatarDuracao(medio)}</dd>
        </div>
      </dl>
      {entrada.finalizadoPorTempo && (
        <p className="mt-4 inline-block rounded-md bg-alerta-claro px-3 py-1 text-sm font-semibold text-alerta">
          Finalizado por tempo
        </p>
      )}
    </section>
  )
}
