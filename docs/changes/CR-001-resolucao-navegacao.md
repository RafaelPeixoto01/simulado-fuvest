# Change Request — CR-001: Resolução — navegação, folha de respostas e pausa

**Versão:** 1.0  
**Data:** 2026-09-30  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Primeiro CR da revisão de design de 30/09/2026 (canvas "Protótipo Simulado Fuvest", tela "Revisão de design · itens numerados"). Corrige a navegação da tela de resolução: os itens P1.1 (parte da resolução), P1.2, P1.3, P1.4, P1.5 e P1.8, com as decisões D1, D2 e D3 do protótipo e mais uma decisão de estrutura tomada ao abrir este CR (D5, modo foco). A implementação segue as telas "Resolução · celular" e "Resolução · desktop" do protótipo.

---

## 2. Classificação

| Campo            | Valor                                                                 |
|------------------|-----------------------------------------------------------------------|
| Tipo             | Bug Fix (usabilidade e acessibilidade) + ajuste de comportamento da pausa |
| Origem           | Revisão de design (Playwright em 1440, 390 e 320 px, build do `master` `0d11ac5`) |
| Urgência         | Próxima sprint                                                        |
| Complexidade     | Média                                                                 |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
A resolução (`/simulado`) fica dentro do `Layout` do site, com cabeçalho e rodapé. Uma barra fixa no topo traz o cronômetro, o botão "Folha x/n" (só no celular) e o botão azul "Finalizar". Os botões Anterior, Marcar para revisar e Próxima ficam no fim da questão. No desktop, a folha de respostas fica numa coluna fixa com 2 colunas de 45 linhas e rolagem própria. No celular, a folha abre como um painel de tela cheia. A pausa do Personalizado só para o relógio.

### Problema ou Necessidade
Itens da revisão de design:

1. **Trocar de questão não volta ao topo.** `irPara` (`ResolucaoPage.tsx:40`) só troca o índice: no celular, depois de "Próxima", o título da questão seguinte fica 1.375 px acima da tela. A parte da revisão do resultado (`RevisaoQuestoes.tsx:116`) fica para o CR "Resultado, figura e início".
2. **"Próxima" quebra de linha no celular.** Em 390 px, a linha Anterior · Marcar para revisar · Próxima quebra, e "Próxima" cai embaixo de "Anterior", à esquerda.
3. **Hierarquia dos botões invertida.** "Finalizar" é o único botão azul e fica sempre visível. "Próxima", a ação de toda hora, é secundária.
4. **No desktop, a folha some sob a barra fixa.** Numa questão curta rolada até o fim, a folha começa em y = −5 e a barra termina em y = 65. As 45 linhas não cabem em 900 px, e a folha vira uma segunda área de rolagem.
5. **A folha em tela cheia no celular não é um diálogo.** Não tem `role="dialog"`, o foco fica no botão atrás dela, Esc não fecha e a página de trás continua rolando. As linhas têm ~20 px de altura, abaixo dos 24 px da WCAG 2.5.8.
8. **A pausa não esconde a prova.** Com o relógio pausado, o enunciado continua visível e as alternativas continuam clicáveis. O único sinal é "(pausado)" em cinza.

### Situação Desejada (TO-BE)
A resolução segue o protótipo:
- tela própria, sem o cabeçalho e o rodapé do site;
- barra do topo com o cronômetro (e, no desktop, o nome do simulado);
- barra inferior fixa com Anterior | Revisar | Próxima, e Próxima em azul;
- folha compacta que cabe inteira no desktop;
- folha do celular como painel inferior acessível, com "Finalizar simulado" no rodapé;
- pausa que esconde a questão;
- ao trocar de questão, a tela volta ao topo e o foco vai para o título.

