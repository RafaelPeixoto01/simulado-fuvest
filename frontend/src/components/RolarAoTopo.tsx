import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Toda página nova começa no topo (CR-009, R1): o `BrowserRouter` não mexe na rolagem, e a página
 *  herdava a da anterior. Rola a cada mudança de caminho, inclusive no voltar do navegador; não na
 *  primeira renderização (recarregar segue o navegador) nem quando muda só a busca. Antes da pintura,
 *  para a página nova não aparecer um instante na posição antiga. */
export function RolarAoTopo() {
  const { pathname } = useLocation()
  const anterior = useRef(pathname)
  useLayoutEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}
