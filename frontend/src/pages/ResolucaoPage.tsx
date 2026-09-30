import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { AvisoStorage } from '../components/AvisoStorage'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Carregando, ErroCarregamento } from '../components/Estados'
import { BOTAO_BARRA_PRIMARIO, BOTAO_BARRA_SECUNDARIO, BOTAO_SECUNDARIO } from '../components/estilos'
import { QuestaoView } from '../components/questao/QuestaoView'
import { AVISO_MS, Cronometro } from '../components/resolucao/Cronometro'
import { FolhaRespostas } from '../components/resolucao/FolhaRespostas'
import { PainelFolha } from '../components/resolucao/PainelFolha'
import { TelaPausa } from '../components/resolucao/TelaPausa'
import { useAgora } from '../hooks/useAgora'
import { useAtalhos } from '../hooks/useAtalhos'
import { useFinalizarSimulado } from '../hooks/useFinalizarSimulado'
import { useQuestoes } from '../hooks/useQuestoes'
import type { SimuladoEmAndamento } from '../simulado/tipos'
import { useSimulado } from '../simulado/useSimulado'
import type { Letra } from '../types'
import { restanteMs } from '../utils/tempo'

const ICONE = 'size-5 shrink-0'
const TRACO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// Miniatura da folha óptica: três bolinhas marcadas a caneta, o resto em rosa
const MARCADAS_ICONE = new Set(['9,4', '4,9', '14,14'])

function IconeFolha() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px] shrink-0 max-[359px]:hidden">
      {[4, 9, 14].flatMap((y) =>
        [4, 9, 14].map((x) =>
          MARCADAS_ICONE.has(`${x},${y}`) ? (
            <circle key={`${x},${y}`} cx={x} cy={y} r="2.4" className="fill-caneta" />
          ) : (
            <circle key={`${x},${y}`} cx={x} cy={y} r="2.4" fill="none" strokeWidth="1.4" className="stroke-optico" />
          ),
        ),
      )}
    </svg>
  )
}

