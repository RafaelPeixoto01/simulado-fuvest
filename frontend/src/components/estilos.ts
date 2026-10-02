// Uma única cor de ação, a tinta azul-marinho (CR-008); o resto da interface fica em tinta e papel.
export const BOTAO_PRIMARIO =
  'inline-flex items-center justify-center rounded-md bg-caneta px-4 py-2 font-semibold text-fundo hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave'

export const BOTAO_SECUNDARIO =
  'inline-flex items-center justify-center rounded-md border border-borda-campo bg-papel px-4 py-2 font-semibold text-tinta hover:border-caneta disabled:cursor-not-allowed disabled:text-tinta-suave'

// Secundário menor, para ações dentro de listas e tabelas (notas de corte, CR-010)
export const BOTAO_PEQUENO =
  'inline-flex items-center justify-center rounded-md border border-borda-campo bg-papel px-3 py-1 text-sm font-semibold text-tinta hover:border-caneta disabled:cursor-not-allowed disabled:text-tinta-suave'

export const LINK = 'font-semibold text-caneta underline underline-offset-4 hover:text-caneta-escura'

// Cartão (CR-008, I4): papel, borda linha, cantos de 16 px, sem sombra. Padding fica com quem usa
export const CARTAO = 'rounded-2xl border border-linha bg-papel'

// Barras fixas da resolução (CR-001): 48 px no celular, 44 px no desktop; cabem numa linha em 320 px.
// Sem padding nem cor de fundo/borda na forma: no Tailwind v4, classes do mesmo tipo acrescentadas
// depois NÃO sobrescrevem as da constante (vale a ordem do CSS gerado), então cada uso escolhe as suas.
export const BOTAO_BARRA_PRIMARIO =
  'inline-flex h-12 items-center justify-center gap-0.5 rounded-lg bg-caneta font-bold text-fundo hover:bg-caneta-escura disabled:cursor-not-allowed disabled:bg-linha disabled:text-tinta-suave lg:h-11'

export const BOTAO_BARRA_FORMA =
  'inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border text-[0.9375rem] font-semibold disabled:cursor-not-allowed lg:h-11'

export const BARRA_NEUTRO =
  'border-borda-campo bg-papel text-tinta hover:border-caneta disabled:text-tinta-suave/70 disabled:hover:border-borda-campo'

export const BARRA_ALERTA = 'border-alerta bg-alerta-claro text-alerta'
