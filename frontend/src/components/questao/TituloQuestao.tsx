import type { Ref } from 'react'

/** "Questão 7 de 90" com o número numa bolinha da folha (CR-008, I4). O "Questão" fica só para o
 *  leitor de tela; os espaços ficam fora dos spans, porque o nome acessível descarta espaço no
 *  começo e no fim de um elemento. */
export function TituloQuestao({
  atual,
  total,
  nivel = 2,
  refTitulo,
}: {
  atual: number
  total: number
  nivel?: 2 | 3
  refTitulo?: Ref<HTMLHeadingElement>
}) {
  const Titulo = nivel === 3 ? 'h3' : 'h2'
  return (
    <Titulo
      ref={refTitulo}
      tabIndex={refTitulo ? -1 : undefined}
      className="flex items-center gap-2.5 font-titulo text-xl font-[650] focus:outline-none lg:gap-3 lg:text-2xl"
    >
      <span className="sr-only">Questão</span>{' '}
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full border-[2.5px] border-optico text-[1.1875rem] font-bold text-optico-texto tabular-nums lg:size-12 lg:text-[1.375rem]">
        {atual}
      </span>{' '}
      <span className="font-medium text-tinta-suave">de {total}</span>
    </Titulo>
  )
}