function Resolucao({ simulado }: { simulado: SimuladoEmAndamento }) {
  const { despachar } = useSimulado()
  const agora = useAgora()
  const questoes = useQuestoes(simulado.questaoIds)
  const { finalizar, finalizando, erro } = useFinalizarSimulado(simulado)
  const [confirmando, setConfirmando] = useState(false)
  const [folhaAberta, setFolhaAberta] = useState(false)
  // Tempo esgotado já ao abrir: o estudante fechou a aba e o relógio continuou (RN-009)
  const [expirouAoAbrir] = useState(() => restanteMs(simulado, Date.now()) === 0)
  const titulo = useRef<HTMLHeadingElement>(null)

  const total = simulado.questaoIds.length
  const indice = simulado.indiceAtual
  const idAtual = simulado.questaoIds[indice]
  const restante = restanteMs(simulado, agora)
  const expirado = restante === 0
  const pausado = simulado.pausadoEm !== null
  const ultima = indice === total - 1

  const irPara = useCallback((i: number) => despachar({ tipo: 'IR_PARA', indice: i }), [despachar])
  const responder = (letra: Letra) => despachar({ tipo: 'RESPONDER', questaoId: idAtual, letra })
  const alternarRevisar = () => despachar({ tipo: 'ALTERNAR_MARCADA', questaoId: idAtual })
  const retomar = () => despachar({ tipo: 'RETOMAR', agora: Date.now() })
  // Callbacks estáveis: os diálogos não podem refazer o foco a cada segundo do relógio
  const fecharFolha = useCallback(() => setFolhaAberta(false), [])
  const cancelarFinalizar = useCallback(() => setConfirmando(false), [])
  const abrirFinalizar = useCallback(() => {
    setFolhaAberta(false)
    setConfirmando(true)
  }, [])

  // Pausado, a questão fica oculta e o teclado não responde nem navega (D3)
  useAtalhos(
    {
      responder,
      anterior: () => irPara(indice - 1),
      proxima: () => irPara(indice + 1),
      alternarRevisar,
    },
    !finalizando && !pausado,
  )

  // P1.1: trocar de questão volta ao topo e leva o foco ao título "Questão N de M"
  const indiceAnterior = useRef(indice)
  useEffect(() => {
    if (indiceAnterior.current === indice) return
    indiceAnterior.current = indice
    window.scrollTo({ top: 0 })
    titulo.current?.focus({ preventScroll: true })
  }, [indice])

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
  const respondidas = simulado.questaoIds.filter((id) => simulado.respostas[id]).length
  const emBranco = total - respondidas
  const paraRevisar = simulado.questaoIds.filter((id) => simulado.marcadas.includes(id)).length
  const marcada = simulado.marcadas.includes(idAtual)

  const folha = (formato: 'bolhas' | 'grade') => (
    <FolhaRespostas
      formato={formato}
      questaoIds={simulado.questaoIds}
      respostas={simulado.respostas}
      marcadas={simulado.marcadas}
      atual={indice}
      onIr={(i) => {
        irPara(i)
        setFolhaAberta(false)
      }}
    />
  )
  const botaoFinalizarSimulado = (classe: string) => (
    <button
      type="button"
      disabled={finalizando}
      onClick={abrirFinalizar}
      className={`w-full rounded-lg border border-tinta-suave/50 bg-papel font-bold hover:border-caneta disabled:cursor-not-allowed disabled:text-tinta-suave ${classe}`}
    >
      Finalizar simulado
    </button>
  )

  return (
    // Modo foco (D5): a resolução não usa o cabeçalho nem o rodapé do site
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-linha bg-fundo/95 backdrop-blur">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4 lg:h-16">
          <p className="hidden min-w-0 truncate font-bold lg:block">{simulado.descricao}</p>
          <Cronometro
            simulado={simulado}
            agora={agora}
            onPausar={() => despachar({ tipo: 'PAUSAR', agora: Date.now() })}
            onRetomar={retomar}
          />
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setFolhaAberta(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-linha bg-papel px-3 text-[0.9375rem] font-semibold hover:border-caneta/50 lg:hidden"
          >
            <IconeFolha />
            <span>
              Folha{' '}
              <span className="tabular-nums">
                {respondidas}/{total}
              </span>
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-4">
        {pausado ? (
          <TelaPausa onRetomar={retomar} />
        ) : (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 pt-5 pb-6 lg:pt-7">
                <div className="mb-4 space-y-3 empty:hidden">
                  <AvisoStorage />
                  {restante !== null && restante > 0 && restante <= AVISO_MS && (
                    <p role="status" className="rounded-md bg-alerta-claro px-3 py-2 text-alerta">
                      Faltam menos de 15 minutos.
                    </p>
                  )}
                  {finalizando && <Carregando texto="Corrigindo…" />}
                  {erro && (
                    <div role="alert" className="rounded-lg border border-erro/30 bg-erro-claro px-4 py-3">
                      <p className="text-erro">
                        Não foi possível corrigir agora. Suas respostas continuam salvas neste navegador.
                      </p>
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
                    refTitulo={titulo}
                  />
                )}
                {removida && (
                  <div className="max-w-[68ch] rounded-lg border border-dashed border-linha px-4 py-6">
                    <h2 ref={titulo} tabIndex={-1} className="text-xl font-bold focus:outline-none">
                      Questão {indice + 1} de {total}
                    </h2>
                    <p className="mt-2 text-tinta-suave">
                      Esta questão foi removida da base depois que o simulado começou e vai contar como em branco.
                    </p>
                  </div>
                )}
              </div>

              {/* P1.2/P1.3: barra fixa no rodapé; Próxima é a ação principal e vira Finalizar na última (D1) */}
              <div className="sticky bottom-0 z-10 -mx-4 border-t border-linha bg-papel px-3 pt-2.5 pb-3 lg:mx-0 lg:bg-fundo lg:px-0 lg:pt-3 lg:pb-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Questão anterior"
                    disabled={indice === 0}
                    onClick={() => irPara(indice - 1)}
                    className={`${BOTAO_BARRA_SECUNDARIO} pr-3 pl-2 text-[0.9375rem]`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={ICONE} {...TRACO}>
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                    <span className="max-[379px]:hidden">Anterior</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={marcada}
                    onClick={alternarRevisar}
                    className={`${BOTAO_BARRA_SECUNDARIO} text-[0.9375rem] ${marcada ? 'border-alerta bg-alerta-claro text-alerta hover:border-alerta' : ''}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] shrink-0" {...TRACO}>
                      <path d="M5 21V4" />
                      <path d="M5 4h12l-2.5 4.5L17 13H5" />
                    </svg>
                    {marcada ? 'Marcada' : 'Revisar'}
                  </button>
                  <span className="hidden flex-1 lg:block" />
                  <button
                    type="button"
                    aria-label={ultima ? 'Finalizar o simulado' : 'Próxima questão'}
                    disabled={ultima && finalizando}
                    onClick={ultima ? abrirFinalizar : () => irPara(indice + 1)}
                    className={`${BOTAO_BARRA_PRIMARIO} flex-1 lg:flex-none lg:pr-3.5 lg:pl-6`}
                  >
                    {ultima ? (
                      'Finalizar'
                    ) : (
                      <>
                        Próxima
                        <svg viewBox="0 0 24 24" aria-hidden="true" className={ICONE} {...TRACO}>
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 hidden text-sm text-tinta-suave lg:block">
                  Atalhos: A a E marcam a alternativa, ← e → trocam de questão, M marca para revisar.
                </p>
              </div>
            </div>

            {/* P1.4/D2: a folha inteira cabe abaixo da barra; rolagem própria só em telas baixas */}
            <aside className="hidden w-[25.5rem] shrink-0 lg:block">
              <div className="sticky top-[5.5rem] my-6 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border border-optico/45 bg-papel p-4">
                <h2 className="font-bold">Folha de respostas</h2>
                {folha('bolhas')}
                {botaoFinalizarSimulado('mt-3 h-10')}
              </div>
            </aside>
          </>
        )}
      </main>

      {folhaAberta && (
        <PainelFolha onFechar={fecharFolha} rodape={botaoFinalizarSimulado('h-12')}>
          {folha('grade')}
        </PainelFolha>
      )}

      {confirmando && (
        <ConfirmDialog
          titulo="Finalizar o simulado?"
          confirmar="Finalizar e ver o resultado"
          cancelar="Continuar resolvendo"
          onCancelar={cancelarFinalizar}
          onConfirmar={() => {
            setConfirmando(false)
            finalizar({ porTempo: false, expirouFora: false })
          }}
        >
          {emBranco === 0
            ? 'Você respondeu todas as questões.'
            : `Você deixou ${emBranco} ${emBranco === 1 ? 'questão' : 'questões'} em branco${
                paraRevisar ? ` e marcou ${paraRevisar} para revisar` : ''
              }.`}
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
