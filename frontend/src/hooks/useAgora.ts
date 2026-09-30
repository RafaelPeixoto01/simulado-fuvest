import { useEffect, useState } from 'react'

/** Relogio que re-renderiza a cada segundo. O tempo em si vem sempre de
 *  timestamps (utils/tempo), nunca da contagem de ticks (RN-009). */
export function useAgora(ativo = true, intervaloMs = 1000): number {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (!ativo) return
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [ativo, intervaloMs])
  return agora
}
