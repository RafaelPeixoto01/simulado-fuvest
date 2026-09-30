import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { Vazio } from '../components/Estados'
import { BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { limparHistorico, listarHistorico } from '../storage/historicoStorage'
import { formatarDataHora, formatarPercentual } from '../utils/format'
import { useTituloPagina } from '../hooks/useTituloPagina'

export function HistoricoPage() {
  useTituloPagina('Histórico')
  const [lista, setLista] = useState(listarHistorico)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Histórico</h1>
      <p className="mt-2 text-tinta-suave">
        O histórico fica só neste navegador. Trocar de dispositivo ou limpar os dados do navegador apaga os registros.
      </p>
      {lista.length > 0 && (
        <Link to="/desempenho" className={`${LINK} mt-3 inline-block`}>
          Ver meu desempenho
        </Link>
      )}

      <div className="mt-6">
        {lista.length === 0 ? (
          <Vazio>
            <p>Nenhum simulado concluído ainda.</p>
            <Link to="/" className={`${LINK} mt-2 inline-block`}>Começar um simulado</Link>
          </Vazio>
        ) : (
          <>
            <ul className="divide-y divide-linha border-y border-linha">
              {lista.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/resultado/${e.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1 py-4 hover:bg-papel"
                  >
                    <span>
                      <span className="block font-semibold text-tinta">{e.descricao}</span>
                      <span className="text-sm text-tinta-suave">{formatarDataHora(e.finalizadoEm)}</span>
                    </span>
                    <span className="tabular-nums">
                      <span className="font-bold">
                        {e.resultado.acertos} de {e.resultado.total}
                      </span>{' '}
                      <span className="text-tinta-suave">({formatarPercentual(e.resultado.percentual)})</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" className={`${BOTAO_SECUNDARIO} mt-6`} onClick={() => setConfirmando(true)}>
              Limpar histórico
            </button>
          </>
        )}
      </div>

      {confirmando && (
        <ConfirmDialog
          titulo="Limpar o histórico?"
          confirmar="Limpar histórico"
          perigoso
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            limparHistorico()
            setLista([])
            setConfirmando(false)
          }}
        >
          Os resultados salvos neste navegador serão apagados.
        </ConfirmDialog>
      )}
    </div>
  )
}
