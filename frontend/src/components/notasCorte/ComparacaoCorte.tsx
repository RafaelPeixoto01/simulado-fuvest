import type { CortesModalidades } from '../../types'
import { MODALIDADES } from '../../utils/notasCorte'

/** "AC 79 · EP 71 · PPI 60", com o nome da modalidade na sigla (CR-010). */
export function CortesEmLinha({ cortes }: { cortes: CortesModalidades }) {
  return (
    <span className="tabular-nums">
      {MODALIDADES.map((m, i) => (
        <span key={m.chave}>
          {i > 0 && ' · '}
          <abbr title={m.nome} className="no-underline">
            {m.sigla}
          </abbr>{' '}
          {cortes[m.chave] ?? '—'}
        </span>
      ))}
    </span>
  )
}
