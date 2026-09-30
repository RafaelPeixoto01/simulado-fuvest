import { Link } from 'react-router-dom'

export function NaoEncontradaPage() {
  return (
    <section className="max-w-prose">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-tinta-suave">O endereço não existe ou foi digitado errado.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-caneta underline underline-offset-4">
        Voltar ao início
      </Link>
    </section>
  )
}
