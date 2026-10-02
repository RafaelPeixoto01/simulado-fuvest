import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Toda página nova começa no topo (CR-009, R1): o `BrowserRouter` não mexe na rolagem, e a página
 *  herdava a da anterior. Rola a cada mudança de caminho, inclusive no voltar do navegador; não na
 *  primeira renderização nem quando muda só a busca. Antes da pintura, para a página nova não
 *  aparecer um instante na posição antiga. */
export function RolarAoTopo() {
  const { pathname } = useLocation()
  const anterior = useRef(pathname)

  // No voltar, o navegador restaurava a posição antiga logo depois do popstate, por cima do topo:
  // a rolagem passa a ser só nossa. Recarregar já começava no topo (os dados chegam depois da carga)
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return
    const antes = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = antes
    }
  }, [])

  useLayoutEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}
