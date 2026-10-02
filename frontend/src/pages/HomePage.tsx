import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BolinhaLetra } from '../components/BolinhaLetra'
import { CirculoCaneta } from '../components/CirculoCaneta'
import { ErroCarregamento, Carregando, Vazio } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, LINK } from '../components/estilos'
import { Icone } from '../components/Icone'
import { MiniFolha } from '../components/inicio/MiniFolha'
import { UltimoSimulado } from '../components/inicio/UltimoSimulado'
import { MarcasSincronismo } from '../components/MarcasSincronismo'
import { useAgora } from '../hooks/useAgora'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { useSessao } from '../hooks/useSessao'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { useSimulado } from '../simulado/useSimulado'
import type { Catalogo } from '../types'
import { primeiroNomeOuNada } from '../utils/format'
import { formatarRestante, restanteMs } from '../utils/tempo'

/** Prova completa em destaque (CR-008, I6.3), com as marcas de sincronismo da folha (I5). Desde o
 *  CR-009 (E4): sobretítulo, etiquetas e, a partir de 640 px, a miniatura da folha à direita. */
function ProvaCompleta({ descricao, disciplinas, acao }: { descricao: string; disciplinas: number; acao: ReactNode }) {
  const idTitulo = useId()
  const etiquetas = ['90 questões', '5 horas']
  if (disciplinas > 0) etiquetas.push(`${disciplinas} ${disciplinas === 1 ? 'disciplina' : 'disciplinas'}`)
  return (
    <section
      aria-labelledby={idTitulo}
      className={`${CARTAO} relative py-6 pr-5 pl-11 sm:grid sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center sm:gap-x-7 sm:py-7 sm:pr-8 sm:pl-14`}
    >
      <MarcasSincronismo
        posicao="left-3.5 top-6 bottom-6 sm:left-[1.125rem] sm:top-7 sm:bottom-7"
        tamanho="h-1 w-3 sm:h-[5px] sm:w-3.5"
      />
      <div>
        <div className="flex items-center gap-2.5">
          <BolinhaLetra letra="A" className="size-[30px] text-[0.8125rem]" />
          {/* Caixa alta só no CSS: o leitor de tela lê a frase, e não letra por letra */}
          <p className="text-xs font-bold tracking-[0.1em] text-optico-texto uppercase sm:text-[0.78125rem]">
            A mais próxima da prova real
          </p>
        </div>
        <h2 id={idTitulo} className="mt-3 text-2xl sm:text-[2rem] sm:leading-tight">
          Prova completa
        </h2>
        <p className="mt-1.5 text-tinta-suave sm:text-[1.0625rem]">{descricao}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5 sm:mt-3.5 sm:gap-2">
          {etiquetas.map((etiqueta) => (
            <li
              key={etiqueta}
              className="rounded-full border border-linha bg-fundo px-2.5 py-0.5 text-[0.84375rem] sm:px-3 sm:py-1 sm:text-sm"
            >
              {etiqueta}
            </li>
          ))}
        </ul>
        <div className="mt-5">{acao}</div>
      </div>
      <MiniFolha className="hidden sm:block" />
    </section>
  )
}

// Abaixo de 640 px (CR-009, E6), o link deixa de parecer botão: o ::after cobre o cartão (relative),
// a seta toma o lugar do texto, e o anel de foco vai para o ::after, em volta do cartão
const ACAO_MODO_CELULAR =
  'max-sm:border-0 max-sm:bg-transparent max-sm:p-0 after:absolute after:inset-0 after:rounded-2xl sm:after:hidden max-sm:focus-visible:outline-none max-sm:focus-visible:after:outline-3 max-sm:focus-visible:after:outline-offset-2 max-sm:focus-visible:after:outline-foco'

/** Os outros três modos em cartões menores (CR-008, I6.3), com as bolinhas B–D (I5); no celular,
 *  linhas compactas inteiras clicáveis (CR-009, E6). O nome do link continua sendo a ação. */