**Decisões adotadas:**
- **D1:** "Finalizar" sai da barra do topo e fica no rodapé da folha de respostas (painel no celular, cartão no desktop). Na última questão, "Próxima" vira "Finalizar". O diálogo de confirmação continua.
- **D2:** no celular, a folha vira uma grade de 5 colunas com botões de 48 px (número + bolinha da resposta; ponto laranja = revisar). No desktop continuam as bolinhas, em 3 colunas, com as letras A–E só no cabeçalho.
- **D3:** pausar esconde a questão atrás da tela "Simulado pausado", com o botão Retomar.
- **D5 · Modo foco** (decidida pelo usuário em 30/09/2026, ao abrir este CR): `/simulado` sai do `Layout` do site, como no protótipo. Sem o rodapé abaixo da resolução, a folha fixa do desktop nunca passa por baixo da barra do topo, em qualquer altura de tela. Não há link para o Início durante a prova; sai-se pelo voltar do navegador.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Estrutura da tela (D5) | Dentro do `Layout` (cabeçalho e rodapé do site) | Tela própria com `<main>`: barra do topo fixa, conteúdo, barra inferior fixa |
| 2 | Barra do topo | Descrição (só ≥ 640 px), cronômetro, "Folha x/n" (celular), "Finalizar" | Celular: cronômetro com botões de ícone de 44 px + "Folha x/n". Desktop: descrição à esquerda, cronômetro à direita. Sem "Finalizar" (D1) |
| 3 | Navegação (P1.2, P1.3) | Anterior · Marcar para revisar · Próxima no fim da questão, todos secundários | Barra inferior fixa: Anterior \| Revisar/Marcada \| Próxima (azul, ocupa o resto no celular). Botões de 48 px no celular e 44 px no desktop. Atalhos listados sob a barra no desktop |
| 4 | Última questão (D1) | "Próxima" desabilitada | "Próxima" vira "Finalizar" (rótulo acessível "Finalizar o simulado") e abre a confirmação |
| 5 | Trocar de questão (P1.1) | Só troca o índice | Rola a janela até o topo e leva o foco ao título "Questão N de M" (`tabIndex=-1`, `preventScroll`). Vale para os botões, os atalhos ← → e a folha |
| 6 | Folha no desktop (P1.4, D2) | 2 colunas de 45 linhas com letras dentro das bolinhas, `max-h` e rolagem própria | Cartão fixo abaixo da barra com título, resumo, 3 colunas (mais de 40 questões; 2 acima de 15; 1 até 15), cabeçalho A–E por coluna, bolinhas sem letra, legenda e "Finalizar simulado". Cabe inteiro em 1440 × 900. A rolagem própria só entra como reserva em telas baixas |
| 7 | Folha no celular (P1.5, D2) | Painel de tela cheia sem semântica de diálogo, linhas de ~20 px | Painel inferior `role="dialog"` `aria-modal`: foco no botão Fechar ao abrir, Tab preso no painel, Esc e clique fora fecham, a página de trás não rola. Grade de 5 colunas com botões de 48 px (número + bolinha com a letra marcada; ponto laranja = revisar). Legenda e "Finalizar simulado" no rodapé. Ao fechar, o foco volta ao botão "Folha", ou ao título se a questão mudou |
| 8 | Pausa (P1.8, D3) | O relógio para, a questão continua visível e clicável, e aparece "(pausado)" | O conteúdo (questão, barra inferior, folha do desktop) dá lugar à tela "Simulado pausado" com o botão Retomar. Os atalhos ficam desligados. O cronômetro mostra "Pausado". Reabrir um simulado pausado cai direto nessa tela |
| 9 | Diálogo de finalizar | "Você deixou N questões em branco." com os botões Continuar resolvendo / Finalizar | Acrescenta "e marcou N para revisar" quando houver marcadas. Botão de confirmar: "Finalizar e ver o resultado", como no protótipo |
| 10 | `estilos.ts` | `BOTAO_*_COMPACTO` da barra antiga | `BOTAO_BARRA_PRIMARIO` e `BOTAO_BARRA_SECUNDARIO` (48 px no celular, 44 px no desktop) |

### 4.2 O que NÃO muda

- Regras de tempo (RN-009, RN-010), estado do simulado (`SimuladoEmAndamento`, reducer, storage) e contrato da API.
- Cores e tokens: o contraste do rosa `optico` (P2.1) e a borda de campo (P2.4) ficam para o CR "Contraste e tokens". A folha nova continua usando `text-optico`.
- O conteúdo da questão (`Blocos`, `Alternativas`, `ModalFigura`/"Ampliar" — P1.6) e o botão "Reportar problema".
- Resultado, revisão das questões (parte do P1.1), Início e banner do simulado em andamento (P1.7, P1.9): ficam no CR "Resultado, figura e início".
- Treino e as demais páginas continuam dentro do `Layout`.
- Atalhos de teclado (A–E, ← →, M) e o aviso de 15 minutos.

---

