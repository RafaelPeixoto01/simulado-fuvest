import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { AvisoStorage } from '../components/AvisoStorage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Carregando, ErroCarregamento } from '../components/Estados'
import {
  BOTAO_PRIMARIO_COMPACTO,
  BOTAO_SECUNDARIO,
  BOTAO_SECUNDARIO_COMPACTO,
} from '../components/estilos'
import { QuestaoView } from '../components/questao/QuestaoView'
import { AVISO_MS, Cronometro } from '../components/resolucao/Cronometro'
import { FolhaRespostas } from '../components/resolucao/FolhaRespostas'
import { useAgora } from '../hooks/useAgora'
import { useAtalhos } from '../hooks/useAtalhos'
import { useFinalizarSimulado } from '../hooks/useFinalizarSimulado'
import { useQuestoes } from '../hooks/useQuestoes'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { useSimulado } from '../simulado/useSimulado'
import type { Letra } from '../types'
import { restanteMs } from '../utils/tempo'

function Resolucao({ simulado }: { simulado: SimuladoEmAndamento }) {
  const { despachar } = useSimulado()
  const agora = useAgora()
  const questoes = useQuestoes(simulado.questaoIds)
  const { finalizar, finalizando, erro } = useFinalizarSimulado(simulado)
  const [confirmando, setConfirmando] = useState(false)
  const [folhaAberta, setFolhaAberta] = useState(false)
  // Tempo esgotado já ao abrir: o estudante fechou a aba e o relógio continuou (RN-009)
  const [expirouAoAbrir] = useState(() => restanteMs(simulado, Date.now()) === 0)

  const total = simulado.questaoIds.length
  const indice = simulado.indiceAtual
  const idAtual = simulado.questaoIds[indice]
  const restante = restanteMs(simulado, agora)
  const expirado = restante === 0

  const irPara = useCallback((i: number) => despachar({ tipo: 'IR_PARA', indice: i }), [despachar])
  const responder = (letra: Letra) => despachar({ tipo: 'RESPONDER', questaoId: idAtual, letra })
  const alternarRevisar = () => despachar({ tipo: 'ALTERNAR_MARCADA', questaoId: idAtual })

  useAtalhos(
    {
      responder,
      anterior: () => irPara(indice - 1),
      proxima: () => irPara(indice + 1),
      alternarRevisar,
    },
    !finalizando,
  )

  // RN-010: tempo zerado finaliza sozinho, sem diálogo, com as respostas marcadas
  const disparou = useRef(false)
  useEffect(() => {
    if (expirado && !disparou.current) {
      disparou.current = true
      setConfirmando(false)
      finalizar({ porTempo: true, expirouFora: expirouAoAbrir })
    }
  }, [expirado, expirouAoAbrir, finalizar])

  const questao = questoes.data?.questoes.find((q) => q.id === idAtual)
  const removida = questoes.data?.nao_encontradas.includes(idAtual)
  const emBranco = total - Object.keys(simulado.respostas).length
  const marcada = simulado.marcadas.includes(idAtual)

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-linha bg-fundo/95 px-4 py-2 backdrop-blur sm:gap-3 sm:py-3">
        <p className="hidden min-w-0 text-sm font-semibold text-tinta-suave sm:block">{simulado.descricao}</p>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Cronometro
            simulado={simulado}
            agora={agora}
            onPausar={() => despachar({ tipo: 'PAUSAR', agora: Date.now() })}
            onRetomar={() => despachar({ tipo: 'RETOMAR', agora: Date.now() })}
          />
          <button type="button" className={`${BOTAO_SECUNDARIO_COMPACTO} lg:hidden`} onClick={() => setFolhaAberta(true)}>
            Folha {total - emBranco}/{total}
          </button>
          <button type="button" className={BOTAO_PRIMARIO_COMPACTO} disabled={finalizando} onClick={() => setConfirmando(true)}>
            Finalizar
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <AvisoStorage />
        {restante !== null && restante > 0 && restante <= AVISO_MS && (
          <p role="status" className="rounded-md bg-alerta-claro px-3 py-2 text-alerta">
            Faltam menos de 15 minutos.
          </p>
        )}
        {finalizando && <Carregando texto="Corrigindo…" />}
        {erro && (
          <div role="alert" className="rounded-lg border border-erro/30 bg-erro-claro px-4 py-3">
            <p className="text-erro">Não foi possível corrigir agora. Suas respostas continuam salvas neste navegador.</p>
            <button
              type="button"
              className={`${BOTAO_SECUNDARIO} mt-3`}
              onClick={() => finalizar({ porTempo: expirado, expirouFora: expirouAoAbrir })}
            >
              Tentar corrigir de novo
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {questoes.isPending && <Carregando texto="Carregando as questões…" />}
          {questoes.isError && (
            <ErroCarregamento mensagem="Não foi possível carregar as questões." onTentar={() => questoes.refetch()} />
          )}
          {questao && (
            <QuestaoView
              questao={questao}
              textoBase={questao.texto_base_id ? questoes.data?.textos_base[questao.texto_base_id] : null}
              posicao={{ atual: indice + 1, total }}
              selecionada={simulado.respostas[idAtual] ?? null}
              onSelecionar={responder}
            />
          )}
          {removida && (
            <div className="max-w-[68ch] rounded-lg border border-dashed border-linha px-4 py-6">
              <h2 className="text-xl font-bold">Questão {indice + 1} de {total}</h2>
              <p className="mt-2 text-tinta-suave">
                Esta questão foi removida da base depois que o simulado começou e vai contar como em branco.
              </p>
            </div>
          )}

          <div className="mt-8 flex max-w-[68ch] flex-wrap items-center justify-between gap-3 border-t border-linha pt-4">
            <button type="button" className={BOTAO_SECUNDARIO} disabled={indice === 0} onClick={() => irPara(indice - 1)} aria-label="Questão anterior">
              Anterior
            </button>
            <button
              type="button"
              aria-pressed={marcada}
              onClick={alternarRevisar}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${marcada ? 'bg-alerta-claro text-alerta' : 'text-tinta-suave hover:text-tinta'}`}
            >
              {marcada ? 'Marcada para revisar' : 'Marcar para revisar'}
            </button>
            <button type="button" className={BOTAO_SECUNDARIO} disabled={indice === total - 1} onClick={() => irPara(indice + 1)} aria-label="Próxima questão">
              Próxima
            </button>
          </div>
          <p className="mt-3 hidden text-sm text-tinta-suave lg:block">
            Atalhos: A a E marcam a alternativa, as setas trocam de questão e M marca para revisar.
          </p>
        </div>

        <aside
          className={
            folhaAberta
              ? 'fixed inset-0 z-30 overflow-auto bg-fundo p-4'
              : 'hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-auto'
          }
        >
          {folhaAberta && (
            <button type="button" className={`${BOTAO_SECUNDARIO} mb-3`} onClick={() => setFolhaAberta(false)}>
              Fechar folha
            </button>
          )}
          <FolhaRespostas
            questaoIds={simulado.questaoIds}
            respostas={simulado.respostas}
            marcadas={simulado.marcadas}
            atual={indice}
            onIr={(i) => {
              irPara(i)
              setFolhaAberta(false)
            }}
          />
        </aside>
      </div>

      {confirmando && (
        <ConfirmDialog
          titulo="Finalizar o simulado?"
          confirmar="Finalizar"
          cancelar="Continuar resolvendo"
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            setConfirmando(false)
            finalizar({ porTempo: false, expirouFora: false })
          }}
        >
          {emBranco === 0
            ? 'Você respondeu todas as questões.'
            : `Você deixou ${emBranco} ${emBranco === 1 ? 'questão' : 'questões'} em branco.`}
        </ConfirmDialog>
      )}
    </div>
  )
}

export function ResolucaoPage() {
  const { simulado } = useSimulado()
  if (!simulado) return <Navigate to="/" replace />
  return <Resolucao simulado={simulado} />
}
