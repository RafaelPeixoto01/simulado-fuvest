import { useState } from 'react'

import { BarraPercentual } from '../../components/BarraPercentual'
import { Carregando, ErroCarregamento, Vazio } from '../../components/Estados'
import { BOTAO_PEQUENO, BOTAO_PRIMARIO, CARTAO, LINK } from '../../components/estilos'
import { QuestaoView } from '../../components/questao/QuestaoView'
import { useGestaoQualidade, useGestaoReportes, useResolverReportes } from '../../hooks/useGestao'
import { useQuestoes } from '../../hooks/useQuestoes'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import {
  type Letra,
  NOMES_DISCIPLINAS,
  type QualidadeGestao,
  type QuestaoSuspeita,
  type ReporteGestao,
  type StatusReporte,
  type TipoReporte,
} from '../../types'
import { formatarDataHora, formatarPercentual } from '../../utils/format'
import { Atualizando, CABECALHO, CartaoNumero, CELULA, Secao, TabelaRolavel } from './componentes'
import { formatarNumero } from './periodo'

const TIPOS: Record<TipoReporte, string> = {
  enunciado: 'Enunciado ou alternativa',
  figura: 'Figura',
  gabarito: 'Gabarito',
  outro: 'Outro',
}

const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E']

const dataHora = (iso: string) => formatarDataHora(Date.parse(iso))

/** A questão como o estudante a vê, com o gabarito marcado e sem "Reportar problema". */
function QuestaoAberta({ questaoId, gabarito, anulada }: { questaoId: string; gabarito: Letra | null; anulada: boolean }) {
  const { data, isPending } = useQuestoes([questaoId])
  if (isPending) return <Carregando texto="Carregando a questão…" />
  const questao = data?.questoes[0]
  if (!questao) return <p className="mt-3 text-sm text-tinta-suave">Não foi possível abrir a questão.</p>
  const textoBase = questao.texto_base_id ? (data.textos_base[questao.texto_base_id] ?? null) : null
  return (
    <div className="mt-3 rounded-lg border border-linha bg-fundo p-4">
      <QuestaoView
        questao={questao}
        textoBase={textoBase}
        selecionada={null}
        onSelecionar={() => {}}
        correcao={{ correta: gabarito, anulada }}
        reportavel={false}
      />
    </div>
  )
}

function BotaoVerQuestao({ aberta, onAlternar }: { aberta: boolean; onAlternar: () => void }) {
  return (
    <button type="button" className={`${LINK} mt-2 text-sm`} aria-expanded={aberta} onClick={onAlternar}>
      {aberta ? 'Esconder questão' : 'Ver questão'}
    </button>
  )
}

