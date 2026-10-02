import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { LINK } from '../components/estilos'
import { useTituloPagina } from '../hooks/useTituloPagina'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg">{titulo}</h2>
      <div className="mt-2 space-y-2 text-tinta-suave">{children}</div>
    </section>
  )
}

/** O que o site guarda e como apagar (RF-026, RNF-005, CR-005). */
export function PrivacidadePage() {
  useTituloPagina('Privacidade')

  return (
    <div className="max-w-prose">
      <h1 className="text-2xl sm:text-3xl">Privacidade</h1>
      <p className="mt-2 text-tinta-suave">
        O Simulado Fuvest é gratuito e não tem publicidade. Esta página diz o que guardamos sobre você e como apagar.
      </p>

      <Secao titulo="Antes de entrar">
        <p>
          Para usar o site, é preciso entrar com a conta Google. Antes disso, só a apresentação e esta página abrem:
          nenhum dado vai para o servidor e nenhum cookie é criado.
        </p>
        <p>
          Os reportes de erro em questões não guardam quem reportou, e contamos quantos simulados são gerados por dia,
          sem saber quem os gerou.
        </p>
      </Secao>

      <Secao titulo="Com a conta Google">
        <p>
          Guardamos o identificador da sua conta Google, seu nome, seu e-mail e os 50 simulados concluídos mais
          recentes (respostas, acertos e datas). Servem só para mostrar o seu histórico e o seu desempenho em qualquer
          dispositivo em que você entrar.
        </p>
        <p>
          Do Google recebemos só o nome e o e-mail. Não temos acesso à sua senha nem a nenhum outro dado da conta. Não
          compartilhamos nada com ninguém nem usamos os dados para publicidade.
        </p>
      </Secao>

      <Secao titulo="Cookies">
        <p>
          Só quem entra com a conta recebe cookies: um de sessão, que dura 90 dias, e um temporário durante o login.
          Não usamos cookies de rastreamento nem scripts de terceiros.
        </p>
      </Secao>

      <Secao titulo="Apagar seus dados">
        <p>
          Em{' '}
          <Link to="/conta" className={LINK}>
            Conta
          </Link>
          , "Excluir conta" apaga na hora seu nome, seu e-mail e todo o histórico guardado no servidor. "Sair" tira o
          histórico deste navegador, e ele continua na conta.
        </p>
      </Secao>

      <Secao titulo="Contato">
        <p>
          Dúvidas ou pedidos sobre seus dados:{' '}
          <a
            className={LINK}
            href="https://github.com/RafaelPeixoto01/simulado-fuvest/issues"
            target="_blank"
            rel="noreferrer"
          >
            issues do projeto no GitHub
          </a>
          .
        </p>
      </Secao>
    </div>
  )
}
