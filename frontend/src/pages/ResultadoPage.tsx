import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { Carregando } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { DesempenhoDisciplinas } from '../components/resultado/DesempenhoDisciplinas'
import { FolhaCorrigida } from '../components/resultado/FolhaCorrigida'
import { ResumoResultado } from '../components/resultado/ResumoResultado'
import { abrirQuestao, REVISAO_INICIAL, trocarFiltros, type EstadoRevisao, type FiltroRevisao } from '../components/resultado/revisao'
import { RevisaoQuestoes } from '../components/resultado/RevisaoQuestoes'
import type { EstadoResultado } from '../hooks/useFinalizarSimulado'
import { useHistorico } from '../hooks/useHistorico'
import { useTituloPagina } from '../hooks/useTituloPagina'
import type { HistoricoEntry } from '../simulado/tipos'
import { useSimulado } from '../simulado/useSimulado'
import type { Disciplina } from '../types'

function Aviso({ children }: { children: string }) {
  return <p className="rounded-md bg-alerta-claro px-3 py-2 text-alerta">{children}</p>
}

function Resultado({ entrada, estado }: { entrada: HistoricoEntry; estado: EstadoResultado | null }) {
  // Questão aberta na revisão e filtros: a folha corrigida e a revisão compartilham (P1.7, D6)
  const [revisao, setRevisao] = useState<EstadoRevisao>(REVISAO_INICIAL)
  const [pedidoDeFoco, setPedidoDeFoco] = useState(0)
  const { questaoIds, resultado } = entrada
  const porId = useMemo(() => new Map(resultado.itens.map((i) => [i.questao_id, i])), [resultado.itens])

  // Navegar (folha, Anterior/Próxima) rola até a revisão e foca o título; trocar de filtro não,
  // para o foco continuar no filtro e ele poder ser operado pelo teclado
  const navegar = useCallback((proximo: (atual: EstadoRevisao) => EstadoRevisao) => {
    setRevisao(proximo)
    setPedidoDeFoco((n) => n + 1)
  }, [])
  const abrir = useCallback(
    (indice: number) => navegar((atual) => abrirQuestao(atual, indice, questaoIds, porId)),
    [navegar, questaoIds, porId],
  )
  const filtrar = useCallback(
    (filtro: FiltroRevisao, disciplina: Disciplina | '') =>
      setRevisao((atual) => trocarFiltros(atual, filtro, disciplina, questaoIds, porId)),
    [questaoIds, porId],
  )

  const ignoradas = resultado.ignoradas.length
  return (
    <div>
      <div className="space-y-3">
        {estado?.expirouFora && (
          <Aviso>O tempo acabou enquanto você estava fora; o simulado foi finalizado com as respostas marcadas.</Aviso>
        )}
        {estado?.naoSalvo && (
          <Aviso>Não foi possível salvar este resultado no navegador: ele não aparecerá no histórico.</Aviso>
        )}
        {ignoradas > 0 && (
          <Aviso>
            {ignoradas === 1
              ? '1 questão foi removida da base e não entrou na nota.'
              : `${ignoradas} questões foram removidas da base e não entraram na nota.`}
          </Aviso>
        )}
      </div>

      <div className="mt-4">
        <ResumoResultado entrada={entrada} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/" className={BOTAO_PRIMARIO}>Novo simulado</Link>
          <Link to="/historico" className={BOTAO_SECUNDARIO}>Ver histórico</Link>
        </div>
      </div>

      {/* P1.7: "Por disciplina", a folha corrigida (no celular) e a revisão, nessa ordem;
          no desktop, a folha fica fixa na barra lateral (D5) */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_25.5rem]">
        <div className="min-w-0 space-y-12">
          <DesempenhoDisciplinas dados={resultado.por_disciplina} />
          <div className="lg:hidden">
            <FolhaCorrigida formato="grade" questaoIds={questaoIds} itens={resultado.itens} atual={revisao.indice} onIr={abrir} />
          </div>
          <RevisaoQuestoes
            questaoIds={questaoIds}
            itens={resultado.itens}
            estado={revisao}
            onFiltros={filtrar}
            onIr={(indice) => navegar((atual) => ({ ...atual, indice }))}
            pedidoDeFoco={pedidoDeFoco}
          />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-xl border border-optico/45 bg-papel p-4">
            <FolhaCorrigida formato="bolhas" questaoIds={questaoIds} itens={resultado.itens} atual={revisao.indice} onIr={abrir} />
          </div>
        </aside>
      </div>
    </div>
  )
}

export function ResultadoPage() {
  useTituloPagina('Resultado')
  const { id = '' } = useParams()
  const estado = useLocation().state as EstadoResultado | null
  // Recém-finalizado chega pelo state (funciona mesmo sem storage); depois, pelo histórico,
  // que com conta pode vir de outro dispositivo depois da sincronização (CR-005)
  const { entradas, sincronizando, usuario } = useHistorico()
  const entrada = useMemo(
    () => (estado?.entrada?.id === id ? estado.entrada : (entradas.find((e) => e.id === id) ?? null)),
    [estado, id, entradas],
  )
  const { simulado, despachar } = useSimulado()

  // O simulado que virou este resultado sai de "em andamento" só aqui, já fora da resolução
  useEffect(() => {
    if (entrada && simulado?.id === entrada.id) despachar({ tipo: 'DESCARTAR' })
  }, [entrada, simulado, despachar])

  if (!entrada) {
    if (sincronizando) return <Carregando />
    return (
      <section className="max-w-prose">
        <h1 className="text-2xl">Resultado</h1>
        {usuario ? (
          <>
            <p className="mt-2">Resultado não encontrado no seu histórico.</p>
            <p className="mt-1 text-tinta-suave">A conta guarda os 50 simulados concluídos mais recentes.</p>
          </>
        ) : (
          <>
            <p className="mt-2">Resultado não encontrado neste navegador.</p>
            <p className="mt-1 text-tinta-suave">O histórico fica guardado só no navegador em que o simulado foi feito.</p>
          </>
        )}
        <Link to="/historico" className={`${LINK} mt-5 inline-block`}>Ver histórico</Link>
      </section>
    )
  }

  // A chave zera a revisão (questão aberta e filtros) ao trocar de resultado sem desmontar a rota
  return <Resultado key={entrada.id} entrada={entrada} estado={estado} />
}
