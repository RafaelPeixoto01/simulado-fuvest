/** Formato vigente da 1ª fase (FUVEST 2027, Resolução CoG 9008/2026; CR-011): 80 questões em 5 horas.
 *  A Prova completa segue este formato; a Prova de um ano usa o total da própria prova (90 até 2026). */
export const QUESTOES_PROVA_COMPLETA = 80
export const SEGUNDOS_PROVA = 5 * 60 * 60
/** Ritmo do Personalizado com cronômetro (RN-009): 5 h / 80 = 225 s = 3 min 45 s por questão. */
export const SEGUNDOS_POR_QUESTAO = SEGUNDOS_PROVA / QUESTOES_PROVA_COMPLETA

/** Anos de referência das provas da base, sem repetição e em ordem crescente: o filtro de anos do
 *  Personalizado e do Treino. Os simulados oficiais de 2027 entram em 2027 (CR-011, P4). */
export function anosDasProvas(provas: { ano: number }[]): number[] {
  return [...new Set(provas.map((p) => p.ano))].sort((a, b) => a - b)
}
