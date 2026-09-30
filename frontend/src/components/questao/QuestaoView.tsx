import { useCallback, useState, type ReactNode, type Ref } from 'react'

import { NOMES_DISCIPLINAS, type Letra, type Questao, type TextoBase } from '../../types'
import { Alternativas, type CorrecaoAlternativas } from './Alternativas'
import { Blocos } from './Blocos'
import { ReportarModal } from './ReportarModal'

interface Props {
  questao: Questao
  textoBase?: TextoBase | null
  posicao?: { atual: number; total: number }
  selecionada: Letra | null
  onSelecionar: (letra: Letra) => void
  correcao?: CorrecaoAlternativas | null
  acoes?: ReactNode
  /** Título focável: a resolução leva o foco a ele ao trocar de questão (CR-001) */
  refTitulo?: Ref<HTMLHeadingElement>
  /** h3 quando a questão fica dentro de uma seção com h2, como na revisão do resultado (CR-003) */
  nivelTitulo?: 2 | 3
  /** Linha extra no cabeçalho, abaixo da fonte (ex.: selo do resultado e posição na revisão) */
  complemento?: ReactNode
}

export function QuestaoView({
  questao,
  textoBase,
  posicao,
  selecionada,
  onSelecionar,
  correcao,
  acoes,
  refTitulo,
  nivelTitulo = 2,
  complemento,
}: Props) {
  const Titulo = nivelTitulo === 3 ? 'h3' : 'h2'
  const fonte = `${NOMES_DISCIPLINAS[questao.disciplina]}, FUVEST ${questao.ano} (questão ${questao.numero})`
  const alt = `Figura da questão ${questao.numero}, FUVEST ${questao.ano}`
  const [reportando, setReportando] = useState(false)
  const fecharReporte = useCallback(() => setReportando(false), [])
  return (
    <article className="max-w-[68ch]">
      <header className="mb-5">
        {posicao && (
          <Titulo ref={refTitulo} tabIndex={refTitulo ? -1 : undefined} className="text-xl font-bold focus:outline-none">
            Questão {posicao.atual} de {posicao.total}
          </Titulo>
        )}
        <p className="text-sm text-tinta-suave">{fonte}</p>
        {complemento}
      </header>

      {textoBase && (
        <section aria-label="Texto de apoio" className="mb-6 border-l-4 border-linha pl-4">
          <p className="mb-2 text-sm text-tinta-suave">Texto compartilhado com outras questões</p>
          <Blocos blocos={textoBase.conteudo} altFigura={`Figura do texto de apoio, FUVEST ${questao.ano}`} />
        </section>
      )}

      <Blocos blocos={questao.enunciado} altFigura={alt} />

      <div className="mt-6">
        <Alternativas
          alternativas={questao.alternativas}
          selecionada={selecionada}
          onSelecionar={onSelecionar}
          correcao={correcao}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {acoes}
        <button
          type="button"
          onClick={() => setReportando(true)}
          className="text-sm text-tinta-suave underline underline-offset-2 hover:text-tinta"
        >
          Reportar problema
        </button>
      </div>
      {reportando && <ReportarModal questaoId={questao.id} descricao={fonte} onFechar={fecharReporte} />}
    </article>
  )
}