## 5. Impacto nos Documentos

| Documento                       | Impactado? | Seções Afetadas              | Ação Necessária       |
|---------------------------------|------------|------------------------------|-----------------------|
| `/docs/01-PRD.md`               | Sim        | RF-014, RF-015, RF-016 (detalhamento); cabeçalho | Folha como painel no celular, pausa que esconde a questão, "Finalizar" na folha e na última questão; v1.1 com CR-001 |
| `/docs/02-ARCHITECTURE.md`      | Sim        | §3 Estrutura de pastas; cabeçalho | Listar `PainelFolha` e `TelaPausa` em `components/resolucao/`; `/simulado` fora do `Layout`; v1.1 |
| `/docs/03-SPEC.md`              | Sim        | Cabeçalho, tabela de specs, changelog | v1.1 com referência ao CR-001 |
| `/docs/specs/03-resolucao.md`   | Sim        | §2.3 Finalizar; §2.4 Rotas; §3 Componentes (folha, painel, cronômetro, pausa, barra, foco); §5 Casos de borda; §6 Testes | Reescrever conforme o TO-BE; v1.1 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim      | Cabeçalho, Visão Geral       | Registrar o CR-001 (pós-MVP) |
| `/docs/05-DEPLOY-GUIDE.md`      | Não        | —                            | Sem variáveis, migrations ou procedimentos novos |
| `CLAUDE.md`                     | Sim        | Change Requests, Última Tarefa Implementada | Adicionar o CR-001 |
| `/docs/changes/INDEX.md`        | Sim        | Tabela                       | Adicionar o CR-001 |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação      | Caminho do Arquivo | Descrição da Mudança |
|-----------|--------------------|----------------------|
| Modificar | `frontend/src/App.tsx` | `/simulado` fora do `Layout` (D5) |
| Modificar | `frontend/src/pages/ResolucaoPage.tsx` | Nova estrutura (barra do topo, barra inferior, cartão da folha, painel, tela de pausa), foco e rolagem ao trocar de questão, texto do diálogo |
| Modificar | `frontend/src/components/resolucao/FolhaRespostas.tsx` | Formatos `bolhas` (desktop, 3 colunas, cabeçalho A–E) e `grade` (celular, 5 colunas, 48 px); resumo e legenda |
| Criar     | `frontend/src/components/resolucao/PainelFolha.tsx` | Painel inferior acessível (diálogo, foco, Tab preso, Esc, trava de rolagem) |
| Criar     | `frontend/src/components/resolucao/TelaPausa.tsx` | Tela "Simulado pausado" com Retomar (D3) |
| Modificar | `frontend/src/components/resolucao/Cronometro.tsx` | Botões de ícone de 44 px no celular, "Pausado" no mostrador, sem "(pausado)" |
| Modificar | `frontend/src/components/questao/QuestaoView.tsx` | Prop opcional `refTitulo` (título focável com `tabIndex=-1`) |
| Modificar | `frontend/src/components/estilos.ts` | Estilos dos botões das barras (forma e cor separadas) |
| Criar     | `frontend/src/components/Icone.tsx` | Ícones de traço comuns (`Icone`, `IconePausa`) |
| Modificar | `frontend/src/components/ConfirmDialog.tsx` | Callback de cancelar numa ref: o foco não volta a "Cancelar" a cada segundo do relógio |
| Modificar | `frontend/src/test/setup.ts` | Stub de `window.scrollTo` (não existe no jsdom) |
| Modificar | `frontend/src/pages/resolucao.test.tsx` | Rótulos novos e testes de foco, rolagem, painel, pausa e última questão |
| Criar     | `frontend/src/components/resolucao/FolhaRespostas.test.tsx` | Formatos, colunas, resumo, estado atual e revisar |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| —    | Nenhuma mudança de banco (só frontend) | Não |

---

## 7. Tarefas de Implementação

