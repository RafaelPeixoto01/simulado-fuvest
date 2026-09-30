import type { HistoricoEntry } from '../simulado/tipos'
import type { Catalogo, Disciplina } from '../types'

/** RN-015: abaixo disto, o assunto aparece como "poucas questões" e vai para o fim da lista. */
export const MINIMO_QUESTOES_ASSUNTO = 5

export interface LinhaAssunto {
  assunto: string | null // null = "Sem assunto" (resultado gravado antes do CR-004)
  nome: string
  total: number
  acertos: number
  percentual: number
  poucas: boolean
}

export interface LinhaDisciplina {
  disciplina: Disciplina
  total: number
  acertos: number
  percentual: number
  assuntos: LinhaAssunto[]
}

export interface PainelDesempenho {
  simulados: number // entradas com ao menos uma questão contada
  total: number
  acertos: number
  percentual: number
  disciplinas: LinhaDisciplina[]
}

interface Contagem {
  total: number
  acertos: number
}

const chave = (disciplina: string, slug: string) => `${disciplina}/${slug}`

/** 1 casa decimal, como o servidor. */
export function calcularPercentual(acertos: number, total: number): number {
  return total ? Math.round((1000 * acertos) / total) / 10 : 0
}

/** Nomes por `disciplina/slug`: os gravados nos resultados (o mais recente vale) e, por cima, os
 *  do catálogo, que trazem o nome atual. */
export function nomesDosAssuntos(entradas: HistoricoEntry[], catalogo?: Catalogo): Map<string, string> {
  const nomes = new Map<string, string>()
  for (const entrada of entradas) {
    for (const d of entrada.resultado.por_disciplina) {
      for (const a of d.assuntos ?? []) {
        if (!nomes.has(chave(d.disciplina, a.assunto))) nomes.set(chave(d.disciplina, a.assunto), a.nome)
      }
    }
  }
  for (const d of catalogo?.disciplinas ?? []) {
    for (const a of d.assuntos ?? []) nomes.set(chave(d.slug, a.slug), a.nome)
  }
  return nomes
}

function somar(contagem: Contagem, acertou: boolean) {
  contagem.total += 1
  if (acertou) contagem.acertos += 1
}

// Suficientes do pior para o melhor; depois "poucas questões"; "Sem assunto" sempre por último
function grupo(a: LinhaAssunto): number {
  if (a.assunto === null) return 2
  return a.poucas ? 1 : 0
}

/** RN-015: soma os itens dos simulados concluídos. Anuladas ficam fora; em branco já vem como erro. */
export function agregarDesempenho(entradas: HistoricoEntry[], nomes: Map<string, string>): PainelDesempenho {
  const geral: Contagem = { total: 0, acertos: 0 }
  const porDisciplina = new Map<Disciplina, { conta: Contagem; assuntos: Map<string | null, Contagem> }>()
  let simulados = 0

  for (const entrada of entradas) {
    let contou = false
    for (const item of entrada.resultado.itens) {
      if (item.anulada) continue
      contou = true
      somar(geral, item.acertou)
      let disciplina = porDisciplina.get(item.disciplina)
      if (!disciplina) {
        disciplina = { conta: { total: 0, acertos: 0 }, assuntos: new Map() }
        porDisciplina.set(item.disciplina, disciplina)
      }
      somar(disciplina.conta, item.acertou)
      const slug = item.assunto ?? null
      let assunto = disciplina.assuntos.get(slug)
      if (!assunto) {
        assunto = { total: 0, acertos: 0 }
        disciplina.assuntos.set(slug, assunto)
      }
      somar(assunto, item.acertou)
    }
    if (contou) simulados += 1
  }

  const disciplinas: LinhaDisciplina[] = [...porDisciplina].map(([disciplina, { conta, assuntos }]) => ({
    disciplina,
    total: conta.total,
    acertos: conta.acertos,
    percentual: calcularPercentual(conta.acertos, conta.total),
    assuntos: [...assuntos]
      .map(([slug, c]): LinhaAssunto => ({
        assunto: slug,
        nome: slug === null ? 'Sem assunto' : (nomes.get(chave(disciplina, slug)) ?? slug),
        total: c.total,
        acertos: c.acertos,
        percentual: calcularPercentual(c.acertos, c.total),
        poucas: c.total < MINIMO_QUESTOES_ASSUNTO,
      }))
      .sort((a, b) => grupo(a) - grupo(b) || a.percentual - b.percentual || a.nome.localeCompare(b.nome, 'pt-BR')),
  }))
  // Como o servidor: do pior para o melhor, empate pelo slug
  disciplinas.sort((a, b) => a.percentual - b.percentual || a.disciplina.localeCompare(b.disciplina))

  return {
    simulados,
    total: geral.total,
    acertos: geral.acertos,
    percentual: calcularPercentual(geral.acertos, geral.total),
    disciplinas,
  }
}
