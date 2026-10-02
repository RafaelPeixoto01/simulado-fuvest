/** Bolinha da folha óptica com a letra do modo (A–D), como marcador de cartão (CR-007, CR-008 I5).
 *  Decorativa: o título do cartão já diz o modo. O tamanho e a letra vêm de `className`. */
export function BolinhaLetra({ letra, className = 'size-7 text-[0.8125rem]' }: { letra: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-optico font-bold text-optico-texto ${className}`}
    >
      {letra}
    </span>
  )
}