function Base({ dados }: { dados: QualidadeGestao }) {
  const { base } = dados
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CartaoNumero rotulo="Provas" valor={formatarNumero(base.provas)} />
        <CartaoNumero rotulo="Questões válidas" valor={formatarNumero(base.questoes)} />
        <CartaoNumero rotulo="Anuladas" valor={formatarNumero(base.anuladas)} />
        <CartaoNumero
          rotulo="Sem assunto"
          valor={<span className={base.sem_assunto > 0 ? 'text-alerta' : ''}>{formatarNumero(base.sem_assunto)}</span>}
          detalhe={base.sem_assunto > 0 ? 'deveria ser zero (V11)' : undefined}
        />
      </dl>
      {base.sincronizado_em && (
        <p className="mt-3 text-sm text-tinta-suave">Sincronizado em {dataHora(base.sincronizado_em)}.</p>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <TabelaRolavel rotulo="Provas da base">
          <thead>
            <tr>
              <th scope="col" className={CABECALHO}>Prova</th>
              <th scope="col" className={`${CABECALHO} text-right`}>Questões</th>
              <th scope="col" className={`${CABECALHO} text-right`}>Anuladas</th>
            </tr>
          </thead>
          <tbody>
            {dados.provas.map((p) => (
              <tr key={p.codigo} className="border-t border-linha">
                <th scope="row" className={`${CELULA} font-normal`}>{p.rotulo}</th>
                <td className={`${CELULA} text-right`}>
                  {p.questoes}
                  {p.questoes !== p.total_questoes && <span className="text-tinta-suave"> de {p.total_questoes}</span>}
                </td>
                <td className={`${CELULA} text-right`}>{p.anuladas}</td>
              </tr>
            ))}
          </tbody>
        </TabelaRolavel>
        <TabelaRolavel rotulo="Questões válidas por disciplina">
          <thead>
            <tr>
              <th scope="col" className={CABECALHO}>Disciplina</th>
              <th scope="col" className={`${CABECALHO} text-right`}>Válidas</th>
            </tr>
          </thead>
          <tbody>
            {dados.disciplinas.map((d) => (
              <tr key={d.disciplina} className="border-t border-linha">
                <th scope="row" className={`${CELULA} font-normal`}>{NOMES_DISCIPLINAS[d.disciplina]}</th>
                <td className={`${CELULA} text-right`}>{formatarNumero(d.questoes)}</td>
              </tr>
            ))}
          </tbody>
        </TabelaRolavel>
      </div>
    </>
  )
}

function descricaoDaQuestao(q: NonNullable<ReporteGestao['questao']>): string {
  const gabarito = q.anulada ? 'anulada' : `gabarito ${q.gabarito}`
  return `${q.prova}, questão ${q.numero} · ${NOMES_DISCIPLINAS[q.disciplina]} · ${gabarito}`
}

function mensagemDaResolucao(resolvidos: number, outros: number): string {
  const feitos = resolvidos === 1 ? '1 reporte marcado como resolvido.' : `${resolvidos} reportes marcados como resolvidos.`
  if (outros === 0) return feitos
  // Outra aba resolveu antes, por exemplo
  return `${feitos} ${outros === 1 ? '1 já estava resolvido ou não existe mais.' : `${outros} já estavam resolvidos ou não existem mais.`}`
}

// Filtro escolhido: a variante aria-pressed não disputa com as cores da constante (CLAUDE.md, Tailwind v4)
const FILTRO = `${BOTAO_PEQUENO} aria-pressed:border-caneta aria-pressed:bg-caneta-clara`

function Reportes({ dados }: { dados: QualidadeGestao }) {
  const [status, setStatus] = useState<StatusReporte>('pendente')
  const consulta = useGestaoReportes(status)
  const resolver = useResolverReportes()
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [aberta, setAberta] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const { reportes: resumo } = dados
  const pendentes = status === 'pendente'

  function trocar(novo: StatusReporte) {
    setStatus(novo)
    setSelecionados([])
    setAberta(null)
  }

  function alternar(id: number) {
    setSelecionados((atuais) => (atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]))
  }

  function marcar() {
    setMensagem(null)
    resolver.mutate(selecionados, {
      onSuccess: (r) => {
        setMensagem(mensagemDaResolucao(r.resolvidos.length, r.ja_resolvidos.length + r.inexistentes.length))
        setSelecionados([])
        setAberta(null)
      },
    })
  }

  const lista = consulta.data?.reportes
  return (
    <>
      <p className="text-sm text-tinta-suave">
        {formatarNumero(resumo.pendentes)} {resumo.pendentes === 1 ? 'pendente' : 'pendentes'} ·{' '}
        {formatarNumero(resumo.resolvidos)} {resumo.resolvidos === 1 ? 'resolvido' : 'resolvidos'} ·{' '}
        {formatarNumero(resumo.questoes_com_reporte_resolvido)} questões com reporte resolvido
        {resumo.indice_resolvidos !== null && ` (${formatarPercentual(resumo.indice_resolvidos)} das válidas; meta abaixo de 2%)`}.
        Resolvido inclui os reportes descartados.
      </p>
      <div role="group" aria-label="Quais reportes" className="mt-4 flex gap-2">
        <button type="button" className={FILTRO} aria-pressed={pendentes} onClick={() => trocar('pendente')}>
          Pendentes
        </button>
        <button type="button" className={FILTRO} aria-pressed={!pendentes} onClick={() => trocar('resolvido')}>
          Resolvidos recentemente
        </button>
      </div>
      <div role="status" className="mt-3 text-sm empty:hidden">
        {mensagem}
      </div>
      {resolver.isError && (
        <p role="alert" className="mt-3 text-sm text-erro">
          {resolver.error.message}
        </p>
      )}
      <div className="mt-4">
        {consulta.isPending ? (
          <Carregando />
        ) : !lista ? (
          <ErroCarregamento mensagem="Não foi possível carregar os reportes." onTentar={() => void consulta.refetch()} />
        ) : lista.length === 0 ? (
          <Vazio>{pendentes ? 'Nenhum reporte pendente.' : 'Nenhum reporte resolvido.'}</Vazio>
        ) : (
          <Atualizando ativo={consulta.isPlaceholderData}>
            <ul className="space-y-3">
              {lista.map((r) => (
                <li key={r.id} className={`${CARTAO} p-4`}>
                  <div className="flex items-start gap-3">
                    {pendentes && (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-caneta"
                        aria-label={`Selecionar reporte ${r.id}`}
                        checked={selecionados.includes(r.id)}
                        onChange={() => alternar(r.id)}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-tinta-suave">
                        #{r.id} · {TIPOS[r.tipo]} · {dataHora(r.criado_em)}
                        {r.resolvido_em && ` · resolvido em ${dataHora(r.resolvido_em)}`}
                      </p>
                      <p className="mt-1 font-semibold">
                        {r.questao ? descricaoDaQuestao(r.questao) : `${r.questao_id}: questão fora da base`}
                      </p>
                      {r.descricao && <p className="mt-1 break-words whitespace-pre-line">“{r.descricao}”</p>}
                      {r.questao && (
                        <BotaoVerQuestao aberta={aberta === r.id} onAlternar={() => setAberta(aberta === r.id ? null : r.id)} />
                      )}
                      {aberta === r.id && r.questao && (
                        <QuestaoAberta questaoId={r.questao_id} gabarito={r.questao.gabarito} anulada={r.questao.anulada} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {pendentes && (
              <button
                type="button"
                className={`${BOTAO_PRIMARIO} mt-4`}
                disabled={selecionados.length === 0 || resolver.isPending}
                onClick={marcar}
              >
                {selecionados.length === 1 ? 'Marcar 1 como resolvido' : `Marcar ${selecionados.length} como resolvidos`}
              </button>
            )}
          </Atualizando>
        )}
      </div>
    </>
  )
}

function textoDosMotivos(s: QuestaoSuspeita): string[] {
  const marcadas = (l: Letra) => s.marcacoes[l.toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e']
  const atrai = LETRAS.filter((l) => l !== s.gabarito).sort((x, y) => marcadas(y) - marcadas(x))[0]
  return s.motivos.map((m) =>
    m === 'acerto_baixo' ? 'Acerto abaixo de 15%' : `A alternativa ${atrai} foi mais marcada que a correta`,
  )
}

function Suspeita({ s }: { s: QuestaoSuspeita }) {
  const [aberta, setAberta] = useState(false)
  const linhas: { rotulo: string; valor: number; correta: boolean }[] = [
    ...LETRAS.map((l) => ({
      rotulo: l,
      valor: s.marcacoes[l.toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e'],
      correta: l === s.gabarito,
    })),
    { rotulo: 'Em branco', valor: s.marcacoes.em_branco, correta: false },
  ]
  return (
    <li className={`${CARTAO} p-4`}>
      <h3 className="font-semibold">
        {s.prova}, questão {s.numero}
      </h3>
      <p className="text-sm text-tinta-suave">
        {NOMES_DISCIPLINAS[s.disciplina]}
        {s.assunto && ` · ${s.assunto}`}
      </p>
      <p className="mt-2 text-sm">
        Acerto de {formatarPercentual(s.percentual)} em {formatarNumero(s.respostas)} respostas · gabarito {s.gabarito}
      </p>
      <ul className="mt-1 text-sm font-semibold text-alerta">
        {textoDosMotivos(s).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <ul aria-label={`Marcações da questão ${s.numero}`} className="mt-3 space-y-1.5">
        {linhas.map((l) => (
          <li key={l.rotulo} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
            <span className={l.correta ? 'font-semibold' : ''}>
              {l.rotulo}
              {l.correta && ' (correta)'}
            </span>
            <BarraPercentual percentual={s.respostas ? (l.valor / s.respostas) * 100 : 0} fina />
            <span className="text-right tabular-nums text-tinta-suave">{formatarNumero(l.valor)}</span>
          </li>
        ))}
      </ul>
      <BotaoVerQuestao aberta={aberta} onAlternar={() => setAberta((a) => !a)} />
      {aberta && <QuestaoAberta questaoId={s.questao_id} gabarito={s.gabarito} anulada={false} />}
    </li>
  )
}

/** Aba Qualidade (CR-013, RF-033, RN-022). */
export function QualidadePage() {
  useTituloPagina('Gestão · Qualidade')
  const consulta = useGestaoQualidade()
  const dados = consulta.data

  if (consulta.isPending) return <Carregando />
  if (!dados) {
    return <ErroCarregamento mensagem="Não foi possível carregar os números." onTentar={() => void consulta.refetch()} />
  }
  return (
    <>
      <Secao titulo="Base de questões">
        <Base dados={dados} />
      </Secao>
      <Secao titulo="Reportes de erro">
        <Reportes dados={dados} />
      </Secao>
      <Secao
        titulo="Questões suspeitas"
        nota="Com pelo menos 20 respostas, acerto abaixo de 15% ou uma alternativa errada mais marcada que a correta. É um sinal para conferir o gabarito e o enunciado, não uma correção."
      >
        {dados.suspeitas.length === 0 ? (
          <Vazio>Nenhuma questão suspeita (mínimo de 20 respostas por questão).</Vazio>
        ) : (
          <ul className="space-y-3">
            {dados.suspeitas.map((s) => (
              <Suspeita key={s.questao_id} s={s} />
            ))}
          </ul>
        )}
      </Secao>
    </>
  )
}
