import { useSearchParams } from 'react-router-dom'

import type { ModoConcluido, PeriodoGestao } from '../../types'

/** Período da área de gestão (CR-013, specs/09 §3), guardado na URL (`?periodo=`). */
export const PERIODOS: { valor: PeriodoGestao; nome: string }[] = [
  { valor: '7', nome: 'Últimos 7 dias' },
  { valor: '30', nome: 'Últimos 30 dias' },
  { valor: '90', nome: 'Últimos 90 dias' },
  { valor: 'tudo', nome: 'Desde o início' },
]

export const PERIODO_PADRAO: PeriodoGestao = '30'

export function lerPeriodo(valor: string | null): PeriodoGestao {
  return PERIODOS.find((p) => p.valor === valor)?.valor ?? PERIODO_PADRAO
}

export function usePeriodo(): [PeriodoGestao, (periodo: PeriodoGestao) => void] {
  const [params, setParams] = useSearchParams()
  const definir = (periodo: PeriodoGestao) =>
    setParams(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        novos.set('periodo', periodo)
        return novos
      },
      { replace: true },
    )
  return [lerPeriodo(params.get('periodo')), definir]
}

export const NOMES_MODOS: Record<ModoConcluido | 'treino', string> = {
  completa: 'Prova completa',
  personalizado: 'Personalizado',
  ano: 'Prova de um ano',
  treino: 'Treino',
}

/** "30/09/2026" de "2026-09-30" (dia de Brasília, sem passar pelo fuso do navegador). */
export function dataIso(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

const inteiro = new Intl.NumberFormat('pt-BR')

export function formatarNumero(valor: number): string {
  return inteiro.format(valor)
}
