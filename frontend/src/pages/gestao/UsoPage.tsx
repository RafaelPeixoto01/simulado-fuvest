import { BarraPercentual } from '../../components/BarraPercentual'
import { Carregando, ErroCarregamento, Vazio } from '../../components/Estados'
import { GraficoColunas } from '../../components/GraficoColunas'
import { useGestaoUso } from '../../hooks/useGestao'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import type { UsoGestao } from '../../types'
import { formatarPercentual } from '../../utils/format'
import { Atualizando, CABECALHO, CartaoNumero, CELULA, Secao, SeletorPeriodo, TabelaRolavel } from './componentes'
import { dataIso, formatarNumero, NOMES_MODOS, usePeriodo } from './periodo'

function Cartoes({ uso }: { uso: UsoGestao }) {
  const c = uso.cartoes
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <CartaoNumero rotulo="Estudantes" valor={formatarNumero(c.estudantes)} detalhe={`+${formatarNumero(c.novos)} no período`} />
      <CartaoNumero rotulo="Ativos hoje" valor={formatarNumero(c.ativos_hoje)} />
      <CartaoNumero rotulo="Ativos em 7 dias" valor={formatarNumero(c.ativos_7_dias)} />
      <CartaoNumero rotulo="Ativos em 30 dias" valor={formatarNumero(c.ativos_30_dias)} />
      <CartaoNumero rotulo="Logins" valor={formatarNumero(c.logins)} detalhe="no período" />
      <CartaoNumero rotulo="Simulados gerados" valor={formatarNumero(c.gerados)} detalhe="no período" />
      <CartaoNumero rotulo="Simulados concluídos" valor={formatarNumero(c.concluidos)} detalhe="no período" />
      <CartaoNumero rotulo="Contas excluídas" valor={formatarNumero(c.contas_excluidas)} detalhe="no período" />
    </dl>
  )
}

function Graficos({ uso }: { uso: UsoGestao }) {
  const { series, granularidade } = uso
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <GraficoColunas titulo="Cadastros" pontos={series.cadastros} granularidade={granularidade} unidade="cadastros" />
      <GraficoColunas
        titulo="Usuários ativos"
        pontos={series.ativos}
        granularidade={granularidade}
        unidade="usuários ativos"
        media
      />
      <GraficoColunas titulo="Logins" pontos={series.logins} granularidade={granularidade} unidade="logins" />
      <GraficoColunas titulo="Simulados gerados" pontos={series.gerados} granularidade={granularidade} unidade="simulados" />
      <GraficoColunas
        titulo="Simulados concluídos"
        pontos={series.concluidos}
        granularidade={granularidade}
        unidade="simulados"
      />
    </div>
  )
}

function PorModo({ uso }: { uso: UsoGestao }) {
  return (
    <TabelaRolavel rotulo="Simulados por modo">
      <thead>
        <tr>
          <th scope="col" className={CABECALHO}>Modo</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Gerados</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Concluídos</th>
          <th scope="col" className={`${CABECALHO} text-right`}>Taxa de conclusão</th>
        </tr>
      </thead>
      <tbody>
        {uso.modos.map((m) => (
          <tr key={m.modo} className="border-t border-linha">
            <th scope="row" className={`${CELULA} font-normal`}>{NOMES_MODOS[m.modo]}</th>
            <td className={`${CELULA} text-right`}>{formatarNumero(m.gerados)}</td>
            <td className={`${CELULA} text-right`}>{m.concluidos === null ? '—' : formatarNumero(m.concluidos)}</td>
            <td className={`${CELULA} text-right`}>{m.taxa_conclusao === null ? '—' : formatarPercentual(m.taxa_conclusao)}</td>
          </tr>
        ))}
      </tbody>
    </TabelaRolavel>
  )
}

function Distribuicao({ uso }: { uso: UsoGestao }) {
  const total = uso.distribuicao.reduce((soma, f) => soma + f.estudantes, 0)
  return (
    <ul className="space-y-3">
      {uso.distribuicao.map((f) => {
        const percentual = total ? (f.estudantes / total) * 100 : 0
        return (
          <li key={f.faixa}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>
                {f.faixa} {f.faixa === '1' ? 'simulado' : 'simulados'}
              </span>
              <span className="tabular-nums text-tinta-suave">
                {formatarNumero(f.estudantes)} {f.estudantes === 1 ? 'estudante' : 'estudantes'} (
                {formatarPercentual(Math.round(percentual * 10) / 10)})
              </span>
            </div>
            <BarraPercentual percentual={percentual} fina />
          </li>
        )
      })}
    </ul>
  )
}

/** Aba Uso (CR-013, RF-031). */
export function UsoPage() {
  useTituloPagina('Gestão · Uso')
  const [periodo, setPeriodo] = usePeriodo()
  const consulta = useGestaoUso(periodo)
  const uso = consulta.data

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeletorPeriodo periodo={periodo} onMudar={setPeriodo} />
        {uso && (
          <p className="text-sm text-tinta-suave">
            De {dataIso(uso.inicio)} a {dataIso(uso.fim)}, {uso.granularidade === 'dia' ? 'por dia' : 'por semana'}
          </p>
        )}
      </div>
      <div className="mt-6">
        {consulta.isPending ? (
          <Carregando />
        ) : !uso ? (
          <ErroCarregamento mensagem="Não foi possível carregar os números." onTentar={() => void consulta.refetch()} />
        ) : (
          <Atualizando ativo={consulta.isPlaceholderData}>
            <Cartoes uso={uso} />
            <Graficos uso={uso} />
            <p className="mt-3 text-sm text-tinta-suave">
              Logins e usuários ativos passaram a ser contados em 06/10/2026; antes disso aparecem zerados. Os simulados
              concluídos antes dessa data vêm do histórico guardado nas contas.
            </p>
            <Secao
              titulo="Por modo"
              nota="O Treino não entra no histórico. A taxa pode passar de 100%: um simulado conta como concluído quando chega à conta."
            >
              <PorModo uso={uso} />
            </Secao>
            <Secao titulo="Simulados por estudante" nota="Quantos simulados cada conta tem no histórico hoje (até 50).">
              <Distribuicao uso={uso} />
            </Secao>
            <Secao titulo="Provas mais feitas na Prova de um ano">
              {uso.provas_ano.length === 0 ? (
                <Vazio>Nenhuma Prova de um ano concluída no período.</Vazio>
              ) : (
                <ol className="space-y-1">
                  {uso.provas_ano.map((p) => (
                    <li key={p.codigo} className="flex justify-between gap-4 border-b border-linha py-1.5 text-sm">
                      <span>{p.rotulo}</span>
                      <span className="tabular-nums text-tinta-suave">{formatarNumero(p.concluidos)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Secao>
          </Atualizando>
        )}
      </div>
    </>
  )
}
