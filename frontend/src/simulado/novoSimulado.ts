import { NOMES_DISCIPLINAS, type Disciplina, type Simulado } from '../types'
import type { SimuladoEmAndamento } from './tipos'

export function chaveQuestoes(ids: string[]): [string, string] {
  return ['questoes', ids.join(',')]
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
