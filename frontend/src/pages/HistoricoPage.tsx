import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { Vazio } from '../components/Estados'
import { BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { useHistorico, useLimparHistorico } from '../hooks/useHistorico'
import { formatarDataHora, formatarPercentual } from '../utils/format'
import { useTituloPagina } from '../hooks/useTituloPagina'

export function HistoricoPage() {
  useTituloPagina('Histórico')
  const { entradas: lista, usuario } = useHistorico()
  const limpar = useLimparHistorico()
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl">Histórico</h1>
      {usuario ? (
        <p className="mt-2 text-tinta-suave">
          O histórico está guardado na sua conta ({usuario.email}) e aparece em todos os dispositivos em que você
          entrar.
        </p>
      ) : (
        <p className="mt-2 text-tinta-suave">
          O histórico fica só neste navegador. Trocar de dispositivo ou limpar os dados do navegador apaga os registros.
        </p>
      )}
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
            <button
              type="button"
              className={`${BOTAO_SECUNDARIO} mt-6`}
              disabled={limpar.isPending}
              onClick={() => setConfirmando(true)}
            >
              Limpar histórico
            </button>
            {limpar.isError && (
              <p role="alert" className="mt-3 rounded-md bg-erro-claro px-3 py-2 text-erro">
                Não foi possível limpar o histórico da conta. Tente novamente.
              </p>
            )}
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
            setConfirmando(false)
            limpar.mutate()
          }}
        >
          {usuario
            ? 'Os resultados serão apagados da sua conta, em todos os dispositivos.'
            : 'Os resultados salvos neste navegador serão apagados.'}
        </ConfirmDialog>
      )}
    </div>
  )
}
