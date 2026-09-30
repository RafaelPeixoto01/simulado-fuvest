import type { AcaoSimulado, SimuladoEmAndamento } from './tipos'

export function reducerSimulado(
  estado: SimuladoEmAndamento | null,
  acao: AcaoSimulado,
): SimuladoEmAndamento | null {
  if (acao.tipo === 'INICIAR') return acao.simulado
  if (acao.tipo === 'DESCARTAR' || estado === null) return null

  switch (acao.tipo) {
    case 'RESPONDER': {
      const respostas = { ...estado.respostas }
      if (respostas[acao.questaoId] === acao.letra) {
        delete respostas[acao.questaoId] // clicar na marcada desmarca (RF-013)
      } else {
        respostas[acao.questaoId] = acao.letra
      }
      return { ...estado, respostas }
    }
    case 'ALTERNAR_MARCADA': {
      const marcadas = estado.marcadas.includes(acao.questaoId)
        ? estado.marcadas.filter((id) => id !== acao.questaoId)
        : [...estado.marcadas, acao.questaoId]
      return { ...estado, marcadas }
    }
    case 'IR_PARA': {
      const indice = Math.min(Math.max(acao.indice, 0), estado.questaoIds.length - 1)
      return { ...estado, indiceAtual: indice }
    }
    case 'PAUSAR':
      if (!estado.pausavel || estado.pausadoEm !== null) return estado
      return { ...estado, pausadoEm: acao.agora }
    case 'RETOMAR':
      if (estado.pausadoEm === null) return estado
      return {
        ...estado,
        pausadoEm: null,
        pausadoTotalMs: estado.pausadoTotalMs + (acao.agora - estado.pausadoEm),
      }
  }
}
