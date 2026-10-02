import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CortesEmLinha } from '../components/notasCorte/ComparacaoCorte'
import { Carregando, ErroCarregamento, Vazio } from '../components/Estados'
import { BOTAO_PEQUENO, CARTAO, LINK } from '../components/estilos'
import { useCarreiraAlvo, useNotasCorte } from '../hooks/useNotasCorte'
import { useSessao } from '../hooks/useSessao'
import { useTituloPagina } from '../hooks/useTituloPagina'
import type { ApiError } from '../services/api'
import type { CarreiraAlvo, CarreiraCorte } from '../types'
import { filtrarCarreiras, MODALIDADES } from '../utils/notasCorte'

function anoDaUrl(valor: string | null): number | null {
  return valor && /^\d{4}$/.test(valor) ? Number(valor) : null
}

// A API só aceita anos de 1977 a 2100 (422 fora disso): fora da faixa, pede o mais recente e avisa
const naFaixaDaApi = (ano: number) => ano >= 1977 && ano <= 2100

function Corte({ valor }: { valor: number | null }) {
  return valor === null ? <abbr title="sem convocados">—</abbr> : <>{valor}</>
}

function CartaoAlvo({
  alvo,
  recente,
  removendo,
  onRemover,
}: {
  alvo: CarreiraAlvo
  recente: number | null
  removendo: boolean
  onRemover: () => void
}) {
  return (
    <section aria-labelledby="carreira-alvo-titulo" className={`${CARTAO} mt-6 p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="carreira-alvo-titulo" className="text-lg">
            Sua carreira-alvo
          </h2>
          {alvo.carreira ? (
            <>
              <p className="mt-1 font-semibold">
                {alvo.carreira.nome} <span className="font-normal text-tinta-suave">· FUVEST {alvo.ano}</span>
              </p>
              <p className="mt-1 text-sm">
                Corte: <CortesEmLinha cortes={alvo.carreira.cortes} />
              </p>
            </>
          ) : (
            <p className="mt-1">Sua carreira-alvo não está mais na lista. Escolha outra.</p>
          )}
        </div>
        <button type="button" className={BOTAO_PEQUENO} disabled={removendo} onClick={onRemover}>
          Remover
        </button>
      </div>
      {recente !== null && alvo.ano < recente && (
        <p className="mt-3 text-sm text-alerta">
          Sua carreira-alvo é da lista de {alvo.ano}. Escolha de novo na lista de {recente}: os códigos e os nomes das
          carreiras mudam de um ano para outro.
        </p>
      )}
    </section>
  )
}

function LinhaCarreira({
  carreira,
  ehAlvo,
  comAcao,
  salvando,
  onDefinir,
}: {
  carreira: CarreiraCorte
  ehAlvo: boolean
  comAcao: boolean
  salvando: boolean
  onDefinir: () => void
}) {
  const numero = 'tabular-nums sm:table-cell sm:px-2 sm:py-3 sm:text-right'
  const rotulo = 'mr-1 text-xs text-tinta-suave sm:hidden'
  return (
    // Abaixo de 640 px cada carreira vira um bloco: o nome numa linha e os números na de baixo
    <tr
      className={`grid grid-cols-4 gap-x-2 gap-y-1 border-b border-linha px-2 py-3 sm:table-row sm:p-0 ${ehAlvo ? 'bg-caneta-clara' : ''}`}
    >
      <td className="col-span-4 font-medium sm:table-cell sm:py-3 sm:pr-3 sm:pl-2">{carreira.nome}</td>
      <td className={numero}>
        <span aria-hidden="true" className={rotulo}>
          Vagas
        </span>
        {carreira.vagas}
      </td>
      {MODALIDADES.map((m) => (
        <td key={m.chave} className={`${numero} font-semibold`}>
          <span aria-hidden="true" className={rotulo}>
            {m.sigla}
          </span>
          <Corte valor={carreira.cortes[m.chave]} />
        </td>
      ))}
      {comAcao && (
        <td className="col-span-4 mt-1 sm:mt-0 sm:table-cell sm:py-2 sm:pr-2 sm:text-right">
          {ehAlvo ? (
            <span className="text-sm font-semibold text-caneta">Sua carreira-alvo</span>
          ) : (
            <button
              type="button"
              className={BOTAO_PEQUENO}
              disabled={salvando}
              aria-label={`Definir ${carreira.nome} como carreira-alvo`}
              onClick={onDefinir}
            >
              Definir como alvo
            </button>
          )}
        </td>
      )}
    </tr>
  )
}

/** Notas de corte da 1ª fase por carreira (CR-010, RF-028) e escolha da carreira-alvo (RF-029). */
export function NotasCortePage() {
  useTituloPagina('Notas de corte')
  const [params, setParams] = useSearchParams()
  const pedido = anoDaUrl(params.get('ano'))
  const consulta = pedido !== null && naFaixaDaApi(pedido) ? pedido : null
  const { data, isPending, isError, isPlaceholderData, refetch } = useNotasCorte(consulta)
  const usuario = useSessao().data?.usuario ?? null
  const alvo = usuario?.carreira_alvo ?? null
  const { definir, remover } = useCarreiraAlvo()
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | null>(null)
  const carreiras = useMemo(() => filtrarCarreiras(data?.carreiras ?? [], busca), [data?.carreiras, busca])

  if (isPending) return <Carregando />
  if (isError || !data) {
    return <ErroCarregamento mensagem="Não foi possível carregar as notas de corte." onTentar={() => void refetch()} />
  }

  const ano = data.ano
  // Trocando de ano, a tabela anterior fica na tela até a nova chegar (keepPreviousData): o seletor
  // já mostra o ano escolhido e o aviso de "ano fora da base" espera a resposta
  const carregandoOutroAno = isPlaceholderData && consulta !== null
  // A carreira-alvo só sai da lista mais recente (RN-019); sem usuário (modo livre), não há conta onde guardar
  const comAcao = !!usuario && ano !== null && ano === data.recente
  const salvando = definir.isPending || remover.isPending
  const falhou = (erro: ApiError) =>
    setMensagem({
      erro: true,
      texto:
        // Saiu a lista de um ano novo depois que a página abriu: o hook já pediu a lista nova
        erro.codigo === 'carreira_invalida'
          ? `A lista de notas de corte mudou. ${erro.message}`
          : 'Não foi possível salvar a carreira-alvo. Tente novamente.',
    })

  const definirAlvo = (carreira: CarreiraCorte) => {
    setMensagem(null)
    definir.mutate(
      { ano: ano!, codigo: carreira.codigo },
      { onSuccess: () => setMensagem({ erro: false, texto: `${carreira.nome} agora é a sua carreira-alvo.` }), onError: falhou },
    )
  }
  const removerAlvo = () => {
    setMensagem(null)
    remover.mutate(undefined, {
      onSuccess: () => setMensagem({ erro: false, texto: 'Carreira-alvo removida.' }),
      onError: falhou,
    })
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl sm:text-3xl">Notas de corte</h1>
      <p className="mt-2 text-tinta-suave">
        1ª fase da FUVEST: a menor nota entre os convocados para a 2ª fase, por carreira e modalidade.
      </p>

      {ano === null ? (
        <div className="mt-6">
          <Vazio>As notas de corte ainda não estão disponíveis.</Vazio>
        </div>
      ) : (
        <>
          {usuario &&
            (alvo ? (
              <CartaoAlvo alvo={alvo} recente={data.recente} removendo={salvando} onRemover={removerAlvo} />
            ) : (
              <p className="mt-6">Escolha uma carreira-alvo para comparar a nota dos seus simulados com o corte.</p>
            ))}
          {mensagem &&
            (mensagem.erro ? (
              <p role="alert" className="mt-3 text-erro">
                {mensagem.texto}
              </p>
            ) : (
              <p role="status" className="mt-3 text-acerto">
                {mensagem.texto}
              </p>
            ))}

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Ano
              <select
                value={carregandoOutroAno ? consulta : ano}
                onChange={(e) => setParams({ ano: e.target.value }, { replace: true })}
                className="rounded-md border border-borda-campo bg-papel px-3 py-2 text-base font-normal"
              >
                {data.anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold">
              Buscar carreira
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome ou código"
                className="w-full rounded-md border border-borda-campo bg-papel px-3 py-2 text-base font-normal"
              />
            </label>
          </div>
          {pedido !== null && pedido !== ano && !carregandoOutroAno && (
            <p className="mt-3 text-sm text-alerta">
              Não há notas de corte de {pedido} na base. Mostrando FUVEST {ano}.
            </p>
          )}
          <p aria-live="polite" className="mt-3 text-sm text-tinta-suave">
            {carreiras.length === 1 ? '1 carreira' : `${carreiras.length} carreiras`}
          </p>

          {carreiras.length === 0 ? (
            <p className="mt-3">Nenhuma carreira encontrada.</p>
          ) : (
            <table
              aria-busy={carregandoOutroAno}
              className={`mt-2 w-full border-collapse text-left ${carregandoOutroAno ? 'opacity-60' : ''}`}
            >
              <caption className="sr-only">Notas de corte FUVEST {ano}, por carreira</caption>
              <thead className="sr-only sm:not-sr-only">
                <tr className="border-b border-linha text-sm text-tinta-suave">
                  <th scope="col" className="py-2 pr-3 pl-2 font-semibold">
                    Carreira
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">
                    Vagas
                  </th>
                  {MODALIDADES.map((m) => (
                    <th key={m.chave} scope="col" className="px-2 py-2 text-right font-semibold">
                      <abbr title={m.nome} className="no-underline">
                        {m.sigla}
                      </abbr>
                    </th>
                  ))}
                  {comAcao && (
                    <th scope="col" className="py-2 pr-2">
                      <span className="sr-only">Carreira-alvo</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {carreiras.map((c) => (
                  <LinhaCarreira
                    key={c.codigo}
                    carreira={c}
                    ehAlvo={!!alvo && alvo.ano === ano && alvo.codigo === c.codigo}
                    comAcao={comAcao}
                    salvando={salvando}
                    onDefinir={() => definirAlvo(c)}
                  />
                ))}
              </tbody>
            </table>
          )}

          <section aria-labelledby="como-ler" className="mt-10 max-w-prose text-sm text-tinta-suave">
            <h2 id="como-ler" className="text-lg text-tinta">
              Como ler
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                Corte é a menor nota (de 0 a 90) entre os candidatos chamados para a 2ª fase naquela carreira e
                modalidade.
              </li>
              <li>
                Quem faz menos de 27 pontos (30% da prova) é eliminado; corte 27 quer dizer que todos os que atingiram o
                mínimo foram chamados.
              </li>
              <li>AC: ampla concorrência. EP: escola pública. PPI: escola pública, pretos, pardos e indígenas.</li>
              <li>
                É uma referência para a 1ª fase, não uma previsão de aprovação: a aprovação depende da 2ª fase.
              </li>
            </ul>
            {data.fonte && (
              <p className="mt-3">
                Fonte: FUVEST,{' '}
                <a className={LINK} href={data.fonte} target="_blank" rel="noreferrer">
                  Notas de Corte {ano} (PDF, abre em outra aba)
                </a>
                .
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