| ID      | Tarefa | Depende de | Done When |
|---------|--------|------------|-----------|
| CR-T-01 | Modo foco: `/simulado` fora do `Layout`, `<main>` próprio, barra do topo (descrição no desktop, cronômetro, "Folha x/n" no celular), sem "Finalizar" no topo (D5, D1) | — | A resolução abre sem o cabeçalho e o rodapé do site; as demais rotas mantêm o `Layout` |
| CR-T-02 | Barra inferior fixa Anterior \| Revisar \| Próxima com Próxima primária; "Finalizar" na última questão; estilos em `estilos.ts` (P1.2, P1.3, D1) | CR-T-01 | Em 320 e 390 px os três botões ficam numa linha, sempre visíveis; a última questão mostra "Finalizar" |
| CR-T-03 | Rolar ao topo e focar o título ao trocar de questão (P1.1, parte da resolução) | CR-T-02 | Depois de Próxima, Anterior, ← → ou de um toque na folha, o título "Questão N de M" está no topo e com foco |
| CR-T-04 | Folha do desktop: cartão fixo, colunas de bolinhas com cabeçalho A–E, legenda e "Finalizar simulado" (P1.4, D2, D1) | CR-T-01 | Em 1440 × 900 a folha de 90 questões aparece inteira, sem rolagem própria, e nunca fica sob a barra |
| CR-T-05 | Folha do celular: `PainelFolha` + formato `grade` + "Finalizar simulado" (P1.5, D2, D1) | CR-T-04 | Diálogo com foco, Tab preso, Esc, clique fora, página de trás travada e botões de 48 px |
| CR-T-06 | Pausa: `TelaPausa` no lugar do conteúdo, atalhos desligados, cronômetro com "Pausado" e ícones (P1.8, D3) | CR-T-01 | Pausado, a questão não aparece nem aceita resposta; Retomar volta à questão |
| CR-T-07 | Diálogo de finalizar com as marcadas para revisar e o botão "Finalizar e ver o resultado" | CR-T-02 | Texto e rótulos como no protótipo |
| CR-T-08 | Testes: atualizar `resolucao.test.tsx` e criar `FolhaRespostas.test.tsx` | CR-T-01..07 | Vitest verde cobrindo foco, rolagem, painel, pausa, última questão e formatos da folha |
| CR-T-09 | Validação runtime (Playwright em 1440 × 900, 390 e 320 px) + `/code-review` do diff | CR-T-08 | Registrado na seção 8 |
| CR-T-10 | Atualizar documentação (PRD, Arquitetura, Spec, Plano, CLAUDE.md, INDEX) | CR-T-09 | Docs refletem a mudança |

---

## 8. Critérios de Aceite

- [x] P1.1: ao trocar de questão (botões, atalhos ← → ou folha), a janela volta ao topo e o foco vai para o título "Questão N de M"
- [x] P1.2: em 320 e 390 px, Anterior | Revisar | Próxima ficam numa única linha, fixa no rodapé, sem quebra
- [x] P1.3: "Próxima" é o botão azul; "Finalizar" não está mais na barra do topo; na última questão "Próxima" vira "Finalizar" e abre a confirmação (D1)
- [x] P1.4: em 1440 × 900, a folha de 90 questões aparece inteira em 3 colunas, sem rolagem própria, e continua visível abaixo da barra ao rolar até o fim de uma questão curta
- [x] P1.5: no celular, a folha é um diálogo (`role="dialog"`, `aria-modal`): o foco entra no painel, Tab fica preso nele, Esc e o clique fora fecham, a página de trás não rola e os botões das questões têm 48 px (D2)
- [x] P1.8: com o Personalizado pausado, a questão some atrás da tela "Simulado pausado", as alternativas e os atalhos não respondem, e Retomar volta à questão; um simulado pausado reaberto cai direto nessa tela (D3)
- [x] D5: `/simulado` abre sem o cabeçalho e o rodapé do site; as demais rotas continuam com eles
- [x] "Finalizar simulado" no rodapé da folha (painel e cartão) abre a confirmação, que cita em branco e marcadas para revisar
- [x] Sem rolagem horizontal em 320 px e sem erros novos no console
- [x] Testes existentes continuam passando (regressão): Vitest 104/104, `tsc --noEmit`, ESLint, e o hook de commit com pytest e ruff
- [x] Novos testes cobrem a mudança: `FolhaRespostas.test.tsx` (4) e 14 casos novos (mais 4 reescritos) em `resolucao.test.tsx` (foco e rolagem, modo foco, última questão, "Revisar"/"Marcada", painel da folha, pausa, tempo esgotado com o painel aberto, arrasto até o fundo)
- [x] Fluxo afetado exercitado em runtime antes do merge (Playwright em 1440 × 900, 390 e 320 px), com o resultado registrado abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados (registro abaixo)
- [x] ~~Revisão de segurança~~ N/A — só UI, sem endpoint novo ou alterado, sem auth/cookies e sem dependência nova
- [x] Documentos afetados foram atualizados (PRD v1.1, Arquitetura v1.1, Spec índice v1.1 e spec 03 v1.1, Plano, CLAUDE.md, INDEX)

