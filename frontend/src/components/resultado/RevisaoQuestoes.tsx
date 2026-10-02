import { useEffect, useId, useRef } from 'react'

import { useQuestoes } from '../../hooks/useQuestoes'
import { NOMES_DISCIPLINAS, type Disciplina, type ItemCorrigido } from '../../types'
import { Carregando, ErroCarregamento, Vazio } from '../Estados'
import { BARRA_NEUTRO, BOTAO_BARRA_FORMA } from '../estilos'
import { Icone } from '../Icone'
import { QuestaoView } from '../questao/QuestaoView'
import { TituloQuestao } from '../questao/TituloQuestao'
import { filtrarRevisao, situacao, type EstadoRevisao, type FiltroRevisao, type Situacao } from './revisao'

const FILTROS: { valor: FiltroRevisao; rotulo: string; nome: string }[] = [
  { valor: 'todas', rotulo: 'Todas', nome: 'questões' },
  { valor: 'erradas', rotulo: 'Erradas', nome: 'erradas' },
  { valor: 'branco', rotulo: 'Em branco', nome: 'em branco' },
]

const COR_SELO: Record<Situacao, string> = {
  acerto: 'bg-acerto-claro text-acerto',
  erro: 'bg-erro-claro text-erro',
  branco: 'border border-dashed border-borda-campo bg-papel text-tinta',
  anulada: 'bg-alerta-claro text-alerta',
  removida: 'border border-dashed border-linha bg-papel text-tinta-suave',
}

function textoSelo(item: ItemCorrigido | undefined): string {
  const s = situacao(item)
  if (s === 'removida' || !item) return 'Removida da base'
  if (s === 'anulada') return 'Anulada: ponto para todos'
  if (s === 'acerto') return `Você acertou: ${item.resposta}`
  if (s === 'branco') return `Em branco · correta ${item.correta}`
  return `Você marcou ${item.resposta} · correta ${item.correta}`
}

interface Props {
  questaoIds: string[]
  itens: ItemCorrigido[]
  estado: EstadoRevisao
  /** Troca de filtro (a página decide a questão aberta) */
  onFiltros: (filtro: FiltroRevisao, disciplina: Disciplina | '') => void
  /** Anterior/Próxima dentro da lista filtrada */
  onIr: (indice: number) => void
  /** Incrementado a cada troca pedida pelo estudante: rola até a revisão e foca o título (P1.1) */
  pedidoDeFoco: number
}

/** Revisão uma questão por vez (D6, CR-003): filtros, posição no filtro, selo do resultado e Anterior/Próxima. */
export function RevisaoQuestoes({ questaoIds, itens, estado, onFiltros, onIr, pedidoDeFoco }: Props) {
  const questoes = useQuestoes(questaoIds)
  const secao = useRef<HTMLElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (pedidoDeFoco === 0) return
    secao.current?.scrollIntoView?.({ block: 'start' })
    titulo.current?.focus({ preventScroll: true })
  }, [pedidoDeFoco])

  const porId = new Map(itens.map((i) => [i.questao_id, i]))
  const disciplinas = [...new Set(itens.map((i) => i.disciplina))]
  const lista = filtrarRevisao(questaoIds, porId, estado.filtro, estado.disciplina)
  const posicao = lista.indexOf(estado.indice)
  const id = questaoIds[estado.indice]
  const item = porId.get(id)
  const questao = questoes.data?.questoes.find((q) => q.id === id)
  const nomeFiltro = FILTROS.find((f) => f.valor === estado.filtro)!.nome

  const complemento = (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`rounded-full px-3 py-1 text-sm font-bold ${COR_SELO[situacao(item)]}`}>{textoSelo(item)}</span>
      <span className="text-sm tabular-nums text-tinta-suave">
        {posicao + 1} de {lista.length} {nomeFiltro}
      </span>
    </div>
  )

  return (
    <section ref={secao} aria-labelledby={idTitulo} className="scroll-mt-4">
      <h2 id={idTitulo} className="text-xl">
        Revisão das questões
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <fieldset className="flex overflow-hidden rounded-md border border-borda-campo">
          <legend className="sr-only">Mostrar</legend>
          {FILTROS.map((f) => (
            <label key={f.valor} className="cursor-pointer border-r border-linha px-3 py-1.5 text-sm last:border-r-0 has-checked:bg-caneta has-checked:text-fundo has-focus-visible:outline-2 has-focus-visible:outline-foco">
              <input
                type="radio"
                name="filtro-revisao"
                className="sr-only"
                checked={estado.filtro === f.valor}
                onChange={() => onFiltros(f.valor, estado.disciplina)}
              />
              {f.rotulo}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          Disciplina
          <select
            value={estado.disciplina}
            onChange={(e) => onFiltros(estado.filtro, e.target.value as Disciplina | '')}
            className="rounded-md border border-borda-campo bg-papel px-2 py-1"
          >
            <option value="">Todas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{NOMES_DISCIPLINAS[d]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {questoes.isPending && <Carregando texto="Carregando as questões…" />}
        {questoes.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as questões." onTentar={() => questoes.refetch()} />
        )}
        {questoes.data && lista.length === 0 && <Vazio>Nenhuma questão com esse filtro.</Vazio>}
        {questoes.data && lista.length > 0 && (
          <>
            {questao && item ? (
              <QuestaoView
                key={id}
                questao={questao}
                textoBase={questao.texto_base_id ? questoes.data.textos_base[questao.texto_base_id] : null}
                posicao={{ atual: estado.indice + 1, total: questaoIds.length }}
                selecionada={item.resposta}
                onSelecionar={() => {}}
                correcao={{ correta: item.correta, anulada: item.anulada }}
                refTitulo={titulo}
                nivelTitulo={3}
                complemento={complemento}
              />
            ) : (
              <div className="max-w-[68ch] rounded-lg border border-dashed border-linha px-4 py-4">
                <TituloQuestao atual={estado.indice + 1} total={questaoIds.length} nivel={3} refTitulo={titulo} />
                {complemento}
                <p className="mt-2 text-tinta-suave">
                  {item
                    ? 'O conteúdo desta questão não está mais disponível na base; a correção acima continua valendo.'
                    : 'Esta questão foi removida da base e não entrou na nota.'}
                </p>
              </div>
            )}
            <nav aria-label="Navegar na revisão" className="mt-6 flex max-w-[68ch] gap-2">
              <button
                type="button"
                aria-label="Questão anterior"
                disabled={posicao <= 0}
                onClick={() => onIr(lista[posicao - 1])}
                className={`${BOTAO_BARRA_FORMA} ${BARRA_NEUTRO} flex-1 pr-4 pl-2.5 sm:flex-none`}
              >
                <Icone>
                  <path d="M15 6l-6 6 6 6" />
                </Icone>
                Anterior
              </button>
              <button
                type="button"
                aria-label="Próxima questão"
                disabled={posicao >= lista.length - 1}
                onClick={() => onIr(lista[posicao + 1])}
                className={`${BOTAO_BARRA_FORMA} ${BARRA_NEUTRO} flex-1 pr-2.5 pl-4 sm:flex-none`}
              >
                Próxima
                <Icone>
                  <path d="M9 6l6 6-6 6" />
                </Icone>
              </button>
            </nav>
          </>
        )}
      </div>
    </section>
  )
}
