import { LETRAS, type ItemCorrigido } from '../../types'

const dois = (n: number) => String(n).padStart(2, '0')

function rotulo(numero: number, item: ItemCorrigido | undefined): string {
  if (!item) return `Questão ${numero}: removida da base`
  if (item.anulada) return `Questão ${numero}: anulada, ponto para todos`
  if (item.acertou) return `Questão ${numero}: acertou ${item.resposta}`
  if (!item.resposta) return `Questão ${numero}: em branco, correta ${item.correta}`
  return `Questão ${numero}: marcou ${item.resposta}, correta ${item.correta}`
}

/** A folha de respostas depois da correção: acerto em verde, erro em vermelho,
 *  a correta contornada quando o estudante errou ou deixou em branco. */
export function FolhaCorrigida({ questaoIds, itens }: { questaoIds: string[]; itens: ItemCorrigido[] }) {
  const porId = new Map(itens.map((i) => [i.questao_id, i]))
  const linhasPorColuna = questaoIds.length > 15 ? Math.ceil(questaoIds.length / 2) : questaoIds.length
  return (
    <section className="rounded-lg border border-optico/40 bg-papel p-3">
      <h2 className="mb-2 font-bold">Folha de respostas</h2>
      <ol
        aria-label="Folha de respostas corrigida"
        className="grid grid-flow-col gap-x-4"
        style={{ gridTemplateRows: `repeat(${linhasPorColuna}, auto)` }}
      >
        {questaoIds.map((id, i) => {
          const item = porId.get(id)
          return (
            <li key={id} aria-label={rotulo(i + 1, item)} className="flex items-center gap-1 px-1 py-0.5">
              <span aria-hidden="true" className="w-5 text-right text-xs font-bold tabular-nums text-optico">
                {dois(i + 1)}
              </span>
              {LETRAS.map((letra) => {
                const marcou = item?.resposta === letra
                const correta = item && !item.anulada && item.correta === letra
                const estilo = marcou
                  ? item?.acertou
                    ? 'border-acerto bg-acerto text-papel'
                    : 'border-erro bg-erro text-papel'
                  : correta
                    ? 'border-2 border-acerto text-acerto'
                    : 'border-optico/50 text-optico/60'
                return (
                  <span
                    key={letra}
                    aria-hidden="true"
                    className={`flex size-3.5 items-center justify-center rounded-full border text-[0.5rem] leading-none font-bold ${estilo}`}
                  >
                    {letra}
                  </span>
                )
              })}
              {(item?.anulada || !item) && (
                <span aria-hidden="true" className="ml-1 text-[0.625rem] text-tinta-suave">
                  {item ? 'anulada' : 'removida'}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
