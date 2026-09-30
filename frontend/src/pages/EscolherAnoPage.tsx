import { Link } from 'react-router-dom'

import { Carregando, ErroCarregamento, Vazio } from '../components/Estados'
import { BOTAO_PRIMARIO, LINK } from '../components/estilos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { useTituloPagina } from '../hooks/useTituloPagina'

export function EscolherAnoPage() {
  useTituloPagina('Prova de um ano')
  const catalogo = useCatalogo()
  const { iniciar, iniciando, erro } = useIniciarSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()

  return (
    <div className="max-w-2xl">
      <Link to="/" className={`${LINK} text-sm`}>Voltar ao início</Link>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Prova de um ano</h1>
      <p className="mt-2 text-tinta-suave">
        A prova original, na ordem em que caiu, com 5 horas. Questões anuladas pela FUVEST contam como acerto.
      </p>

      <div className="mt-6">
        {catalogo.isPending && <Carregando />}
        {catalogo.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />
        )}
        {erro && <ErroCarregamento mensagem={erro.message} />}
        {catalogo.data?.provas.length === 0 && <Vazio>Ainda não há provas publicadas.</Vazio>}
        {catalogo.data && catalogo.data.provas.length > 0 && (
          <ul className="divide-y divide-linha border-y border-linha">
            {catalogo.data.provas.map((p) => (
              <li key={p.ano} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <h2 className="text-lg font-bold">FUVEST {p.ano}</h2>
                  <a
                    href={p.url_prova}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`PDF oficial de ${p.ano}`}
                    className="text-sm text-tinta-suave underline underline-offset-2 hover:text-tinta"
                  >
                    PDF oficial da prova
                  </a>
                </div>
                <button
                  type="button"
                  className={BOTAO_PRIMARIO}
                  disabled={iniciando}
                  aria-label={`Fazer a prova de ${p.ano}`}
                  onClick={() => comConfirmacao(() => iniciar({ modo: 'ano', ano: p.ano }, `FUVEST ${p.ano}`))}
                >
                  Fazer esta prova
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialogo}
    </div>
  )
}