function Modo({ letra, titulo, descricao, para, acao }: { letra: string; titulo: string; descricao: string; para: string; acao: string }) {
  return (
    <li className={`${CARTAO} relative flex items-center gap-3 p-4 sm:flex-col sm:items-start sm:gap-0 sm:p-5`}>
      <BolinhaLetra letra={letra} className="size-[30px] text-[0.8125rem]" />
      <div className="min-w-0 flex-1 sm:flex sm:w-full sm:flex-col">
        <h2 className="text-[1.1875rem] max-sm:leading-snug sm:mt-3 sm:text-xl">{titulo}</h2>
        <p className="mt-0.5 text-[0.90625rem] text-tinta-suave sm:mt-1 sm:mb-4 sm:flex-1 sm:text-[0.9375rem]">
          {descricao}
        </p>
      </div>
      <Link to={para} className={`${BOTAO_SECUNDARIO} ${ACAO_MODO_CELULAR}`}>
        <span className="max-sm:sr-only">{acao}</span>
        <Icone className="size-5 text-tinta-suave sm:hidden">
          <path d="M9 6l6 6-6 6" />
        </Icone>
      </Link>
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
    <section aria-labelledby={idTitulo} className="mb-8 max-w-2xl rounded-2xl border border-caneta bg-caneta-clara p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-caneta-escura">
        <span aria-hidden="true" className="size-2 rounded-full bg-caneta" />
        Simulado em andamento
      </p>
      <h2 id={idTitulo} className="mt-1 text-xl">
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
      <UltimoSimulado />
      <section>
        <h2>Provas na base</h2>
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
        <h2>Questões por disciplina</h2>
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
  const { data: sessao } = useSessao()
  // Saudação (CR-008, I6.1): só com uma conta que tenha nome; nunca "Olá, Conta."
  const nome = primeiroNomeOuNada(sessao?.usuario?.nome)

  const anos = catalogo.data?.provas.map((p) => p.ano) ?? []
  const periodo = anos.length > 1 ? ` (${Math.min(...anos)} a ${Math.max(...anos)})` : anos.length ? ` (${anos[0]})` : ''

  return (
    <div>
      <SimuladoEmAndamento />
      {nome && <p className="font-titulo text-lg font-medium text-optico-texto italic sm:text-[1.375rem]">Olá, {nome}.</p>}
      <h1 className={`max-w-2xl text-3xl leading-tight sm:text-4xl ${nome ? 'mt-1 sm:mt-1.5' : ''}`}>
        Treine com questões <CirculoCaneta>reais</CirculoCaneta> da 1ª fase da FUVEST
      </h1>
      {catalogo.data && catalogo.data.provas.length > 0 && (
        <p className="mt-3 max-w-2xl text-lg text-tinta-suave">
          {catalogo.data.total_questoes} questões de {catalogo.data.provas.length}{' '}
          {catalogo.data.provas.length === 1 ? 'prova' : 'provas'}
          {periodo}. O simulado em andamento fica salvo neste navegador.
        </p>
      )}

      <div className="mt-8">
        {catalogo.isPending && <Carregando texto="Carregando as provas…" />}
        {catalogo.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />
        )}
        {catalogo.data && catalogo.data.provas.length === 0 && <Vazio>Ainda não há provas publicadas.</Vazio>}
        {catalogo.data && catalogo.data.provas.length > 0 && (
          // Lateral de 340 px a partir de 1280 px (CR-009, E7); entre 1024 e 1279, 256 px: com 340, os cartões
          // dos modos ficavam com 188 px e "Montar simulado" quebrava em duas linhas
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              {erro && <ErroCarregamento mensagem={erro.message} />}
              <ProvaCompleta
                descricao={
                  catalogo.data.completa_disponivel
                    ? '90 questões na distribuição da prova real, com 5 horas.'
                    : '90 questões com 5 horas. Disponível quando a base tiver 90 questões válidas.'
                }
                disciplinas={Object.values(catalogo.data.distribuicao_completa).filter((n) => (n ?? 0) > 0).length}
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
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-4">
                <Modo
                  letra="B"
                  titulo="Prova de um ano"
                  descricao="Refaça a prova original de um ano, na ordem em que caiu, com 5 horas."
                  para="/novo/ano"
                  acao="Escolher o ano"
                />
                <Modo
                  letra="C"
                  titulo="Personalizado"
                  descricao="Escolha disciplinas, anos e quantidade de questões."
                  para="/novo/personalizado"
                  acao="Montar simulado"
                />
                <Modo
                  letra="D"
                  titulo="Treino por questão"
                  descricao="Uma questão por vez, sem cronômetro, com a resposta na hora."
                  para="/treino"
                  acao="Treinar"
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
