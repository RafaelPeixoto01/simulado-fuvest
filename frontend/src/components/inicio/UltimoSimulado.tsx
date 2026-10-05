import { useId } from 'react'
import { Link } from 'react-router-dom'

import { useHistorico } from '../../hooks/useHistorico'
import { useSessao } from '../../hooks/useSessao'
import { NOMES_DISCIPLINAS } from '../../types'
import { disciplinasMaisFracas, ultimoSimulado } from '../../utils/desempenho'
import { formatarDiaMes, formatarPercentual } from '../../utils/format'
import { notaComparavel } from '../../utils/notasCorte'
import { BarraPercentual } from '../BarraPercentual'
import { CARTAO, LINK } from '../estilos'
import { LinhaCortes } from '../notasCorte/ComparacaoCorte'

/** "Seu último simulado" no início (CR-008, I6.2): acertos, aproveitamento e as duas disciplinas
 *  mais fracas do simulado mais recente do histórico (o da conta, com conta — ADR-011). */
export function UltimoSimulado() {
  const { entradas } = useHistorico()
  const idTitulo = useId()
  const alvo = useSessao().data?.usuario?.carreira_alvo ?? null
  const entrada = ultimoSimulado(entradas)
  if (!entrada) return null

  const { acertos, total, percentual } = entrada.resultado
  const fracas = disciplinasMaisFracas(entrada)
  const nota = notaComparavel(entrada)

  return (
    <section aria-labelledby={idTitulo} className={`${CARTAO} p-5`}>
      <h2 id={idTitulo} className="text-lg">
        Seu último simulado
      </h2>
      <p className="mt-1 text-sm text-tinta-suave">
        {entrada.descricao} · {formatarDiaMes(entrada.finalizadoEm)}
      </p>
      <p className="mt-1 font-titulo text-[2.5rem] leading-tight font-[650] tabular-nums">
        {acertos} <span className="text-xl font-medium text-tinta-suave">de {total}</span>
      </p>
      <p className="text-sm text-tinta-suave">{formatarPercentual(percentual)} de aproveitamento</p>
      {/* Notas de corte (CR-010): com carreira-alvo, na Prova completa e na Prova de um ano (CR-011) */}
      {alvo && nota !== null && <LinhaCortes nota={nota} alvo={alvo} />}

      {fracas.length > 0 && (
        <>
          <p className="mt-4 text-sm font-bold">Para estudar</p>
          <ul className="mt-2 space-y-2.5 text-sm">
            {fracas.map((d) => (
              <li key={d.disciplina}>
                <div className="flex justify-between gap-3">
                  <span>{NOMES_DISCIPLINAS[d.disciplina]}</span>
                  <span className="tabular-nums text-tinta-suave">{formatarPercentual(d.percentual)}</span>
                </div>
                <BarraPercentual percentual={d.percentual} fina />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <Link to={`/resultado/${entrada.id}`} className={LINK}>
          Ver o resultado
        </Link>
        <Link to="/desempenho" className={LINK}>
          Meu desempenho
        </Link>
      </p>
    </section>
  )
}
