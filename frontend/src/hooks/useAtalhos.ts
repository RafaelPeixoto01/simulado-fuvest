import { useEffect, useRef } from 'react'

import type { Letra } from '../types'

interface Atalhos {
  responder?: (letra: Letra) => void
  anterior?: () => void
  proxima?: () => void
  alternarRevisar?: () => void
}

function ignorar(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true
  const alvo = e.target as HTMLElement | null
  if (alvo && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))) return true
  return Boolean(document.querySelector('[role="dialog"]')) // diálogo aberto tem prioridade
}

/** A–E marcam, ←/→ navegam, M alterna "revisar" (specs/03 §3). */
export function useAtalhos(atalhos: Atalhos, ativo = true) {
  const ref = useRef(atalhos)
  useEffect(() => {
    ref.current = atalhos
  })

  useEffect(() => {
    if (!ativo) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (ignorar(e)) return
      const tecla = e.key.toUpperCase()
      const { responder, anterior, proxima, alternarRevisar } = ref.current
      if (['A', 'B', 'C', 'D', 'E'].includes(tecla) && responder) responder(tecla as Letra)
      else if (e.key === 'ArrowLeft' && anterior) anterior()
      else if (e.key === 'ArrowRight' && proxima) proxima()
      else if (tecla === 'M' && alternarRevisar) alternarRevisar()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [ativo])
}
