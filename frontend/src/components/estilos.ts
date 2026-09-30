// Uma única cor de ação (azul de caneta); o resto da interface fica em tinta e papel.
export const BOTAO_PRIMARIO =
  'inline-flex items-center justify-center rounded-md bg-caneta px-4 py-2 font-semibold text-papel hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave'

export const BOTAO_SECUNDARIO =
  'inline-flex items-center justify-center rounded-md border border-linha bg-papel px-4 py-2 font-semibold text-tinta hover:border-caneta/50 disabled:cursor-not-allowed disabled:text-tinta-suave'

export const LINK = 'font-semibold text-caneta underline underline-offset-4 hover:text-caneta-escura'

// Barras fixas da resolução (CR-001): 48 px no celular, 44 px no desktop; cabem numa linha em 320 px
export const BOTAO_BARRA_PRIMARIO =
  'inline-flex h-12 items-center justify-center gap-0.5 rounded-lg bg-caneta px-4 font-bold text-papel hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave lg:h-11'

export const BOTAO_BARRA_SECUNDARIO =
  'inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-linha bg-papel px-3 font-semibold text-tinta hover:border-caneta/50 disabled:cursor-not-allowed disabled:text-tinta-suave/70 disabled:hover:border-linha lg:h-11'
