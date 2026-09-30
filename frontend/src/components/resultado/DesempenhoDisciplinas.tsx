import { NOMES_DISCIPLINAS, type DesempenhoDisciplina } from '../../types'
import { formatarPercentual } from '../../utils/format'

/** Barras em CSS; o valor sempre também em texto (cor não é o único indicador). */
export function DesempenhoDisciplinas({ dados }: { dados: DesempenhoDisciplina[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold">Por disciplina</h2>
      <p className="text-sm text-tinta-suave">Da que mais precisa de estudo para a que foi melhor.</p>
      <ul aria-label="Desempenho por disciplina" className="mt-4 space-y-3">
        {dados.map((d) => (
          <li key={d.disciplina}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">{NOMES_DISCIPLINAS[d.disciplina]}</span>
              <span className="text-sm tabular-nums text-tinta-suave">
                {d.acertos} de {d.total} ({formatarPercentual(d.percentual)})
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-linha" aria-hidden="true">
              <div className="h-full rounded-full bg-caneta" style={{ width: `${d.percentual}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