### 8.1 Validação em runtime (Playwright, 2026-09-30)

Backend com `local.db` (prova 2025 real) + Vite; simulados iniciados pelo fluxo real ("Prova de um ano" e "Personalizado").

| Viewport | Verificação | Resultado |
|----------|-------------|-----------|
| 390 × 844 | Sem cabeçalho e rodapé do site; barra inferior em y = 773–844 com Anterior 104 × 48, Revisar 101 × 48 e Próxima 130 × 48 numa linha | ✅ |
| 390 × 844 | Rolar 2.732 px na questão 1 e tocar em Próxima: `scrollY` = 0, título "Questão 2 de 90" em y = 81 e com foco | ✅ |
| 390 × 844 | Painel da folha: foco em "Fechar folha", `overflow: hidden` no `<html>`, 90 botões de 62 × 48, questão atual marcada, Shift+Tab/Tab circulam entre Fechar e Finalizar, Esc fecha e devolve o foco a "Folha 1/90"; roda do mouse no fundo não rola a página (0 px) e na grade rola só a grade (300 px) | ✅ |
| 390 × 844 | Escolher a questão 45 no painel: fecha e foca "Questão 45 de 90" com `scrollY` = 0 | ✅ |
| 320 × 640 | Sem rolagem horizontal; "Anterior" só com ícone (42 × 48), Revisar e Próxima na mesma linha; topo do Personalizado (cronômetro + ocultar + pausar + "Folha 1/20") cabe até x = 293 | ✅ |
| 320 × 640 | Questão 90: "Próxima" vira "Finalizar"; confirmação "Você deixou 89 questões em branco e marcou 1 para revisar."; foco em "Finalizar e ver o resultado" continua lá 2,5 s depois (o relógio não o devolve a "Cancelar") | ✅ |
| 1440 × 900 | Cartão da folha com 784 px, 3 colunas × 30 linhas, sem rolagem própria; rolado até o fim da questão mais curta (4), o cartão fica em y = 88, abaixo da barra (y = 65) | ✅ |
| 1440 × 900 | Personalizado pausado: sem enunciado, alternativas, barra inferior nem folha; `b` e → não mudam nada; recarregar mantém a tela de pausa; Retomar volta com 01:06:40 (a pausa não consumiu tempo) | ✅ |
| 390 × 844 | "Marcada" com fundo #fff4e0 e borda e texto #9a5b00; pausado, o botão "Folha" some do topo (revalidado depois da revisão de código) | ✅ |
| 390 × 844 | `/`, `/historico`, `/treino` e `/novo/ano` continuam com cabeçalho e rodapé | ✅ |
| — | Console: sem erros nem avisos da aplicação (só a mensagem informativa do React DevTools; dois erros transitórios de HMR do Vite durante as edições) | ✅ |

Observação: no primeiro início do simulado, o proxy do Vite devolveu `ECONNRESET` para `POST /api/simulados` (o backend respondeu 200) e a página ficou esperando. É instabilidade do ambiente de desenvolvimento, sem relação com o CR. O fluxo foi repetido com sucesso, também com um simulado expirado salvo ("Descartar e começar").

### 8.2 Revisão de código pré-merge (`/code-review`, nível high)

10 findings: 9 corrigidos e 1 justificado.

