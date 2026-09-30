import { useCallback, useState } from 'react'

import { ModalFigura } from './ModalFigura'

export function Figura({ src, alt }: { src: string; alt: string }) {
  const [ampliada, setAmpliada] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const fechar = useCallback(() => setAmpliada(false), [])

  if (falhou) {
    return (
      <p className="rounded-md border border-dashed border-linha px-3 py-4 text-sm text-tinta-suave">
        Não foi possível carregar a figura.
      </p>
    )
  }
  return (
    <figure className="my-4">
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label={`Ampliar: ${alt}`}
        className="block cursor-zoom-in rounded-md border border-linha bg-papel p-1"
      >
        <img src={src} alt={alt} loading="lazy" className="max-h-[70vh] w-auto max-w-full" onError={() => setFalhou(true)} />
      </button>
      {ampliada && <ModalFigura src={src} alt={alt} onFechar={fechar} />}
    </figure>
  )
}
