import { NavLink, Outlet, useSearchParams } from 'react-router-dom'

const ABAS = [
  { para: '/gestao', nome: 'Uso', fim: true },
  { para: '/gestao/aprendizado', nome: 'Aprendizado', fim: false },
  { para: '/gestao/qualidade', nome: 'Qualidade', fim: false },
  { para: '/gestao/estudantes', nome: 'Estudantes', fim: false },
]

const aba = ({ isActive }: { isActive: boolean }) =>
  `-mb-px shrink-0 border-b-2 px-1.5 py-2 text-[0.8125rem] font-semibold sm:px-3 sm:text-sm ${
    isActive ? 'border-caneta text-caneta' : 'border-transparent text-tinta-suave hover:text-tinta'
  }`

/** Área de gestão (CR-013, RF-030): título, abas e a aba aberta. O período escolhido segue
 *  junto ao trocar de aba. */
export function GestaoLayout() {
  const [params] = useSearchParams()
  const periodo = params.get('periodo')
  const busca = periodo ? `?${new URLSearchParams({ periodo })}` : ''

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl sm:text-3xl">Gestão</h1>
      <p className="mt-2 text-tinta-suave">
        Números do site, contados por dia sem identificar ninguém. Só o administrador vê esta área.
      </p>
      {/* As quatro abas cabem em 360 px sem rolagem lateral */}
      <nav aria-label="Seções da gestão" className="mt-6 flex gap-0.5 border-b border-linha sm:gap-1">
        {ABAS.map((a) => (
          <NavLink key={a.para} to={{ pathname: a.para, search: busca }} end={a.fim} className={aba}>
            {a.nome}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
