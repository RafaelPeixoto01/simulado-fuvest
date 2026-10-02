import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { api, ApiError } from '../../services/api'
import type { TipoReporte } from '../../types'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO } from '../estilos'

const TIPOS: { valor: TipoReporte; rotulo: string }[] = [
  { valor: 'enunciado', rotulo: 'Enunciado ou alternativa com erro' },
  { valor: 'figura', rotulo: 'Figura faltando ou ilegível' },
  { valor: 'gabarito', rotulo: 'Gabarito incorreto' },
  { valor: 'outro', rotulo: 'Outro' },
]
const LIMITE = 500

type Estado = 'editando' | 'enviando' | 'enviado' | 'limite' | 'erro'

export function ReportarModal({ questaoId, descricao, onFechar }: { questaoId: string; descricao: string; onFechar: () => void }) {
  const idTitulo = useId()
  const primeiro = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<TipoReporte | null>(null)
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<Estado>('editando')

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    primeiro.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [onFechar])

  useEffect(() => {
    if (estado !== 'enviado') return
    const id = setTimeout(onFechar, 2000)
    return () => clearTimeout(id)
  }, [estado, onFechar])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!tipo) return
    setEstado('enviando')
    try {
      await api.reportar({ questao_id: questaoId, tipo, ...(texto.trim() ? { descricao: texto } : {}) })
      setEstado('enviado')
    } catch (erro) {
      setEstado(erro instanceof ApiError && erro.status === 429 ? 'limite' : 'erro')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby={idTitulo} className={`${CARTAO} w-full max-w-md p-5`}>
        <h2 id={idTitulo} className="text-lg">Reportar problema na questão</h2>
        <p className="text-sm text-tinta-suave">{descricao}</p>

        {estado === 'enviado' ? (
          <p role="status" className="mt-4 font-semibold text-acerto">Obrigado! Vamos revisar esta questão.</p>
        ) : (
          <form onSubmit={enviar} className="mt-4 space-y-4">
            <fieldset>
              <legend className="font-semibold">O que está errado?</legend>
              <div className="mt-2 space-y-1.5">
                {TIPOS.map((t, i) => (
                  <label key={t.valor} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      ref={i === 0 ? primeiro : undefined}
                      type="radio"
                      name="tipo-reporte"
                      className="size-4 accent-caneta"
                      checked={tipo === t.valor}
                      onChange={() => setTipo(t.valor)}
                    />
                    {t.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor={`${idTitulo}-descricao`} className="font-semibold">
                Descrição (opcional)
              </label>
              <textarea
                id={`${idTitulo}-descricao`}
                value={texto}
                maxLength={LIMITE}
                rows={3}
                onChange={(e) => setTexto(e.target.value)}
                className="mt-1 block w-full rounded-md border border-borda-campo px-3 py-2"
              />
              <p className="text-right text-xs tabular-nums text-tinta-suave">
                {texto.length}/{LIMITE}
              </p>
            </div>
            {estado === 'limite' && <p role="alert" className="text-erro">Muitos envios em pouco tempo. Tente mais tarde.</p>}
            {estado === 'erro' && <p role="alert" className="text-erro">Não foi possível enviar. Tente novamente.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={BOTAO_SECUNDARIO} onClick={onFechar}>Cancelar</button>
              <button type="submit" className={BOTAO_PRIMARIO} disabled={!tipo || estado === 'enviando'}>
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
