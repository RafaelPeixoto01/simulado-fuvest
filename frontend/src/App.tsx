export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold">Simulado Fuvest</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8" />
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-slate-600">
          Este site não é afiliado à FUVEST nem à USP. As questões vêm do{' '}
          <a
            className="underline"
            href="https://www.fuvest.br/acervo/"
            target="_blank"
            rel="noreferrer"
          >
            acervo oficial da FUVEST
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