| # | Finding | Tratamento |
|---|---------|------------|
| 1 | "Marcada" não mostrava as cores de alerta: no Tailwind v4, as classes da constante venciam as acrescentadas (vale a ordem do CSS gerado) | Corrigido: `BOTAO_BARRA_FORMA` sem cor nem padding, e a cor escolhida por ternário (`BARRA_NEUTRO`/`BARRA_ALERTA`). O mesmo conflito (`sm:px-*`) foi removido do `Cronometro`. Teste de classe + checagem de cor no navegador |
| 2 | Pausado, o botão "Folha" do celular continuava ativo | Corrigido: some durante a pausa, como a folha do desktop; teste novo |
| 3 | A pausa escondia "Corrigindo…" e o erro de correção | Corrigido: os avisos ficam acima da `TelaPausa` |
| 4 | Tempo esgotado com o painel aberto deixava o painel sobre a correção | Corrigido: o painel fecha junto com a confirmação; teste novo |
| 5 | Arrastar da grade até o fundo fechava o painel | Corrigido: fecha só o clique que começa e termina no fundo; teste novo |
| 6 | Sem questões em branco, a confirmação omitia as marcadas | Corrigido; teste novo |
| 7 | `overflow: hidden` no `<html>` não trava a rolagem em iOS antigos | Parcial: `overscroll-contain` na grade. Justificativa: o RNF-008 suporta as 2 últimas versões do Safari, que respeitam `overflow: hidden` |
| 8 | `ConfirmDialog` dependia da identidade do callback (o relógio re-renderiza a cada segundo) | Corrigido no componente (callback numa ref). Justificado não extrair agora um hook comum com o `PainelFolha`: os dois diálogos têm comportamentos diferentes (trava de rolagem e Tab preso só no painel) |
| 9 | Contagens repetidas e `includes` em laço | Corrigido: `Set` das marcadas na `FolhaRespostas`. As contagens da página e da folha vêm dos mesmos dados e não divergem |
| 10 | Ícones de traço repetidos em 4 arquivos | Corrigido: componente `Icone` comum (`Icone`, `IconePausa`) |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Sem link para o Início durante a prova (D5) | Alta | Baixo | Decisão do usuário. O voltar do navegador leva ao Início, que oferece continuar. O banner do simulado em andamento é revisto no CR "Resultado, figura e início" |
| 2 | Telas de desktop baixas (< ~880 px de altura útil): a folha de 90 questões não cabe | Média | Baixo | Reserva: `max-h` com rolagem própria só quando não cabe. A folha nunca fica sob a barra |
| 3 | Travar a rolagem do fundo não funcionar em algum navegador móvel antigo | Baixa | Baixo | `overflow: hidden` no `<html>` enquanto o painel está aberto; o painel continua funcional mesmo sem a trava |
| 4 | Rótulos novos ("Revisar", "Finalizar e ver o resultado") quebram hábitos e testes | Média | Baixo | Testes atualizados; rótulos do protótipo validados na revisão |
| 5 | Foco programático no título rolar a página de forma inesperada | Baixa | Baixo | `focus({ preventScroll: true })` depois de `scrollTo(0)` |

---

## 10. Plano de Rollback

> Referencia: Procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (secoes 4 e 5).

### 10.1 Rollback de Codigo

- **Metodo:** `git checkout -b hotfix/revert-CR-001` → `git revert -m 1 [hash do merge]` → merge em `master` → push
- **Metodo alternativo:** Redeploy do deployment anterior via Railway Dashboard
- **Commits a reverter:** o merge da branch `feat/CR-001-resolucao-navegacao` em `master`

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — sem migration
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade e destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serao perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** o formato do simulado salvo no navegador não muda; um simulado em andamento continua válido nos dois sentidos.
- **Backup necessario antes do deploy?** [ ] Sim / [x] Nao
- **Procedimento de backup:** N/A

### 10.4 Rollback de Variaveis de Ambiente

- **Variaveis novas/alteradas:** Nenhuma
- **Acao de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicacao acessivel e funcional
- [ ] ~~`alembic current` mostra revisao esperada~~ (sem migration)
- [ ] `/simulado` volta a abrir dentro do `Layout`, com "Finalizar" no topo
- [ ] ~~Usuarios existentes conseguem fazer login~~ (o site não tem login)

---

## Changelog

| Data       | Autor  | Descrição                    |
|------------|--------|------------------------------|
| 2026-09-30 | Rafael Peixoto (com Claude) | CR criado a partir da revisão de design (itens P1.1, P1.2, P1.3, P1.4, P1.5 e P1.8, com D1, D2 e D3) e da decisão D5 (modo foco) |
| 2026-09-30 | Rafael Peixoto (com Claude) | Implementação iniciada e concluída (CR-T-01 a CR-T-08) |
| 2026-09-30 | Rafael Peixoto (com Claude) | Validação em runtime (Playwright) e revisão de código: 10 findings, 9 corrigidos e 1 justificado (CR-T-09) |
| 2026-09-30 | Rafael Peixoto (com Claude) | Documentação atualizada (CR-T-10) — status: ✅ Concluído |
