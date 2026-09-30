import { useSimulado } from '../simulado/useSimulado'

export function AvisoStorage() {
  const { storageOk } = useSimulado()
  if (storageOk) return null
  return (
    <p role="status" className="rounded-md border border-alerta/30 bg-alerta-claro px-3 py-2 text-sm text-alerta">
      Seu navegador bloqueou o armazenamento local: o simulado não será salvo se você recarregar a página.
    </p>
  )
}
