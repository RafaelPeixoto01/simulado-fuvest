import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { instalarApiFalsa, json, questaoFalsa } from '../../test/apiFalsa'
import { QuestaoView } from './QuestaoView'

function renderQuestao() {
  render(<QuestaoView questao={questaoFalsa('2099-010')} selecionada={null} onSelecionar={() => {}} />)
}

async function abrir() {
  await userEvent.click(screen.getByRole('button', { name: 'Reportar problema' }))
  return screen.getByRole('dialog', { name: 'Reportar problema na questão' })
}

describe('Reportar problema (RF-021)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('envia tipo e descrição e agradece', async () => {
    const pedidos: unknown[] = []
    instalarApiFalsa({ 'POST /api/reportes': (corpo) => (pedidos.push(corpo), json(201, { id: 7 })) })
    renderQuestao()

    const dialogo = await abrir()
    const enviar = within(dialogo).getByRole('button', { name: 'Enviar' })
    expect(enviar).toBeDisabled() // tipo é obrigatório

    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Figura faltando ou ilegível' }))
    await userEvent.type(within(dialogo).getByRole('textbox', { name: /Descrição/ }), 'Mapa cortado')
    expect(within(dialogo).getByText('12/500')).toBeInTheDocument()
    await userEvent.click(enviar)

    expect(await screen.findByText('Obrigado! Vamos revisar esta questão.')).toBeInTheDocument()
    expect(pedidos).toEqual([{ questao_id: '2099-010', tipo: 'figura', descricao: 'Mapa cortado' }])
  })

  it('limite de envios tem mensagem própria', async () => {
    instalarApiFalsa({ 'POST /api/reportes': () => json(429, { detail: 'Muitas requisições.' }) })
    renderQuestao()

    const dialogo = await abrir()
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Gabarito incorreto' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Muitos envios em pouco tempo. Tente mais tarde.')).toBeInTheDocument()
  })

  it('outro erro permite tentar de novo', async () => {
    instalarApiFalsa({ 'POST /api/reportes': () => json(500, { detail: 'x' }) })
    renderQuestao()

    const dialogo = await abrir()
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Outro' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Não foi possível enviar. Tente novamente.')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('Esc fecha sem enviar', async () => {
    const api = instalarApiFalsa({})
    renderQuestao()

    await abrir()
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api).not.toHaveBeenCalled()
  })

  it('descrição limitada a 500 caracteres', async () => {
    instalarApiFalsa({})
    renderQuestao()

    const dialogo = await abrir()

    expect(within(dialogo).getByRole('textbox', { name: /Descrição/ })).toHaveAttribute('maxLength', '500')
  })
})
