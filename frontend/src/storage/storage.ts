// Todo acesso ao localStorage passa por aqui (02-ARCHITECTURE §5): o storage pode
// estar bloqueado (modo privado, politica do navegador) e o site tem que funcionar.

const CHAVE_TESTE = 'simulado-fuvest:teste'

export function storageDisponivel(): boolean {
  try {
    localStorage.setItem(CHAVE_TESTE, '1')
    localStorage.removeItem(CHAVE_TESTE)
    return true
  } catch {
    return false
  }
}

/** Valor salvo, ou null se nao houver, se o storage falhar ou se o JSON estiver corrompido. */
export function lerJSON(chave: string): unknown {
  let texto: string | null
  try {
    texto = localStorage.getItem(chave)
  } catch {
    return null
  }
  if (texto === null) return null
  try {
    return JSON.parse(texto)
  } catch {
    remover(chave)
    return null
  }
}

export function gravarJSON(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

export function remover(chave: string): void {
  try {
    localStorage.removeItem(chave)
  } catch {
    // storage indisponivel: nada a remover
  }
}
