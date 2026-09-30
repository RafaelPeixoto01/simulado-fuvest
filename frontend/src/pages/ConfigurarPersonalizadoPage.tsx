import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Carregando, ErroCarregamento } from '../components/Estados'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { useCatalogo } from '../hooks/useCatalogo'
import { useConfirmarDescarte } from '../hooks/useConfirmarDescarte'
import { useIniciarSimulado } from '../hooks/useIniciarSimulado'
import { descricaoPersonalizado } from '../simulado/novoSimulado'
import type { Catalogo, Disciplina } from '../types'
import { formatarDuracao } from '../utils/tempo'

const SEGUNDOS_POR_QUESTAO = 200 // 5 h / 90 questões (RN-009)

function Formulario({ catalogo }: { catalogo: Catalogo }) {
  const anos = catalogo.provas.map((p) => p.ano).sort((a, b) => a - b)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [anoInicio, setAnoInicio] = useState(anos[0])
  const [anoFim, setAnoFim] = useState(anos[anos.length - 1])
  const [quantidade, setQuantidade] = useState(20)
  const [cronometro, setCronometro] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const { iniciar, iniciando, erro, limparErro } = useIniciarSimulado()
  const { comConfirmacao, dialogo } = useConfirmarDescarte()

  const todas = disciplinas.length === catalogo.disciplinas.length
  const alternar = (d: Disciplina) =>
    setDisciplinas((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]))

  const comecar = (qtd: number) => {
    const ordenadas = catalogo.disciplinas.map((d) => d.slug).filter((d) => disciplinas.includes(d))
    comConfirmacao(() =>
      iniciar(
        { modo: 'personalizado', disciplinas: ordenadas, quantidade: qtd, ano_inicio: anoInicio, ano_fim: anoFim, cronometro },
        descricaoPersonalizado(ordenadas, qtd),
      ),
    )
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    limparErro()
    if (disciplinas.length === 0) return setAviso('Escolha ao menos uma disciplina.')
    if (anoInicio > anoFim) return setAviso('O ano inicial não pode ser depois do final.')
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 90)
      return setAviso('A quantidade deve ficar entre 1 e 90 questões.')
    setAviso(null)
    comecar(quantidade)
  }

  const disponiveis = erro?.codigo === 'questoes_insuficientes' ? Number(erro.dados?.disponiveis ?? 0) : null

  return (
    <form onSubmit={enviar} className="mt-6 space-y-7" noValidate>
      <fieldset>
        <legend className="font-bold">Disciplinas</legend>
        <p className="text-sm text-tinta-suave">Questões interdisciplinares entram quando tocam uma das escolhidas.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {catalogo.disciplinas.map((d) => (
            <label key={d.slug} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-linha bg-papel px-3 py-2 has-checked:border-caneta has-checked:bg-caneta-clara">
              <input
                type="checkbox"
                className="size-4 accent-caneta"
                checked={disciplinas.includes(d.slug)}
                onChange={() => alternar(d.slug)}
              />
              <span>{d.nome}</span>
              <span className="ml-auto text-sm tabular-nums text-tinta-suave">{d.total_questoes} questões</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className={`${LINK} mt-2 text-sm`}
          onClick={() => setDisciplinas(todas ? [] : catalogo.disciplinas.map((d) => d.slug))}
        >
          {todas ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </fieldset>

      <fieldset>
        <legend className="font-bold">Anos</legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            De
            <select value={anoInicio} onChange={(e) => setAnoInicio(Number(e.target.value))} className="rounded-md border border-linha bg-papel px-2 py-1.5">
              {anos.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            até
            <select value={anoFim} onChange={(e) => setAnoFim(Number(e.target.value))} className="rounded-md border border-linha bg-papel px-2 py-1.5">
              {anos.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="quantidade" className="font-bold">Quantidade de questões</label>
        <input
          id="quantidade"
          type="number"
          min={1}
          max={90}
          value={Number.isNaN(quantidade) ? '' : quantidade}
          onChange={(e) => setQuantidade(e.target.valueAsNumber)}
          className="mt-2 block w-28 rounded-md border border-linha bg-papel px-3 py-1.5 tabular-nums"
        />
      </div>

      <div>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" className="size-4 accent-caneta" checked={cronometro} onChange={(e) => setCronometro(e.target.checked)} />
          <span className="font-bold">Cronometrar</span>
        </label>
        <p className="mt-1 text-sm text-tinta-suave">
          {cronometro && Number.isInteger(quantidade) && quantidade > 0
            ? `Tempo: ${formatarDuracao(quantidade * SEGUNDOS_POR_QUESTAO * 1000)}, o mesmo ritmo da prova (3 min 20 s por questão). Dá para pausar.`
            : 'Sem limite de tempo.'}
        </p>
      </div>

      {aviso && <p role="alert" className="text-erro">{aviso}</p>}
      {disponiveis !== null && (
        <div role="alert" className="rounded-lg border border-alerta/30 bg-alerta-claro px-4 py-3">
          {disponiveis > 0 ? (
            <>
              <p>Só existem {disponiveis} questões para esses filtros.</p>
              <button type="button" className={`${BOTAO_SECUNDARIO} mt-3`} onClick={() => comecar(disponiveis)}>
                Gerar com {disponiveis} questões
              </button>
            </>
          ) : (
            <p>Nenhuma questão encontrada para esses filtros.</p>
          )}
        </div>
      )}
      {erro && disponiveis === null && <ErroCarregamento mensagem={erro.message} />}

      <button type="submit" className={BOTAO_PRIMARIO} disabled={iniciando}>
        Começar simulado
      </button>
      {dialogo}
    </form>
  )
}

export function ConfigurarPersonalizadoPage() {
  const catalogo = useCatalogo()
  return (
    <div className="max-w-2xl">
      <Link to="/" className={`${LINK} text-sm`}>Voltar ao início</Link>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Simulado personalizado</h1>
      {catalogo.isPending && <Carregando />}
      {catalogo.isError && (
        <ErroCarregamento mensagem="Não foi possível carregar as provas." onTentar={() => catalogo.refetch()} />
      )}
      {catalogo.data && <Formulario catalogo={catalogo.data} />}
    </div>
  )
}
