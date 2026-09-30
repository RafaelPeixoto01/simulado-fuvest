/** Colunas das folhas ópticas do desktop (resolução e resultado): 90 questões cabem inteiras
 *  em 3 colunas de 30 linhas (P1.4 do CR-001, D5 do CR-003). */
export function colunasDaFolha(total: number): number {
  if (total > 40) return 3
  return total > 15 ? 2 : 1
}

/** Trilha do CSS grid para `colunas` colunas de largura igual. */
export const trilhaDaFolha = (colunas: number) => `repeat(${colunas}, minmax(0, 1fr))`
