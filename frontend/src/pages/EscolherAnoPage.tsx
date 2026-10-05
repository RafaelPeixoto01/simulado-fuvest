import { useId } from 'react'
import { Link } from 'react-router-dom'

import { Carregando, ErroCarregamento, Vazio } from '../components/Estados'
import { BOTAO_PRIMARIO, LINK } from '../components/estilos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { useTituloPagina } from '../hooks/useTituloPagina'
import type { ProvaCatalogo } from '../types'

/** "a prova de 2024" / "o Simulado FUVEST 2027 · 1ª edição": nomes acessíveis do link e do botão. */
function nomeDaProva(p: ProvaCatalogo): { pdf: string; fazer: string } {
  return p.tipo === 'simulado'
    ? { pdf: `PDF oficial do ${p.rotulo}`, fazer: `Fazer o ${p.rotulo}` }
    : { pdf: `PDF oficial de ${p.ano}`, fazer: `Fazer a prova de ${p.ano}` }
}

function ListaProvas({
  titulo,
  explicacao,
  provas,
  desabilitado,
  aoFazer,
}: {
  titulo: string
  explicacao?: string
  provas: ProvaCatalogo[]
  desabilitado: boolean
  aoFazer: (p: ProvaCatalogo) => void
}) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="mt-8 first:mt-0">
      <h2 id={idTitulo} className="text-xl">
        {titulo}
      </h2>
      {explicacao && <p className="mt-1 text-sm text-tinta-suave">{explicacao}</p>}
      <ul className="mt-3 divide-y divide-linha border-y border-linha">
        {provas.map((p) => {
          const nome = nomeDaProva(p)
          return (
            <li key={p.codigo} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <h3 className="font-titulo text-lg font-semibold">{p.rotulo}</h3>
                <p className="text-sm text-tinta-suave">
                  {p.total_questoes} questões ·{' '}
                  <a
                    href={p.url_prova}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={nome.pdf}
                    className="underline underline-offset-2 hover:text-tinta"
                  >
                    PDF oficial
                  </a>
                </p>
              </div>
              <button
                type="button"
                className={BOTAO_PRIMARIO}
                disabled={desabilitado}
                aria-label={nome.fazer}
                onClick={() => aoFazer(p)}
              >
                {p.tipo === 'simulado' ? 'Fazer este simulado' : 'Fazer esta prova'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function EscolherAnoPage() {
  useTituloPagina('Prova de um ano')
  const catalogo = useCatalogo()
  const { iniciar, iniciando, erro } = useIniciarSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()

  const provas = catalogo.data?.provas ?? []
  const vestibulares = provas.filter((p) => p.tipo === 'vestibular')
  // Simulados oficiais da FUVEST (CR-011, D1): inteiros, com o total deles (80 no formato de 2027)
  const simulados = provas.filter((p) => p.tipo === 'simulado')
  const aoFazer = (p: ProvaCatalogo) => comConfirmacao(() => iniciar({ modo: 'ano', prova: p.codigo }, p.rotulo))

  return (
    <div className="max-w-2xl">
      <Link to="/" className={`${LINK} text-sm`}>Voltar ao início</Link>
      <h1 className="mt-3 text-2xl sm:text-3xl">Prova de um ano</h1>
      <p className="mt-2 text-tinta-suave">
        A prova original, na ordem em que caiu, com todas as questões e 5 horas. Questões anuladas pela FUVEST contam
        como acerto.
      </p>

      <div className="mt-6">
        {catalogo.isPending && <Carregando />}
        {catalogo.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />
        )}
        {erro && <ErroCarregamento mensagem={erro.message} />}
        {catalogo.data && provas.length === 0 && <Vazio>Ainda não há provas publicadas.</Vazio>}
        {vestibulares.length > 0 && (
          <ListaProvas titulo="Provas da FUVEST" provas={vestibulares} desabilitado={iniciando} aoFazer={aoFazer} />
        )}
        {simulados.length > 0 && (
          <ListaProvas
            titulo="Simulados oficiais da FUVEST"
            explicacao="Aplicados pela própria FUVEST no formato novo da 1ª fase, com 80 questões."
            provas={simulados}
            desabilitado={iniciando}
            aoFazer={aoFazer}
          />
        )}
      </div>
      {dialogo}
    </div>
  )
}
