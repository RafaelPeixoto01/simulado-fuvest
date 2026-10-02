/** Marcas de sincronismo da folha óptica (CR-008, I5): barrinhas na borda esquerda, distribuídas
 *  na altura do pai (que precisa ser `relative`). Só no cartão da Prova completa e na folha.
 *  `posicao` define onde a coluna fica (ex.: "left-4 top-6 bottom-6"). */
export function MarcasSincronismo({
  quantidade = 8,
  posicao,
  tamanho = 'h-[5px] w-3.5',
}: {
  quantidade?: number
  posicao: string
  tamanho?: string
}) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute flex flex-col justify-between ${posicao}`}>
      {Array.from({ length: quantidade }, (_, i) => (
        <span key={i} className={`block bg-tinta ${tamanho}`} />
      ))}
    </div>
  )
}
