import { NOMES_DISCIPLINAS, type DesempenhoAssunto, type DesempenhoDisciplina } from '../../types'
import { BarraPercentual, Placar } from '../BarraPercentual'

/** CR-004: detalhe recolhido — num simulado, cada assunto tem poucas questões. */
function PorAssunto({ disciplina, assuntos }: { disciplina: string; assuntos: DesempenhoAssunto[] }) {
  return (
    <details className="mt-2">
      <summary className="w-fit cursor-pointer rounded text-sm font-semibold text-caneta hover:text-caneta-escura">
        Ver por assunto<span className="sr-only"> em {disciplina}</span>
      </summary>
      <ul aria-label={`Desempenho por assunto em ${disciplina}`} className="mt-2 space-y-1 border-l-2 border-linha pl-3">
        {assuntos.map((a) => (
          <li key={a.assunto} className="flex items-baseline justify-between gap-4">
            <span className="text-sm">{a.nome}</span>
            <Placar {...a} />
          </li>
        ))}
      </ul>
    </details>
  )
}

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
              <Placar {...d} />
            </div>
            <BarraPercentual percentual={d.percentual} />
            {/* Resultado gravado antes do CR-004 não tem assuntos: fica só a barra */}
            {!!d.assuntos?.length && <PorAssunto disciplina={NOMES_DISCIPLINAS[d.disciplina]} assuntos={d.assuntos} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
