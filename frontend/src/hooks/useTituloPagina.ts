import { useEffect } from 'react'

const SITE = 'Simulado Fuvest'

/** Título da aba por página (WCAG 2.4.2, CR-002): "‹página› · Simulado Fuvest"; sem título, só o nome do site. */
export function useTituloPagina(titulo?: string | null) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${SITE}` : SITE
  }, [titulo])
}
