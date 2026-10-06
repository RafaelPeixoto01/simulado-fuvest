import { BarraPercentual } from '../../components/BarraPercentual'
import { Carregando, ErroCarregamento, Vazio } from '../../components/Estados'
import { useGestaoAprendizado } from '../../hooks/useGestao'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import { type AprendizadoGestao, type CortesModalidades, NOMES_DISCIPLINAS } from '../../types'
import { formatarPercentual } from '../../utils/format'
import { MODALIDADES } from '../../utils/notasCorte'
import { formatarDuracao } from '../../utils/tempo'
import { Atualizando, CABECALHO, CELULA, Secao, SeletorPeriodo, TabelaRolavel } from './componentes'
import { formatarNumero, NOMES_MODOS, usePeriodo } from './periodo'

const ou = (valor: number | null, formatar: (v: number) => string) => (valor === null ? '—' : formatar(valor))

function Placar({ acertos, respostas, percentual }: { acertos: number; respostas: number; percentual: number }) {
  return (
    <span className="shrink-0 text-sm tabular-nums text-tinta-suave">
      {formatarNumero(acertos)} de {formatarNumero(respostas)} respostas ({formatarPercentual(percentual)})
    </span>
  )
}

function PorModo({ dados }: { dados: AprendizadoGestao }) {
  return (
    <TabelaRolavel rotulo="Aprendizado por modo">
      <thead>
        <tr>
          <th scope="col" className={CABECALHO}>Modo</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Concluídos</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Acerto médio</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Finalizados por tempo</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Tempo por questão</th>
        </tr>
      </thead>
      <tbody>
        {dados.modos.map((m) => (
          <tr key={m.modo} className="border-t border-linha">
            <th scope="row" className={`${CELULA} font-normal`}>{NOMES_MODOS[m.modo]}</th>
            <td className={`${CELULA} text-right`}>{formatarNumero(m.concluidos)}</td>
            <td className={`${CELULA} text-right`}>{ou(m.acerto_medio, formatarPercentual)}</td>
            <td className={`${CELULA} text-right`}>{ou(m.por_tempo, formatarPercentual)}</td>
            <td className={`${CELULA} text-right`}>{ou(m.tempo_medio_questao_s, (s) => formatarDuracao(s * 1000))}</td>
          </tr>
        ))}
      </tbody>
    </TabelaRolavel>
  )
}

function Disciplinas({ dados }: { dados: AprendizadoGestao }) {
  if (dados.disciplinas.length === 0) return <Vazio>Nenhuma resposta contada ainda.</Vazio>
  return (
    <div className="space-y-8">
      {dados.disciplinas.map((d) => {
        const nome = NOMES_DISCIPLINAS[d.disciplina]
        return (
          <section key={d.disciplina} aria-label={nome}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 className="font-semibold">{nome}</h3>
              <Placar {...d} />
            </div>
            <BarraPercentual percentual={d.percentual} />
            {d.assuntos.length > 0 && (
              <ul aria-label={`Assuntos de ${nome}`} className="mt-3 space-y-2.5 border-l-2 border-linha pl-3">
                {d.assuntos.map((a) => (
                  <li key={a.assunto}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="text-sm">{a.nome}</span>
                      <Placar {...a} />
                    </div>
                    <BarraPercentual percentual={a.percentual} fina />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function TresModalidades({ valores }: { valores: CortesModalidades | null }) {
  if (!valores) return <>—</>
  return (
    <>
      {MODALIDADES.map((m, i) => (
        <span key={m.chave}>
          {i > 0 && ' · '}
          <abbr title={m.nome}>{m.sigla}</abbr> {valores[m.chave] ?? '—'}
        </span>
      ))}
    </>
  )
}

function Carreiras({ dados }: { dados: AprendizadoGestao }) {
  if (dados.carreiras.length === 0) return <Vazio>Nenhum estudante escolheu uma carreira-alvo.</Vazio>
  return (
    <TabelaRolavel rotulo="Carreiras-alvo e cortes">
      <thead>
        <tr>
          <th scope="col" className={CABECALHO}>Carreira</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Estudantes</th>
          <th scope="col" className={CABECALHO}>Corte</th>
          <th scope="col" className={CABECALHO}>Atingiriam</th>
        </tr>
      </thead>
      <tbody>
        {dados.carreiras.map((c) => (
          <tr key={`${c.ano}-${c.codigo}`} className="border-t border-linha align-top">
            <th scope="row" className={`${CELULA} font-normal`}>
              {c.nome ?? `${c.ano} · código ${c.codigo} (fora da lista)`}
              <span className="block text-xs text-tinta-suave">FUVEST {c.ano}</span>
            </th>
            <td className={`${CELULA} text-right`}>{formatarNumero(c.estudantes)}</td>
            <td className={CELULA}>
              <TresModalidades valores={c.cortes} />
            </td>
            <td className={CELULA}>
              <TresModalidades valores={c.atingiriam} />
              <span className="block text-xs text-tinta-suave">
                de {formatarNumero(c.com_prova_completa)} com Prova completa
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TabelaRolavel>
  )
}

/** Aba Aprendizado (CR-013, RF-032). */
export function AprendizadoPage() {
  useTituloPagina('Gestão · Aprendizado')
  const [periodo, setPeriodo] = usePeriodo()
  const consulta = useGestaoAprendizado(periodo)
  const dados = consulta.data

  return (
    <>
      <SeletorPeriodo periodo={periodo} onMudar={setPeriodo} />
      <div className="mt-6">
        {consulta.isPending ? (
          <Carregando />
        ) : !dados ? (
          <ErroCarregamento mensagem="Não foi possível carregar os números." onTentar={() => void consulta.refetch()} />
        ) : (
          <Atualizando ativo={consulta.isPlaceholderData}>
            <PorModo dados={dados} />
            <Secao
              titulo="Acerto por disciplina e assunto"
              nota="Desde o início, sem as anuladas, com o gabarito atual. Da disciplina e do assunto com menor acerto para o maior."
            >
              <Disciplinas dados={dados} />
            </Secao>
            <Secao
              titulo="Carreiras-alvo mais escolhidas"
              nota="Quantos atingiriam cada corte no último simulado de Prova completa (nota convertida para a escala da lista). É referência para a 1ª fase, não previsão de aprovação."
            >
              <Carreiras dados={dados} />
            </Secao>
          </Atualizando>
        )}
      </div>
    </>
  )
}
