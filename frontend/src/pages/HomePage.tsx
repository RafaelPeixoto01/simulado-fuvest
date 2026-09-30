import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ErroCarregamento, Carregando, Vazio } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { Icone } from '../components/Icone'
import { useAgora } from '../hooks/useAgora'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { useSimulado } from '../simulado/useSimulado'
import type { Catalogo } from '../types'
import { formatarRestante, restanteMs } from '../utils/tempo'

function Modo({ titulo, descricao, acao }: { titulo: string; descricao: ReactNode; acao: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div>
        <h2 className="text-lg font-bold">{titulo}</h2>
        <div className="mt-0.5 text-tinta-suave">{descricao}</div>
      </div>
      <div className="shrink-0">{acao}</div>
    </li>
  )
}

/** Banner no topo do início (P1.9, CR-003): o relógio continua correndo com a aba fechada (RN-009). */
function SimuladoEmAndamento() {
  const { simulado, despachar } = useSimulado()
  const agora = useAgora(Boolean(simulado), 30_000)
  const { comConfirmacao, dialogo } = useConfirmarDescarte()
  const idTitulo = useId()
  if (!simulado) return null

  const total = simulado.questaoIds.length
  const respondidas = simulado.questaoIds.filter((id) => simulado.respostas[id]).length
  const paraRevisar = simulado.questaoIds.filter((id) => simulado.marcadas.includes(id)).length
  const restante = restanteMs(simulado, agora)
  const tempo =
    restante === null ? null : restante === 0 ? (
      'O tempo acabou: ao continuar, o simulado é finalizado com as respostas marcadas.'
    ) : simulado.pausadoEm !== null ? (
      <>
        Pausado com <strong>{formatarRestante(restante)}</strong> restantes.
      </>
    ) : (
      <>
        Restam <strong>{formatarRestante(restante)}</strong>. O relógio continua correndo mesmo com a aba fechada.
      </>
    )

  return (
    <section aria-labelledby={idTitulo} className="mb-8 max-w-2xl rounded-xl border border-caneta/30 bg-caneta-clara p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-caneta-escura">
        <span aria-hidden="true" className="size-2 rounded-full bg-caneta" />
        Simulado em andamento
      </p>
      <h2 id={idTitulo} className="mt-1 text-xl font-bold">
        {simulado.descricao}
      </h2>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-papel">
        <div className="h-full rounded-full bg-caneta" style={{ width: `${(100 * respondidas) / total}%` }} />
      </div>
      <p className="mt-1.5 text-sm">
        {respondidas} de {total} respondidas
        {paraRevisar > 0 && ` · ${paraRevisar} para revisar`}
      </p>
      {tempo && (
        <p className="mt-3 flex items-start gap-2 leading-snug">
          <Icone className="mt-px size-5 text-alerta">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Icone>
          <span>{tempo}</span>
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Link to="/simulado" className={`${BOTAO_PRIMARIO} flex-1 sm:flex-none`}>
          Continuar simulado
        </Link>
        <button type="button" className={BOTAO_SECUNDARIO} onClick={() => comConfirmacao(() => despachar({ tipo: 'DESCARTAR' }))}>
          Descartar
        </button>
      </div>
      {dialogo}
    </section>
  )
}

function NaBase({ catalogo }: { catalogo: Catalogo }) {
  return (
    <aside className="space-y-6 lg:border-l lg:border-linha lg:pl-8">
      <section>
        <h2 className="font-bold">Provas na base</h2>
        <ul className="mt-2 flex flex-col gap-0.5">
          {catalogo.provas.map((p) => (
            <li key={p.ano}>
              <a
                href={p.url_prova}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 font-semibold text-caneta underline underline-offset-3 hover:text-caneta-escura"
              >
                FUVEST {p.ano} · PDF oficial
                <Icone className="size-4">
                  <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </Icone>
                {/* o espaço fica fora do span: o nome acessível descarta espaço no começo de um elemento */}
                {' '}
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Questões por disciplina</h2>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          {catalogo.disciplinas.map((d) => (
            <div key={d.slug} className="contents">
              <dt>{d.nome}</dt>
              <dd className="text-right tabular-nums text-tinta-suave">{d.total_questoes}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  )
}

export function HomePage() {
  useTituloPagina()
  const catalogo = useCatalogo()
  const { iniciar, iniciando, erro } = useIniciarSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()
  const { simulado } = useSimulado()

  const anos = catalogo.data?.provas.map((p) => p.ano) ?? []
  const periodo = anos.length > 1 ? ` (${Math.min(...anos)} a ${Math.max(...anos)})` : anos.length ? ` (${anos[0]})` : ''

  return (
    <div>
      <SimuladoEmAndamento />
      <h1 className="max-w-2xl text-3xl leading-tight font-bold sm:text-4xl">
        Treine com questões reais da 1ª fase da FUVEST
      </h1>
      {catalogo.data && catalogo.data.provas.length > 0 && (
        <p className="mt-3 max-w-2xl text-lg text-tinta-suave">
          {catalogo.data.total_questoes} questões de {catalogo.data.provas.length}{' '}
          {catalogo.data.provas.length === 1 ? 'prova' : 'provas'}
          {periodo}. Não precisa criar conta: o progresso fica salvo neste navegador.
        </p>
      )}

      <div className="mt-8">
        {catalogo.isPending && <Carregando texto="Carregando as provas…" />}
        {catalogo.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />
        )}
        {catalogo.data && catalogo.data.provas.length === 0 && <Vazio>Ainda não há provas publicadas.</Vazio>}
        {catalogo.data && catalogo.data.provas.length > 0 && (
          <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
            <div>
              {erro && <ErroCarregamento mensagem={erro.message} />}
              <ul className="divide-y divide-linha border-y border-linha">
                <Modo
                  titulo="Prova completa"
                  descricao={
                    catalogo.data.completa_disponivel
                      ? '90 questões na distribuição da prova real, com 5 horas.'
                      : '90 questões com 5 horas. Disponível quando a base tiver 90 questões válidas.'
                  }
                  acao={
                    <button
                      type="button"
                      className={simulado ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}
                      disabled={!catalogo.data.completa_disponivel || iniciando}
                      onClick={() => comConfirmacao(() => iniciar({ modo: 'completa' }, 'Prova completa'))}
                    >
                      Começar prova completa
                    </button>
                  }
                />
                <Modo
                  titulo="Prova de um ano"
                  descricao="Refaça a prova original de um ano, na ordem em que caiu, com 5 horas."
                  acao={<Link to="/novo/ano" className={BOTAO_SECUNDARIO}>Escolher o ano</Link>}
                />
                <Modo
                  titulo="Personalizado"
                  descricao="Escolha disciplinas, anos e quantidade de questões."
                  acao={<Link to="/novo/personalizado" className={BOTAO_SECUNDARIO}>Montar simulado</Link>}
                />
                <Modo
                  titulo="Treino por questão"
                  descricao="Uma questão por vez, sem cronômetro, com a resposta na hora."
                  acao={<Link to="/treino" className={BOTAO_SECUNDARIO}>Treinar</Link>}
                />
              </ul>
              <p className="mt-4 text-sm text-tinta-suave">
                Já fez algum simulado? Veja o <Link to="/historico" className={LINK}>histórico</Link>.
              </p>
            </div>
            <NaBase catalogo={catalogo.data} />
          </div>
        )}
      </div>
      {dialogo}
    </div>
  )
}
