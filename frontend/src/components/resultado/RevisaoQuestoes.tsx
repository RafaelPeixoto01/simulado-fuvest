import { useState } from 'react'

import { useQuestoes } from '../../hooks/useQuestoes'
import { NOMES_DISCIPLINAS, type Disciplina, type ItemCorrigido } from '../../types'
import { Carregando, ErroCarregamento, Vazio } from '../Estados'
import { BOTAO_SECUNDARIO } from '../estilos'
import { QuestaoView } from '../questao/QuestaoView'

type Filtro = 'todas' | 'erradas' | 'branco'
const POR_PAGINA = 10 // não renderizar 90 questões com figuras de uma vez

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'erradas', rotulo: 'Erradas' },
  { valor: 'branco', rotulo: 'Em branco' },
]

export function RevisaoQuestoes({ questaoIds, itens }: { questaoIds: string[]; itens: ItemCorrigido[] }) {
  const questoes = useQuestoes(questaoIds)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [disciplina, setDisciplina] = useState<Disciplina | ''>('')
  const [pagina, setPagina] = useState(0)

  const porId = new Map(itens.map((i) => [i.questao_id, i]))
  const disciplinas = [...new Set(itens.map((i) => i.disciplina))]
  const visiveis = questaoIds
    .map((id, indice) => ({ id, indice, item: porId.get(id) }))
    .filter(({ item }) => {
      if (disciplina && item?.disciplina !== disciplina) return false
      if (filtro === 'erradas') return !!item && !item.acertou && item.resposta !== null
      if (filtro === 'branco') return !!item && item.resposta === null && !item.anulada
      return true
    })
  const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA))
  const atual = Math.min(pagina, paginas - 1)
  const trecho = visiveis.slice(atual * POR_PAGINA, (atual + 1) * POR_PAGINA)

  return (
    <section>
      <h2 className="text-xl font-bold">Revisão das questões</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <fieldset className="flex overflow-hidden rounded-md border border-linha">
          <legend className="sr-only">Mostrar</legend>
          {FILTROS.map((f) => (
            <label key={f.valor} className="cursor-pointer border-r border-linha px-3 py-1.5 text-sm last:border-r-0 has-checked:bg-caneta has-checked:text-papel has-focus-visible:outline-2 has-focus-visible:outline-caneta">
              <input
                type="radio"
                name="filtro-revisao"
                className="sr-only"
                checked={filtro === f.valor}
                onChange={() => {
                  setFiltro(f.valor)
                  setPagina(0)
                }}
              />
              {f.rotulo}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          Disciplina
          <select
            value={disciplina}
            onChange={(e) => {
              setDisciplina(e.target.value as Disciplina | '')
              setPagina(0)
            }}
            className="rounded-md border border-linha bg-papel px-2 py-1"
          >
            <option value="">Todas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{NOMES_DISCIPLINAS[d]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-12">
        {questoes.isPending && <Carregando texto="Carregando as questões…" />}
        {questoes.isError && (
          <ErroCarregamento mensagem="Não foi possível carregar as questões." onTentar={() => questoes.refetch()} />
        )}
        {questoes.data && trecho.length === 0 && <Vazio>Nenhuma questão com esse filtro.</Vazio>}
        {questoes.data &&
          trecho.map(({ id, indice, item }) => {
            const questao = questoes.data.questoes.find((q) => q.id === id)
            if (!questao || !item) {
              return (
                <p key={id} className="rounded-lg border border-dashed border-linha px-4 py-4 text-tinta-suave">
                  Questão {indice + 1}: removida da base.
                </p>
              )
            }
            return (
              <QuestaoView
                key={id}
                questao={questao}
                textoBase={questao.texto_base_id ? questoes.data.textos_base[questao.texto_base_id] : null}
                posicao={{ atual: indice + 1, total: questaoIds.length }}
                selecionada={item.resposta}
                onSelecionar={() => {}}
                correcao={{ correta: item.correta, anulada: item.anulada }}
              />
            )
          })}
      </div>

      {paginas > 1 && (
        <nav aria-label="Páginas da revisão" className="mt-8 flex items-center gap-3">
          <button type="button" className={BOTAO_SECUNDARIO} disabled={atual === 0} onClick={() => setPagina(atual - 1)}>
            Página anterior
          </button>
          <span className="text-sm text-tinta-suave">
            Página {atual + 1} de {paginas}
          </span>
          <button type="button" className={BOTAO_SECUNDARIO} disabled={atual === paginas - 1} onClick={() => setPagina(atual + 1)}>
            Próxima página
          </button>
        </nav>
      )}
    </section>
  )
}
