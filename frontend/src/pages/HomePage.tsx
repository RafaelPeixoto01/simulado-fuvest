import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ErroCarregamento, Carregando, Vazio } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { useSimulado } from '../simulado/useSimulado'
import type { Catalogo } from '../types'

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

function SimuladoEmAndamento() {
  const { simulado, despachar } = useSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()
  if (!simulado) return null
  const respondidas = Object.keys(simulado.respostas).length
  return (
    <section
      aria-label="Simulado em andamento"
      className="mb-8 flex flex-col gap-3 rounded-lg border border-caneta/30 bg-caneta-clara px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Você tem um simulado em andamento: <strong>{simulado.descricao}</strong>, {respondidas} de{' '}
        {simulado.questaoIds.length} respondidas.
      </p>
      <div className="flex shrink-0 gap-2">
        <Link to="/simulado" className={BOTAO_PRIMARIO}>
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
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {catalogo.provas.map((p) => (
            <li key={p.ano}>
              <a
                href={p.url_prova}
                target="_blank"
                rel="noreferrer"
                aria-label={`Prova ${p.ano} (PDF oficial)`}
                className="text-caneta underline underline-offset-2"
              >
                {p.ano}
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
  const catalogo = useCatalogo()
  const { iniciar, iniciando, erro } = useIniciarSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()

  const anos = catalogo.data?.provas.map((p) => p.ano) ?? []
  const periodo = anos.length > 1 ? ` (${Math.min(...anos)} a ${Math.max(...anos)})` : anos.length ? ` (${anos[0]})` : ''

  return (
    <div>
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
        <SimuladoEmAndamento />
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
                      className={BOTAO_PRIMARIO}
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
