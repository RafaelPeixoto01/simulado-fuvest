const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

export function formatarPercentual(valor: number): string {
  return `${numero.format(valor)}%`
}

/** "29/09/2026 22:05" */
export function formatarDataHora(epochMs: number): string {
  const d = new Date(epochMs)
  return `${data.format(d)} ${hora.format(d)}`
}

/** "30/09" (CR-008: "Seu último simulado") */
export function formatarDiaMes(epochMs: number): string {
  return diaMes.format(new Date(epochMs))
}

/** Primeiro nome para o cabeçalho (CR-005, D3); "Conta" se o Google não mandou nome. */
export function primeiroNome(nome: string | null): string {
  return nome?.trim().split(/\s+/)[0] || 'Conta'
}
