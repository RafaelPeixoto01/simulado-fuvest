import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { BarraPercentual, Placar } from '../components/BarraPercentual'
import { Vazio } from '../components/Estados'
import { LINK } from '../components/estilos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useHistorico } from '../hooks/useHistorico'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { NOMES_DISCIPLINAS } from '../types'
import { agregarDesempenho, MINIMO_QUESTOES_ASSUNTO, nomesDosAssuntos, type LinhaDisciplina } from '../utils/desempenho'
import { formatarPercentual } from '../utils/format'

function SecaoDisciplina({ linha }: { linha: LinhaDisciplina }) {
  const nome = NOMES_DISCIPLINAS[linha.disciplina]
  const id = `desempenho-${linha.disciplina}`
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-lg font-bold">
          {nome}
        </h2>
        <Placar {...linha} />
      </div>
      <BarraPercentual percentual={linha.percentual} />
      <ul aria-label={`Assuntos de ${nome}`} className="mt-3 space-y-2.5 border-l-2 border-linha pl-3">
        {linha.assuntos.map((a) => (
          <li key={a.assunto ?? 'sem-assunto'}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-sm">
                {a.nome}
                {a.poucas && (
                  <span className="ml-2 whitespace-nowrap rounded-full border border-linha px-2 py-0.5 text-xs text-tinta-suave">
                    poucas questões
                  </span>
                )}
              </span>
              <Placar {...a} />
            </div>
            <BarraPercentual percentual={a.percentual} fina />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Painel "Meu desempenho" (RF-022, RN-015): soma o histórico deste navegador ou, com conta,
 *  o da conta (CR-005). */
export function DesempenhoPage() {
  useTituloPagina('Meu desempenho')
  const { entradas, usuario, loginDisponivel } = useHistorico()
  // O catálogo só traz os nomes atuais dos assuntos: enquanto carrega (ou se falhar), valem os do histórico
  const { data: catalogo } = useCatalogo()
  const painel = useMemo(() => agregarDesempenho(entradas, nomesDosAssuntos(entradas, catalogo)), [entradas, catalogo])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Meu desempenho</h1>
      {usuario ? (
        <p className="mt-2 text-tinta-suave">
          Estes números somam os simulados concluídos guardados na sua conta, em todos os dispositivos.
        </p>
      ) : (
        <p className="mt-2 text-tinta-suave">
          Estes números somam os simulados concluídos neste navegador. Trocar de dispositivo ou limpar os dados do
          navegador apaga o histórico.
          {loginDisponivel && (
            <>
              {' '}
              <Link to="/conta" className={LINK}>
                Entre com o Google
              </Link>{' '}
              para guardá-lo na sua conta.
            </>
          )}
        </p>
      )}

      <div className="mt-6">
        {painel.total === 0 ? (
          <Vazio>
            <p>Nenhum simulado concluído ainda.</p>
            <Link to="/" className={`${LINK} mt-2 inline-block`}>
              Começar um simulado
            </Link>
          </Vazio>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-2 rounded-xl border border-linha bg-papel p-4 text-center">
              <div>
                <dt className="text-sm text-tinta-suave">Simulados</dt>
                <dd className="text-2xl font-bold tabular-nums">{painel.simulados}</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-suave">Questões</dt>
                <dd className="text-2xl font-bold tabular-nums">{painel.total}</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-suave">Acertos</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatarPercentual(painel.percentual)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-tinta-suave">
              Das disciplinas e dos assuntos que mais precisam de estudo para os melhores. Questões anuladas não entram
              na conta. Assuntos com menos de {MINIMO_QUESTOES_ASSUNTO} questões aparecem como “poucas questões”.
            </p>

            <div className="mt-8 space-y-10">
              {painel.disciplinas.map((linha) => (
                <SecaoDisciplina key={linha.disciplina} linha={linha} />
              ))}
            </div>

            <Link to="/historico" className={`${LINK} mt-10 inline-block`}>
              Ver histórico
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
