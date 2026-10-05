import { useInfiniteQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Carregando, ErroCarregamento } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { QuestaoView } from '../components/questao/QuestaoView'
import { useAtalhos } from '../hooks/useAtalhos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { api, type ApiError } from '../services/api'
import type { Catalogo, Disciplina, ItemCorrigido, Letra, TextoBase } from '../types'
import { anosDasProvas } from '../utils/formatoProva'

const BUSCAR_QUANDO_FALTAM = 3

interface Filtros {
  disciplinas: Disciplina[]
  anoInicio: number
  anoFim: number
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

function Configuracao({ catalogo, onComecar }: { catalogo: Catalogo; onComecar: (f: Filtros) => void }) {
  const anos = anosDasProvas(catalogo.provas)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [anoInicio, setAnoInicio] = useState(anos[0])
  const [anoFim, setAnoFim] = useState(anos[anos.length - 1])
  const [aviso, setAviso] = useState<string | null>(null)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (anoInicio > anoFim) return setAviso('O ano inicial não pode ser depois do final.')
    onComecar({ disciplinas, anoInicio, anoFim })
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-6" noValidate>
      <fieldset>
        <legend className="font-bold">Disciplinas</legend>
        <p className="text-sm text-tinta-suave">Sem nenhuma marcada, o treino usa todas.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {catalogo.disciplinas.map((d) => (
            <label key={d.slug} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-linha bg-papel px-3 py-2 has-checked:border-caneta has-checked:bg-caneta-clara">
              <input
                type="checkbox"
                className="size-4 accent-caneta"
                checked={disciplinas.includes(d.slug)}
                onChange={() =>
                  setDisciplinas((atual) => (atual.includes(d.slug) ? atual.filter((x) => x !== d.slug) : [...atual, d.slug]))
                }
              />
              {d.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-bold">Anos</legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            De
            <select value={anoInicio} onChange={(e) => setAnoInicio(Number(e.target.value))} className="rounded-md border border-borda-campo bg-papel px-2 py-1.5">
              {anos.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            até
            <select value={anoFim} onChange={(e) => setAnoFim(Number(e.target.value))} className="rounded-md border border-borda-campo bg-papel px-2 py-1.5">
              {anos.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      {aviso && <p role="alert" className="text-erro">{aviso}</p>}
      <button type="submit" className={BOTAO_PRIMARIO}>Começar treino</button>
    </form>
  )
}

function Sessao({
  filtros,
  rodada,
  onMudarFiltros,
  onRecomecar,
}: {
  filtros: Filtros
  rodada: number
  onMudarFiltros: () => void
  onRecomecar: () => void
}) {
  // Lotes de 20 como páginas: o parâmetro de cada página é a lista de questões já vistas.
  // Lote vazio = acabaram as questões do filtro.
  const lotes = useInfiniteQuery({
    queryKey: ['treino', filtros, rodada], // rodada nova = recomeçar do zero
    initialPageParam: [] as string[],
    queryFn: ({ pageParam }) =>
      api.gerarSimulado({
        modo: 'treino',
        disciplinas: filtros.disciplinas,
        ano_inicio: filtros.anoInicio,
        ano_fim: filtros.anoFim,
        excluir: pageParam,
      }),
    getNextPageParam: (ultimo, todos) =>
      ultimo.questoes.length === 0 ? undefined : todos.flatMap((l) => l.questoes.map((q) => q.id)),
    staleTime: Infinity,
    gcTime: 0,
  })
  const [atual, setAtual] = useState(0)
  const [resposta, setResposta] = useState<Letra | null>(null)
  const [correcao, setCorrecao] = useState<ItemCorrigido | null>(null)
  const [corrigindo, setCorrigindo] = useState(false)
  const [erroCorrecao, setErroCorrecao] = useState<string | null>(null)
  const [placar, setPlacar] = useState({ acertos: 0, respondidas: 0 })

  const paginas = lotes.data?.pages ?? []
  const fila = paginas.flatMap((l) => l.questoes)
  const textosBase: Record<string, TextoBase> = Object.assign({}, ...paginas.map((l) => l.textos_base))
  const questao = fila[atual]
  const fim = atual >= fila.length && lotes.isSuccess && !lotes.hasNextPage
  const faltamCarregar = atual >= fila.length && lotes.hasNextPage && !lotes.isFetching

  const responder = async (letra: Letra) => {
    if (!questao || correcao || corrigindo) return
    setResposta(letra)
    setCorrigindo(true)
    setErroCorrecao(null)
    try {
      const [item] = (await api.corrigir([{ questao_id: questao.id, resposta: letra }])).itens
      setCorrecao(item)
      setPlacar((p) => ({ acertos: p.acertos + (item.acertou ? 1 : 0), respondidas: p.respondidas + 1 }))
    } catch (e) {
      setResposta(null)
      setErroCorrecao((e as ApiError).message)
    } finally {
      setCorrigindo(false)
    }
  }

  const avancar = () => {
    const proximo = atual + 1
    setAtual(proximo)
    setResposta(null)
    setCorrecao(null)
    if (lotes.hasNextPage && !lotes.isFetchingNextPage && fila.length - (proximo + 1) <= BUSCAR_QUANDO_FALTAM) {
      void lotes.fetchNextPage()
    }
  }

  const recomecar = onRecomecar
  const erro = erroCorrecao ?? (lotes.isError ? lotes.error.message : null)

  useAtalhos({ responder: (l) => void responder(l), proxima: () => questao && avancar() })

  const feedback =
    correcao &&
    (correcao.anulada ? null : correcao.acertou ? 'Você acertou.' : `Resposta correta: ${correcao.correta}.`)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-3">
        <p className="font-semibold tabular-nums">
          {plural(placar.acertos, 'acerto', 'acertos')} em {plural(placar.respondidas, 'respondida', 'respondidas')}
        </p>
        <button type="button" className={`${LINK} text-sm`} onClick={onMudarFiltros}>
          Mudar filtros
        </button>
      </div>

      {erro && <ErroCarregamento mensagem={erro} onTentar={() => void (lotes.isError ? lotes.refetch() : setErroCorrecao(null))} />}
      {!questao && !fim && lotes.isFetching && <Carregando texto="Buscando questões…" />}
      {faltamCarregar && (
        <button type="button" className={BOTAO_SECUNDARIO} onClick={() => void lotes.fetchNextPage()}>
          Buscar mais questões
        </button>
      )}
      {fim && (
        <div className="max-w-[68ch] rounded-lg border border-dashed border-linha px-4 py-6">
          <p className="font-semibold">Você já viu todas as questões deste filtro.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={BOTAO_PRIMARIO} onClick={recomecar}>Recomeçar</button>
            <button type="button" className={BOTAO_SECUNDARIO} onClick={onMudarFiltros}>Mudar filtros</button>
          </div>
        </div>
      )}
      {questao && (
        <>
          <QuestaoView
            questao={questao}
            textoBase={questao.texto_base_id ? textosBase[questao.texto_base_id] : null}
            selecionada={resposta}
            onSelecionar={(l) => void responder(l)}
            correcao={correcao ? { correta: correcao.correta, anulada: correcao.anulada } : null}
          />
          <div className="mt-6 flex max-w-[68ch] flex-wrap items-center justify-between gap-3 border-t border-linha pt-4">
            <p role="status" className={`font-semibold ${correcao?.acertou ? 'text-acerto' : 'text-erro'}`}>
              {corrigindo ? 'Corrigindo…' : feedback}
            </p>
            <button
              type="button"
              className={correcao ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}
              onClick={avancar}
              disabled={corrigindo}
              aria-label={correcao ? 'Próxima questão' : 'Pular questão'}
            >
              {correcao ? 'Próxima' : 'Pular'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function TreinoPage() {
  useTituloPagina('Treino por questão')
  const catalogo = useCatalogo()
  const [filtros, setFiltros] = useState<Filtros | null>(null)
  const [sessao, setSessao] = useState(0) // nova sessão a cada início

  return (
    <div className="max-w-3xl">
      <Link to="/" className={`${LINK} text-sm`}>Voltar ao início</Link>
      <h1 className="mt-3 text-2xl sm:text-3xl">Treino por questão</h1>
      <p className="mt-2 text-tinta-suave">Uma questão por vez, sem cronômetro, com a resposta na hora. O treino não vai para o histórico.</p>
      {catalogo.isPending && <Carregando />}
      {catalogo.isError && <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />}
      {catalogo.data && !filtros && (
        <Configuracao
          catalogo={catalogo.data}
          onComecar={(f) => {
            setFiltros(f)
            setSessao((s) => s + 1)
          }}
        />
      )}
      {filtros && (
        <div className="mt-6">
          <Sessao
            key={sessao}
            rodada={sessao}
            filtros={filtros}
            onMudarFiltros={() => setFiltros(null)}
            onRecomecar={() => setSessao((s) => s + 1)}
          />
        </div>
      )}
    </div>
  )
}
