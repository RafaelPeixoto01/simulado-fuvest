import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { PreviaProduto } from '../components/apresentacao/PreviaProduto'
import { BolinhaLetra } from '../components/BolinhaLetra'
import { BotaoGoogle } from '../components/BotaoGoogle'
import { CirculoCaneta } from '../components/CirculoCaneta'
import { CARTAO, LINK } from '../components/estilos'
import { useTituloPagina } from '../hooks/useTituloPagina'
import { useVitrine } from '../hooks/useVitrine'
import type { Vitrine } from '../types'

const MODOS = [
  ['Prova completa', '90 questões na distribuição da prova real, com 5 horas.'],
  ['Prova de um ano', 'A prova original de um ano, na ordem em que caiu, com 5 horas.'],
  ['Personalizado', 'Disciplinas, anos e quantidade de questões à sua escolha.'],
  ['Treino por questão', 'Uma questão por vez, sem cronômetro, com a resposta na hora.'],
] as const

/** Números da base (CR-007, O1.1). Abaixo de 640 px, rótulos curtos e o ano final com 2 dígitos. */
function NumerosBase({ vitrine }: { vitrine: Vitrine }) {
  const { total_questoes: total, anos } = vitrine
  const uma = anos.length === 1
  // Em ordem crescente (specs/07 §9.1)
  const inicio = String(anos[0])
  const fim = String(anos[anos.length - 1])
  const itens = [
    ['questões reais', total],
    [
      <>
        {uma ? 'prova' : 'provas'}
        <span className="max-sm:hidden">{uma ? ' completa' : ' completas'}</span>
      </>,
      anos.length,
    ],
    [
      <>
        {uma ? 'ano' : 'anos'}
        <span className="max-sm:hidden"> na base</span>
      </>,
      inicio === fim ? (
        fim
      ) : (
        <>
          {inicio}–<span className="max-sm:hidden">{fim.slice(0, 2)}</span>
          {fim.slice(2)}
        </>
      ),
    ],
  ] as const

  return (
    // repeat(3, 1fr), e não grid-cols-3: o mínimo de cada cartão é o conteúdo, e o período não quebra em 320 px
    <dl className="mt-5 grid grid-cols-[repeat(3,1fr)] gap-2 sm:mt-7 sm:flex sm:gap-0">
      {itens.map(([rotulo, valor], i) => (
        // Rótulo antes do número no DOM (o leitor de tela lê "questões reais: 270"), abaixo dele na tela
        <div
          key={i}
          className="flex flex-col-reverse rounded-[10px] bg-papel px-2.5 py-2.5 sm:rounded-none sm:border-linha sm:bg-transparent sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0 sm:not-last:border-r"
        >
          <dt className="text-[0.8125rem] text-tinta-suave sm:text-sm">{rotulo}</dt>
          <dd className="font-titulo text-[1.375rem] leading-tight font-[650] whitespace-nowrap tabular-nums sm:text-[1.75rem]">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Início para quem não entrou (CR-006, RN-017). Os números vêm da vitrine pública (CR-007);
 *  o resto da base continua protegido com o catálogo. */
export function ApresentacaoPage() {
  useTituloPagina()
  const [parametros] = useSearchParams()
  const vitrine = useVitrine()
  const idModos = useId()
  const pedido = parametros.get('voltar')
  // O servidor também filtra o caminho de volta (caminho_seguro); aqui só evita mandar lixo
  const voltar = pedido?.startsWith('/') && !pedido.startsWith('//') ? pedido : '/'

  return (
    <div>
      <div className="lg:grid lg:grid-cols-[minmax(0,32.5rem)_minmax(0,1fr)] lg:items-center lg:gap-x-12 xl:gap-x-18">
        <div className="max-w-2xl">
          <h1 className="text-3xl leading-tight sm:text-4xl">
            Treine com questões <CirculoCaneta>reais</CirculoCaneta> da 1ª fase da FUVEST
          </h1>
          <p className="mt-3 text-lg text-tinta-suave">
            Simulados com questões das provas oficiais de anos anteriores, corrigidos na hora, com o seu desempenho
            por disciplina e por assunto.
          </p>
          {/* Sem vitrine (erro ou base vazia), a página fica completa sem os números: nunca "0" */}
          {vitrine.data && vitrine.data.anos.length > 0 && <NumerosBase vitrine={vitrine.data} />}

          {voltar !== '/' && (
            <p role="status" className="mt-6 rounded-md bg-caneta-clara px-3 py-2 text-caneta-escura">
              Entre com a sua conta Google para continuar.
            </p>
          )}
          <div className="mt-5 sm:mt-8">
            <BotaoGoogle voltar={voltar} />
          </div>
          <p className="mt-2.5 text-sm text-tinta-suave sm:mt-3.5">
            É grátis. Guardamos só seu nome, seu e-mail, os resultados dos simulados concluídos e a carreira-alvo, se você escolher uma.{' '}
            <Link to="/privacidade" className={LINK}>
              Privacidade
            </Link>
          </p>
        </div>
        <PreviaProduto className="mt-8 lg:mt-0" />
      </div>

      <section aria-labelledby={idModos} className="mt-10 lg:mt-20">
        <h2 id={idModos} className="text-lg">
          Quatro jeitos de treinar
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5 lg:mt-4 lg:grid lg:grid-cols-4 lg:gap-4">
          {MODOS.map(([titulo, descricao], i) => (
            <li key={titulo} className={`${CARTAO} flex gap-3 p-3.5 lg:flex-col lg:gap-3 lg:p-4.5`}>
              {/* Bolinha da folha de respostas (O1.3) */}
              <BolinhaLetra letra={'ABCD'[i]} className="size-6.5 text-xs lg:size-7 lg:text-[0.8125rem]" />
              <div>
                {/* Título de cartão em Fraunces (CR-008, I2) */}
                <h3 className="font-titulo text-[1.0625rem] font-[650] lg:text-lg">{titulo}</h3>
                <p className="mt-0.5 text-[0.9375rem] leading-normal text-tinta-suave lg:mt-1">{descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
