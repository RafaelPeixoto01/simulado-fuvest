import { type FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Carregando, ErroCarregamento, Vazio } from '../../components/Estados'
import { BOTAO_PEQUENO, BOTAO_SECUNDARIO } from '../../components/estilos'
import { useGestaoEstudantes } from '../../hooks/useGestao'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import type { OrdemEstudantes } from '../../types'
import { formatarDataHora } from '../../utils/format'
import { Atualizando, CABECALHO, CELULA, TabelaRolavel } from './componentes'
import { formatarNumero } from './periodo'

const ORDENS: { valor: OrdemEstudantes; nome: string }[] = [
  { valor: 'cadastro', nome: 'Cadastro mais recente' },
  { valor: 'acesso', nome: 'Último acesso mais recente' },
]

const LIMITE_BUSCA = 100 // o da API

function lerFiltro(params: URLSearchParams) {
  const ordem: OrdemEstudantes = params.get('ordem') === 'acesso' ? 'acesso' : 'cadastro'
  const pagina = Number(params.get('pagina'))
  return {
    busca: (params.get('busca') ?? '').slice(0, LIMITE_BUSCA),
    ordem,
    pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= 10_000 ? pagina : 1,
  }
}

const dataHora = (iso: string) => formatarDataHora(Date.parse(iso))

/** Aba Estudantes (CR-013, RF-034): só consulta, para suporte. Busca, ordem e página na URL. */
export function EstudantesPage() {
  useTituloPagina('Gestão · Estudantes')
  const [params, setParams] = useSearchParams()
  const filtro = lerFiltro(params)
  const [rascunho, setRascunho] = useState(filtro.busca)
  const consulta = useGestaoEstudantes(filtro)
  const dados = consulta.data

  function mudar(mudancas: Partial<typeof filtro>) {
    const novo = { ...filtro, ...mudancas }
    const proximos = new URLSearchParams()
    if (novo.busca) proximos.set('busca', novo.busca)
    if (novo.ordem !== 'cadastro') proximos.set('ordem', novo.ordem)
    if (novo.pagina > 1) proximos.set('pagina', String(novo.pagina))
    setParams(proximos, { replace: true })
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault()
    mudar({ busca: rascunho.trim(), pagina: 1 })
  }

  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.por_pagina)) : 1

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <form role="search" onSubmit={buscar} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Buscar por nome ou e-mail
            <input
              type="search"
              value={rascunho}
              maxLength={LIMITE_BUSCA}
              onChange={(e) => setRascunho(e.target.value)}
              className="w-64 max-w-full rounded-md border border-borda-campo bg-papel px-3 py-2 text-base font-normal"
            />
          </label>
          <button type="submit" className={BOTAO_SECUNDARIO}>
            Buscar
          </button>
        </form>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Ordem
          <select
            value={filtro.ordem}
            onChange={(e) => mudar({ ordem: e.target.value as OrdemEstudantes, pagina: 1 })}
            className="rounded-md border border-borda-campo bg-papel px-3 py-2 text-base font-normal"
          >
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {consulta.isPending ? (
          <Carregando />
        ) : !dados ? (
          <ErroCarregamento mensagem="Não foi possível carregar os estudantes." onTentar={() => void consulta.refetch()} />
        ) : dados.estudantes.length === 0 ? (
          <Vazio>Nenhum estudante encontrado.</Vazio>
        ) : (
          <Atualizando ativo={consulta.isPlaceholderData}>
            <TabelaRolavel rotulo="Estudantes">
              <thead>
                <tr>
                  <th scope="col" className={CABECALHO}>Nome</th>
                  <th scope="col" className={CABECALHO}>E-mail</th>
                  <th scope="col" className={CABECALHO}>Cadastro</th>
                  <th scope="col" className={CABECALHO}>Último acesso</th>
                  <th scope="col" className={`${CABECALHO} text-right`}>Simulados</th>
                  <th scope="col" className={CABECALHO}>Carreira-alvo</th>
                </tr>
              </thead>
              <tbody>
                {dados.estudantes.map((e) => (
                  <tr key={e.id} className="border-t border-linha">
                    <th scope="row" className={`${CELULA} font-normal`}>
                      {e.nome ?? <span className="text-tinta-suave">Sem nome</span>}
                      {e.admin && (
                        <span className="ml-2 rounded-full border border-linha px-2 py-0.5 text-xs text-tinta-suave">admin</span>
                      )}
                    </th>
                    <td className={CELULA}>{e.email}</td>
                    <td className={CELULA}>{dataHora(e.criado_em)}</td>
                    <td className={CELULA}>{dataHora(e.ultimo_acesso_em)}</td>
                    <td className={`${CELULA} text-right`}>{e.simulados}</td>
                    <td className={CELULA}>{e.carreira_alvo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TabelaRolavel>
          </Atualizando>
        )}
        {dados && dados.total > 0 && (
          <nav aria-label="Páginas" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className={BOTAO_PEQUENO}
              disabled={filtro.pagina <= 1}
              onClick={() => mudar({ pagina: filtro.pagina - 1 })}
            >
              Anterior
            </button>
            <span className="text-tinta-suave">
              Página {filtro.pagina} de {paginas} · {formatarNumero(dados.total)}{' '}
              {dados.total === 1 ? 'estudante' : 'estudantes'}
            </span>
            <button
              type="button"
              className={BOTAO_PEQUENO}
              disabled={filtro.pagina >= paginas}
              onClick={() => mudar({ pagina: filtro.pagina + 1 })}
            >
              Próxima
            </button>
          </nav>
        )}
      </div>
    </>
  )
}
