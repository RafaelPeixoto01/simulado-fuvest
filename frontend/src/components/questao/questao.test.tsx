import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Questao } from '../../types'
import { Alternativas } from './Alternativas'
import { Blocos } from './Blocos'
import { QuestaoView } from './QuestaoView'

const QUESTAO: Questao = {
  id: '2099-020',
  prova: '2099',
  origem: 'FUVEST 2099',
  ano: 2099,
  numero: 20,
  disciplina: 'fisica',
  disciplinas_secundarias: [],
  texto_base_id: '2099-tb01',
  enunciado: [
    { texto: 'Observe o gráfico.\nSegunda linha.', figura: null },
    { texto: null, figura: '/figuras/2099/q020-1.webp' },
    { texto: 'É correto afirmar:', figura: null },
  ],
  alternativas: {
    A: { texto: 'Alternativa A', figura: null },
    B: { texto: 'Alternativa B', figura: null },
    C: { texto: null, figura: '/figuras/2099/q020-c.webp' },
    D: { texto: 'Alternativa D', figura: null },
    E: { texto: 'Alternativa E', figura: null },
  },
}

describe('Blocos (UT-008)', () => {
  it('renderiza texto como texto literal, nunca como HTML', () => {
    const { container } = render(
      <Blocos blocos={[{ texto: '<script>alert(1)</script><b>x</b>', figura: null }]} altFigura="Figura" />,
    )

    expect(screen.getByText('<script>alert(1)</script><b>x</b>')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
  })

  it('numera o texto alternativo das figuras', () => {
    render(
      <Blocos
        blocos={[
          { texto: null, figura: '/f/1.webp' },
          { texto: null, figura: '/f/2.webp' },
        ]}
        altFigura="Figura da questão 20, FUVEST 2099"
      />,
    )

    expect(screen.getByAltText('Figura da questão 20, FUVEST 2099 (1 de 2)')).toHaveAttribute('src', '/f/1.webp')
  })
})

describe('Alternativas (UT-007)', () => {
  it('seleciona com clique e mostra a marcada', async () => {
    const onSelecionar = vi.fn()
    render(<Alternativas alternativas={QUESTAO.alternativas} selecionada="B" onSelecionar={onSelecionar} />)

    await userEvent.click(screen.getByRole('radio', { name: /Alternativa D/ }))

    expect(onSelecionar).toHaveBeenCalledWith('D')
    expect(screen.getByRole('radio', { name: /Alternativa B/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Alternativa A/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('clicar na marcada também avisa (o estado desmarca)', async () => {
    const onSelecionar = vi.fn()
    render(<Alternativas alternativas={QUESTAO.alternativas} selecionada="B" onSelecionar={onSelecionar} />)

    await userEvent.click(screen.getByRole('radio', { name: /Alternativa B/ }))

    expect(onSelecionar).toHaveBeenCalledWith('B')
  })

  it('alternativa só com figura tem nome acessível', () => {
    render(<Alternativas alternativas={QUESTAO.alternativas} selecionada={null} onSelecionar={() => {}} />)

    expect(screen.getByRole('radio', { name: /Alternativa C/ })).toBeInTheDocument()
  })

  it('modo correção destaca certa e errada e bloqueia a escolha', async () => {
    const onSelecionar = vi.fn()
    render(
      <Alternativas
        alternativas={QUESTAO.alternativas}
        selecionada="B"
        onSelecionar={onSelecionar}
        correcao={{ correta: 'D', anulada: false }}
      />,
    )

    const correta = screen.getByRole('radio', { name: /Alternativa D/ })
    expect(correta).toHaveTextContent('Correta')
    expect(screen.getByRole('radio', { name: /Alternativa B/ })).toHaveTextContent('Sua resposta')
    await userEvent.click(correta)
    expect(onSelecionar).not.toHaveBeenCalled()
  })

  it('questão anulada avisa na correção', () => {
    render(
      <Alternativas
        alternativas={QUESTAO.alternativas}
        selecionada={null}
        onSelecionar={() => {}}
        correcao={{ correta: null, anulada: true }}
      />,
    )

    expect(screen.getByText(/Questão anulada pela FUVEST/)).toBeInTheDocument()
  })
})

describe('QuestaoView', () => {
  it('mostra posição, fonte, texto-base, enunciado e alternativas', () => {
    render(
      <QuestaoView
        questao={QUESTAO}
        textoBase={{ id: '2099-tb01', conteudo: [{ texto: 'Texto compartilhado', figura: null }] }}
        posicao={{ atual: 3, total: 90 }}
        selecionada={null}
        onSelecionar={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Questão 3 de 90' })).toBeInTheDocument()
    expect(screen.getByText('Física, FUVEST 2099 (questão 20)')).toBeInTheDocument()
    expect(screen.getByText('Texto compartilhado')).toBeInTheDocument()
    expect(screen.getByText(/Observe o gráfico/)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('mostra a origem da questão de um simulado oficial (UT-066, CR-011)', () => {
    render(
      <QuestaoView
        questao={{ ...QUESTAO, id: '2027s1-020', prova: '2027s1', origem: 'Simulado FUVEST 2027 · 1ª edição', ano: 2027 }}
        posicao={{ atual: 1, total: 80 }}
        selecionada={null}
        onSelecionar={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Questão 1 de 80' })).toBeInTheDocument()
    expect(screen.getByText('Física, Simulado FUVEST 2027 · 1ª edição (questão 20)')).toBeInTheDocument()
    expect(screen.getByAltText('Figura da questão 20, Simulado FUVEST 2027 · 1ª edição')).toBeInTheDocument()
  })
})
