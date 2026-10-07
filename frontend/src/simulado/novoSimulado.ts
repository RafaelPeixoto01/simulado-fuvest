import { LIMITE_HISTORICO } from '../storage/historicoStorage'
import { NOMES_DISCIPLINAS, type Disciplina, type Simulado } from '../types'
import type { HistoricoEntry, SimuladoEmAndamento } from './tipos'

export function chaveQuestoes(ids: string[]): [string, string] {
  return ['questoes', ids.join(',')]
}

/** O mesmo limite do servidor: 50 simulados de até 90 questões (RN-016). */
export const LIMITE_VISTAS = LIMITE_HISTORICO * 90
const ID_QUESTAO = /^\d{4}(s[1-9])?-\d{3}$/

/** Questões dos simulados do histórico, da vista mais recentemente para a mais antiga, sem repetição
 *  (CR-015, RN-023): vão no pedido de geração para o sorteio começar pelas inéditas. Um id fora do
 *  formato (histórico local adulterado) faria o servidor recusar o pedido inteiro, então fica de fora. */
export function questoesVistas(historico: HistoricoEntry[]): string[] {
  const vistas = new Set<string>()
  const recentesPrimeiro = [...historico].sort((a, b) => b.finalizadoEm - a.finalizadoEm)
  for (const entrada of recentesPrimeiro) {
    for (const id of entrada.questaoIds) if (ID_QUESTAO.test(id)) vistas.add(id)
  }
  return [...vistas].slice(0, LIMITE_VISTAS)
}

export function montarSimuladoEmAndamento(
  simulado: Simulado,
  descricao: string,
  agora: number,
  id: string,
): SimuladoEmAndamento {
  if (simulado.modo === 'treino') throw new Error('Treino não vira simulado em andamento')
  return {
    versao: 1,
    id,
    modo: simulado.modo,
    descricao,
    questaoIds: simulado.questoes.map((q) => q.id),
    respostas: {},
    marcadas: [],
    indiceAtual: 0,
    iniciadoEm: agora,
    tempoLimiteS: simulado.tempo_limite_s,
    pausavel: simulado.pausavel,
    pausadoEm: null,
    pausadoTotalMs: 0,
  }
}

const lista = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

export function descricaoPersonalizado(disciplinas: Disciplina[], quantidade: number): string {
  const nomes =
    disciplinas.length === Object.keys(NOMES_DISCIPLINAS).length
      ? 'todas as disciplinas'
      : disciplinas.length > 3
        ? `${disciplinas.length} disciplinas`
        : lista.format(disciplinas.map((d) => NOMES_DISCIPLINAS[d]))
  return `Personalizado: ${nomes}, ${quantidade} ${quantidade === 1 ? 'questão' : 'questões'}`
}
