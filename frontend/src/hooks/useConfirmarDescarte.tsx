import { useCallback, useState, type ReactNode } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { useSimulado } from '../simulado/useSimulado'

/** RN-011: só há um simulado em andamento; começar outro pede confirmação. */
export function useConfirmarDescarte(): {
  comConfirmacao: (acao: () => void) => void
  dialogo: ReactNode
} {
  const { simulado } = useSimulado()
  const [pendente, setPendente] = useState<(() => void) | null>(null)
  const cancelar = useCallback(() => setPendente(null), [])

  const comConfirmacao = (acao: () => void) => {
    if (simulado) setPendente(() => acao)
    else acao()
  }

  const dialogo = pendente && (
    <ConfirmDialog
      titulo="Descartar o simulado em andamento?"
      confirmar="Descartar e começar"
      perigoso
      onCancelar={cancelar}
      onConfirmar={() => {
        setPendente(null)
        pendente()
      }}
    >
      As respostas de “{simulado?.descricao}” serão perdidas.
    </ConfirmDialog>
  )

  return { comConfirmacao, dialogo }
}
