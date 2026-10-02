import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { BotaoGoogle } from '../components/BotaoGoogle'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Carregando, ErroCarregamento } from '../components/Estados'
import { BOTAO_SECUNDARIO, LINK } from '../components/estilos'
import { useExcluirConta, useSair } from '../hooks/useConta'
import { useHistorico } from '../hooks/useHistorico'
import { useSessao } from '../hooks/useSessao'
import { useTituloPagina } from '../hooks/useTituloPagina'
import type { Usuario } from '../types'

const AVISO_ERRO = 'mt-4 rounded-md bg-erro-claro px-3 py-2 text-erro'

function SemConta() {
  return (
    <>
      <p className="mt-2 text-tinta-suave">
        Entre com a sua conta Google para usar o site. O histórico fica na sua conta e aparece em qualquer
        dispositivo. Os simulados já feitos neste navegador vão para a sua conta.
      </p>
      <p className="mt-3 text-tinta-suave">
        Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos. O simulado em andamento continua só
        neste navegador.{' '}
        <Link to="/privacidade" className={LINK}>
          Privacidade
        </Link>
      </p>
      <div className="mt-6">
        <BotaoGoogle voltar="/conta" />
      </div>
    </>
  )
}

interface PropsConectado {
  usuario: Usuario
  sair: ReturnType<typeof useSair>
  excluir: ReturnType<typeof useExcluirConta>
  aoSair: () => void
  aoExcluir: () => void
}

function Conectado({ usuario, sair, excluir, aoSair, aoExcluir }: PropsConectado) {
  const { entradas, sincronizando, erroSincronizacao } = useHistorico()
  const [confirmando, setConfirmando] = useState(false)
  const quantos = entradas.length

  return (
    <>
      <div className="mt-6 rounded-xl border border-linha bg-papel p-5">
        <p>
          Conectado como <strong>{usuario.nome ?? usuario.email}</strong>
          {usuario.nome && <span className="text-tinta-suave"> ({usuario.email})</span>}
        </p>
        <p className="mt-2 text-tinta-suave" aria-live="polite">
          {sincronizando
            ? 'Sincronizando o histórico…'
            : erroSincronizacao
              ? 'Não foi possível sincronizar agora. Tentaremos de novo.'
              : `${quantos} ${quantos === 1 ? 'simulado' : 'simulados'} na sua conta.`}
        </p>
        <Link to="/historico" className={`${LINK} mt-3 inline-block`}>
          Ver histórico
        </Link>
      </div>

      <section aria-labelledby="conta-sair" className="mt-8">
        <h2 id="conta-sair" className="text-lg">
          Sair
        </h2>
        <p className="mt-1 text-tinta-suave">Ao sair, o histórico deixa este navegador e continua na sua conta.</p>
        <button
          type="button"
          className={`${BOTAO_SECUNDARIO} mt-3`}
          disabled={sair.isPending}
          onClick={() => sair.mutate(undefined, { onSuccess: aoSair })}
        >
          {sair.isPending ? 'Saindo…' : 'Sair'}
        </button>
        {sair.isError && (
          <p role="alert" className={AVISO_ERRO}>
            Não foi possível enviar os simulados pendentes para a sua conta. Verifique sua internet e tente sair de novo.
          </p>
        )}
      </section>

      <section aria-labelledby="conta-excluir" className="mt-8 border-t border-linha pt-6">
        <h2 id="conta-excluir" className="text-lg">
          Excluir conta
        </h2>
        <p className="mt-1 text-tinta-suave">
          Apaga seu nome, seu e-mail e todo o histórico guardado na conta, em todos os dispositivos.
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-erro/40 bg-papel px-4 py-2 font-semibold text-erro hover:bg-erro-claro disabled:cursor-not-allowed"
          disabled={excluir.isPending}
          onClick={() => setConfirmando(true)}
        >
          Excluir conta
        </button>
        {excluir.isError && (
          <p role="alert" className={AVISO_ERRO}>
            Não foi possível excluir a conta agora. Tente novamente.
          </p>
        )}
      </section>

      {confirmando && (
        <ConfirmDialog
          titulo="Excluir a conta?"
          confirmar="Excluir conta"
          perigoso
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            setConfirmando(false)
            excluir.mutate(undefined, { onSuccess: aoExcluir })
          }}
        >
          Seu nome, seu e-mail e todo o histórico guardado na conta serão apagados. Não dá para desfazer.
        </ConfirmDialog>
      )}
    </>
  )
}

/** Página da conta (RF-024, RF-026, specs/07 §3). */
export function ContaPage() {
  useTituloPagina('Conta')
  const [parametros] = useSearchParams()
  const sessao = useSessao()
  // As mutations ficam aqui: sair e excluir trocam a sessão e desmontam <Conectado>
  const sair = useSair()
  const excluir = useExcluirConta()
  const [status, setStatus] = useState<string | null>(null)

  let conteudo
  if (sessao.isPending) {
    conteudo = <Carregando />
  } else if (sessao.isError) {
    conteudo = (
      <div className="mt-4">
        <ErroCarregamento
          mensagem="Não foi possível verificar a sua conta. Verifique sua internet."
          onTentar={() => void sessao.refetch()}
        />
      </div>
    )
  } else if (sessao.data.usuario) {
    conteudo = (
      <Conectado
        usuario={sessao.data.usuario}
        sair={sair}
        excluir={excluir}
        aoSair={() => setStatus('Você saiu. Seu histórico continua na sua conta.')}
        aoExcluir={() => setStatus('Sua conta e o histórico guardado nela foram excluídos.')}
      />
    )
  } else if (!sessao.data.login_disponivel) {
    conteudo = (
      <p className="mt-2 text-tinta-suave">
        O login com Google não está disponível no momento. O histórico continua guardado neste navegador.
      </p>
    )
  } else {
    conteudo = <SemConta />
  }

  const erroLogin = parametros.get('erro') === 'login' && !sessao.data?.usuario && !status
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl">Conta</h1>
      {status && (
        <p role="status" className="mt-4 rounded-md bg-acerto-claro px-3 py-2 text-acerto">
          {status}
        </p>
      )}
      {erroLogin && (
        <p role="alert" className={AVISO_ERRO}>
          Não foi possível entrar com o Google. Tente novamente.
        </p>
      )}
      {conteudo}
    </div>
  )
}
