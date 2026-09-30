// Uma única cor de ação (azul de caneta); o resto da interface fica em tinta e papel.
export const BOTAO_PRIMARIO =
  'inline-flex items-center justify-center rounded-md bg-caneta px-4 py-2 font-semibold text-papel hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave'

export const BOTAO_SECUNDARIO =
  'inline-flex items-center justify-center rounded-md border border-linha bg-papel px-4 py-2 font-semibold text-tinta hover:border-caneta/50 disabled:cursor-not-allowed disabled:text-tinta-suave'

export const LINK = 'font-semibold text-caneta underline underline-offset-4 hover:text-caneta-escura'

// Barra fixa da resolução: cabe numa linha no celular (360 px)
export const BOTAO_PRIMARIO_COMPACTO =
  'inline-flex items-center justify-center rounded-md bg-caneta px-3 py-1.5 text-sm font-semibold text-papel hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave sm:px-4 sm:py-2 sm:text-base'

export const BOTAO_SECUNDARIO_COMPACTO =
  'inline-flex items-center justify-center rounded-md border border-linha bg-papel px-3 py-1.5 text-sm font-semibold text-tinta hover:border-caneta/50'
