import { formatarPercentual } from '../../utils/format'
import { BarraPercentual } from '../BarraPercentual'

// Questão 13 da FUVEST 2025, como está em data/provas/2025/prova.yaml. No celular, o meio do
// enunciado vira reticências, como no protótipo
const ENUNCIADO = [
  'As formas de colonização ibérica e inglesa na América foram, durante muito tempo, consideradas processos isolados',
  ', estruturados em dois modelos opostos: as colônias de exploração e as de povoamento, respectivamente. No entanto, elas constituíram um emaranhado de experiências compartilhadas pelos impérios atlânticos.',
  ' Os aspectos comuns a essas formas de colonização foram a',
] as const

const ALTERNATIVAS = [
  ['A', 'partida dos colonizadores da metrópole, da qual saíram por fatores religiosos, e a adoção do trabalho livre como base da produção.'],
  ['B', 'dominação e a exploração dos povos originários e o emprego sistemático do trabalho forçado dessas populações.'],
  ['C', 'introdução de colonos sem interesse na ocupação demográfica e o objetivo exclusivo da extração de riquezas minerais.'],
] as const
const MARCADA = 'B'

// Números ilustrativos, como no protótipo
const RESULTADO = [
  ['Inglês', 40],
  ['História', 53],
  ['Geografia', 77],
  ['Física', 100],
] as const

const CHIP = 'rounded-md border border-linha bg-papel px-2 py-0.5 text-xs lg:py-1 lg:text-[0.8125rem]'
const BOTAO = 'rounded-[7px] px-2.5 py-1.5 text-[0.71875rem] lg:px-3 lg:py-[7px] lg:text-xs'

/** Prévia do produto na apresentação (CR-007, O1.2): a resolução em miniatura e, no desktop,
 *  um cartão de resultado sobreposto. Feita com os tokens do site, e não com uma captura de
 *  tela, para acompanhar o visual. Decorativa: o leitor de tela recebe só a descrição. */
export function PreviaProduto({ className = '' }: { className?: string }) {
  return (
    <div className={`relative lg:h-[38.5rem] xl:h-[36.5rem] ${className}`}>
      <p className="sr-only">
        Prévia da tela de resolução: uma questão de História da FUVEST 2025 com a alternativa B marcada, o
        cronômetro, a folha de respostas e os botões Anterior, Revisar e Próxima.
      </p>
      <div
        aria-hidden="true"
        className="max-w-[500px] overflow-hidden rounded-2xl border border-linha bg-papel shadow-[0_14px_32px_rgba(29,36,48,0.12)] lg:absolute lg:top-0 lg:right-0 lg:w-full lg:shadow-[0_18px_40px_rgba(29,36,48,0.12)]"
      >
        <div className="flex h-11 items-center justify-between border-b border-linha bg-fundo px-3 lg:h-12 lg:px-4">
          <span className="hidden text-[0.8125rem] font-bold lg:inline">FUVEST 2025</span>
          {/* No celular, o cronômetro e a folha vão para as pontas da barra */}
          <span className="contents lg:flex lg:items-center lg:gap-2">
            <span className={`${CHIP} font-bold tabular-nums`}>04:52:10</span>
            <span className={`${CHIP} font-semibold`}>Folha 12/90</span>
          </span>
        </div>

        <div className="px-3.5 pt-3.5 pb-1 lg:px-5 lg:pt-4.5 lg:pb-1.5">
          <p className="text-[0.9375rem] font-bold lg:text-base">Questão 13 de 90</p>
          <p className="mt-px mb-2 text-[0.71875rem] text-tinta-suave lg:mb-2.5 lg:text-xs">
            História · FUVEST 2025<span className="max-lg:hidden"> (questão 13)</span>
          </p>
          <p className="font-leitura text-[0.78125rem] leading-[1.55] lg:text-[0.84375rem] lg:leading-[1.6]">
            {ENUNCIADO[0]}
            <span className="max-lg:hidden">{ENUNCIADO[1]}</span>
            <span className="lg:hidden">…</span>
            {ENUNCIADO[2]}
          </p>
          <div className="mt-2.5 flex flex-col gap-[5px] lg:mt-3 lg:gap-1.5">
            {ALTERNATIVAS.map(([letra, texto]) => {
              const marcada = letra === MARCADA
              return (
                <div
                  key={letra}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 lg:gap-2.5 lg:px-2.5 lg:py-[7px] ${marcada ? 'border-caneta bg-caneta-clara' : 'border-linha'}`}
                >
                  <span
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[0.625rem] font-bold lg:size-5 lg:text-[0.6875rem] ${marcada ? 'border-caneta bg-caneta text-papel' : 'border-optico text-optico-texto'}`}
                  >
                    {letra}
                  </span>
                  <span className="min-w-0 truncate font-leitura text-[0.71875rem] lg:text-[0.78125rem]">{texto}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-2 flex gap-1.5 border-t border-linha px-3 py-2 lg:mt-2.5 lg:px-4 lg:py-2.5">
          <span className={`${BOTAO} border border-linha font-semibold`}>‹ Anterior</span>
          <span className={`${BOTAO} border border-linha font-semibold`}>Revisar</span>
          <span className={`${BOTAO} grow bg-caneta text-center font-bold text-papel`}>Próxima ›</span>
        </div>
      </div>

      <div className="hidden lg:absolute lg:bottom-0 lg:left-0 lg:block">
        <p className="sr-only">Ao lado, o desempenho por disciplina de um resultado.</p>
        <div
          aria-hidden="true"
          className="w-62 rounded-[14px] border border-linha bg-papel p-4 shadow-[0_14px_32px_rgba(29,36,48,0.14)]"
        >
          <p className="text-xs text-tinta-suave">Resultado</p>
          <p className="mt-0.5 mb-3 text-lg font-bold">58 de 90 acertos</p>
          <div className="flex flex-col gap-2 text-xs">
            {RESULTADO.map(([disciplina, percentual]) => (
              <div key={disciplina}>
                <div className="flex justify-between">
                  <span className="font-semibold">{disciplina}</span>
                  <span className="text-tinta-suave">{formatarPercentual(percentual)}</span>
                </div>
                <BarraPercentual percentual={percentual} fina />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
