import { Link, useSearchParams } from 'react-router-dom'

import { BotaoGoogle } from '../components/BotaoGoogle'
import { LINK } from '../components/estilos'
import { useTituloPagina } from '../hooks/useTituloPagina'

const MODOS = [
  ['Prova completa', '90 questões na distribuição da prova real, com 5 horas.'],
  ['Prova de um ano', 'A prova original de um ano, na ordem em que caiu, com 5 horas.'],
  ['Personalizado', 'Disciplinas, anos e quantidade de questões à sua escolha.'],
  ['Treino por questão', 'Uma questão por vez, sem cronômetro, com a resposta na hora.'],
] as const

/** Início para quem não entrou (CR-006, RN-017). Texto fixo: o catálogo é protegido (D2). */
export function ApresentacaoPage() {
  useTituloPagina()
  const [parametros] = useSearchParams()
  const pedido = parametros.get('voltar')
  // O servidor também filtra o caminho de volta (caminho_seguro); aqui só evita mandar lixo
  const voltar = pedido?.startsWith('/') && !pedido.startsWith('//') ? pedido : '/'

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Treine com questões reais da 1ª fase da FUVEST</h1>
      <p className="mt-3 text-lg text-tinta-suave">
        Simulados com questões das provas oficiais de anos anteriores, corrigidos na hora, com o seu desempenho por
        disciplina e por assunto.
      </p>

      {voltar !== '/' && (
        <p role="status" className="mt-6 rounded-md bg-caneta-clara px-3 py-2 text-caneta-escura">
          Entre com a sua conta Google para continuar.
        </p>
      )}
      <div className="mt-6">
        <BotaoGoogle voltar={voltar} />
      </div>
      <p className="mt-3 text-sm text-tinta-suave">
        Para usar o site, entre com a sua conta Google. Guardamos só seu nome, seu e-mail e os resultados dos
        simulados concluídos.{' '}
        <Link to="/privacidade" className={LINK}>
          Privacidade
        </Link>
      </p>

      <h2 className="mt-10 text-lg font-bold">Quatro jeitos de treinar</h2>
      <ul className="mt-2 divide-y divide-linha border-y border-linha">
        {MODOS.map(([titulo, descricao]) => (
          <li key={titulo} className="py-4">
            <h3 className="font-bold">{titulo}</h3>
            <p className="mt-0.5 text-tinta-suave">{descricao}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
