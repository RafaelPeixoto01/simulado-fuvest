# Change Request — CR-003: Resultado, figura e início

**Versão:** 1.0  
**Data:** 2026-09-30  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Terceiro CR da revisão de design de 30/09/2026 (canvas "Protótipo Simulado Fuvest", tela "Revisão de design · itens numerados"). Cobre os itens P1.1 (parte da revisão do resultado), P1.6, P1.7, P1.9 e P2.6, além do P2.2 da folha corrigida, que veio do CR-002. A implementação segue as telas "Resultado · celular", "Figura ampliada · desktop" e "Início com simulado em andamento · celular" do protótipo, com três decisões tomadas pelo usuário ao abrir o CR (D5, D6 e D7).

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Bug Fix (usabilidade e acessibilidade) + ajuste de comportamento da revisão |
| Origem           | Revisão de design (Playwright em 1440, 390 e 320 px, build `0d11ac5`) |
| Urgência         | Próxima sprint |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- **Resultado:** resumo, depois "Por disciplina" e a revisão paginada de 10 em 10. A folha corrigida fica numa coluna à direita no desktop e, no celular, no fim da página, depois das 10 questões. A folha não é clicável e mostra letras de 8 px dentro das bolinhas.
- **Figura ampliada:** abre no tamanho natural (`max-w-none`), quase igual à coluna, colada no topo.
- **Início:** o banner do simulado em andamento fica abaixo do título, mostra só as respondidas e disputa atenção com "Começar prova completa", o outro botão azul. Os anos em "Provas na base" parecem começar a prova, mas abrem o PDF externo sem aviso.

### Problema ou Necessidade
1. **P1.1 (revisão):** a paginação da revisão (`RevisaoQuestoes.tsx:116`) não rola: no celular, a página seguinte começa ~15.000 px acima.
2. **P1.6:** "Ampliar" não amplia.
3. **P1.7:** no celular, o resultado tem ~16.800 px de altura; a folha corrigida só aparece no fim e não é clicável.
4. **P1.9:** o banner do simulado em andamento não mostra o tempo, embora o relógio continue correndo com a aba fechada (RN-009).
5. **P2.2 (do CR-002):** letras A–E de 8 px dentro das bolinhas da folha corrigida, a 2,04–2,62:1.
6. **P2.6:** os anos de "Provas na base" (`HomePage.tsx:63`) abrem um PDF externo sem aviso.

### Situação Desejada (TO-BE)
- **Resultado:** resumo, "Por disciplina", folha corrigida (no celular) e revisão uma questão por vez. Tocar numa questão da folha abre aquela questão na revisão, rola até ela e põe o foco no título.
- **Figura:** abre ajustada à tela e centralizada, com a opção "Tamanho real".
- **Início:** banner no topo com o tempo restante e o aviso do relógio; enquanto houver simulado aberto, todos os botões dos modos ficam secundários. "Provas na base" deixa claro que abre o PDF oficial em outra aba.

**Decisões do usuário (30/09/2026):**
- **D5 · Folha corrigida:** no celular, grade de células como no protótipo (número + ✓/✗ + letra; em branco tracejada), com as contagens em selos. No desktop, as bolinhas continuam na barra lateral, como a folha da resolução (D2): 3 colunas, sem letras dentro, cabeçalho A–E e linhas clicáveis que levam à revisão. A bolinha marcada fica preenchida (verde se acertou, vermelha se errou), e a correta fica contornada em verde quando o aluno errou ou deixou em branco.
- **D6 · Revisão uma questão por vez:** como no protótipo, com filtros Todas/Erradas/Em branco, "N de M ‹filtro›", selo do resultado da questão e Anterior/Próxima. O filtro por disciplina que já existe continua (RF-019).
- **D7 · Figura:** só "Ajustar à tela" e "Tamanho real". A navegação entre as figuras da questão (← →) do artboard "Figura ampliada · desktop" fica fora.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Ordem do resultado (P1.7) | Resumo → Por disciplina → revisão; folha no fim (celular) ou na coluna direita | Resumo → Por disciplina → folha corrigida (só celular) → revisão. No desktop, a folha fica num cartão fixo na barra lateral |
| 2 | Folha corrigida no celular (D5) | Bolinhas com letras de 8 px, não clicáveis | Título "Folha corrigida" + "Toque numa questão para revisá-la." + selos (✓ N acertos, ✗ N erros, – N em branco) + grade de 6 colunas de botões de 50 px: número e marca (✓ letra, ✗ letra marcada, "–" em branco, "anul." para anulada); a questão aberta na revisão tem contorno azul |
| 3 | Folha corrigida no desktop (D5, P2.2) | 2 colunas, letras dentro das bolinhas | Cartão fixo com título, selos, 3 colunas (2 acima de 15; 1 até 15), cabeçalho A–E, bolinhas sem letra, linhas clicáveis; marcada preenchida verde/vermelha, correta contornada em verde, ponto laranja = anulada; legenda |
| 4 | Revisão (P1.1, D6) | Páginas de 10 questões, "Página anterior/Próxima página" sem rolagem | Uma questão por vez: filtros (Todas/Erradas/Em branco + Disciplina), título "Questão N de T", "i de M ‹questões/erradas/em branco›", selo ("Você acertou: X", "Você marcou X · correta Y", "Em branco · correta Y", "Anulada: ponto para todos"), a questão com a correção, Anterior/Próxima (48 px). Trocar de questão, de filtro ou tocar na folha rola até a revisão e foca o título. Questão fora do filtro atual, escolhida na folha, volta o filtro para "Todas" e a disciplina para "Todas" |
| 5 | Figura ampliada (P1.6, D7) | Tamanho natural, colada no topo | Abre ajustada à tela (`object-fit: contain`, centralizada, cresce até ocupar a área). Grupo "Ajustar à tela \| Tamanho real" (`aria-pressed`); "Tamanho real" mostra a imagem no tamanho natural, com rolagem. Barra com o texto alternativo (desktop) e "Fechar". Rodapé: "Use dois dedos para aproximar ainda mais." (celular) / "Esc fecha · clique fora para fechar" (desktop) |
| 6 | Banner do simulado em andamento (P1.9) | Abaixo do título; "Você tem um simulado em andamento: ‹descrição›, r de n respondidas" | No topo da página: "Simulado em andamento", título com a descrição, barra de progresso, "r de n respondidas · m para revisar" e a linha de tempo ("Restam 4 h 52 min. O relógio continua correndo mesmo com a aba fechada." / "Pausado com 58 min restantes." / "O tempo acabou: ao continuar, o simulado é finalizado com as respostas marcadas."; sem cronômetro, a linha não aparece). Botões "Continuar simulado" (azul) e "Descartar" |
| 7 | Modos no início (P1.9) | "Começar prova completa" sempre azul | Com simulado aberto, todos os modos ficam com botão secundário |
| 8 | Provas na base (P2.6) | Anos soltos ("2025") que abrem o PDF | "FUVEST 2025 · PDF oficial" com ícone de link externo e "(abre em nova aba)" para leitor de tela, um por linha |

### 4.2 O que NÃO muda

- Correção, nota, ordenação por disciplina e histórico (API e storage).
- O conteúdo da questão na revisão (`QuestaoView` em modo correção, selo de anulada, "Reportar problema").
- A resolução (CR-001) e os tokens (CR-002).
- A página "Prova de um ano" (o link "PDF oficial da prova" dela já é explícito).
- Resolução maior das figuras na ingestão (sugestão da revisão fora deste CR).

---

## 5. Impacto nos Documentos

| Documento                       | Impactado? | Seções Afetadas              | Ação Necessária       |
|---------------------------------|------------|------------------------------|-----------------------|
| `/docs/01-PRD.md`               | Sim        | RF-008, RF-013, RF-019 (detalhamento); cabeçalho | Banner com tempo e modos secundários; figura ajustada à tela; revisão uma por vez com a folha clicável; v1.2 |
| `/docs/02-ARCHITECTURE.md`      | Sim        | §3 Estrutura                 | `resultado/revisao.ts` (filtros da revisão); v1.3 |
| `/docs/03-SPEC.md`              | Sim        | Cabeçalho, tabela, changelog | v1.3 |
| `/docs/specs/03-resolucao.md`   | Sim        | Componente Figura/ModalFigura, rota `/` (banner, Provas na base) | v1.3 |
| `/docs/specs/04-correcao-resultado.md` | Sim | §3 Componentes, §5 Casos de borda, §6 Testes | Ordem do resultado, FolhaCorrigida (grade/bolhas), RevisaoQuestoes (uma por vez); v1.1 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim      | Cabeçalho, Visão Geral       | Registrar o CR-003 |
| `/docs/05-DEPLOY-GUIDE.md`      | Não        | —                            | Sem variáveis, migrations ou procedimentos novos |
| `CLAUDE.md`                     | Sim        | Change Requests, Última Tarefa | Adicionar o CR-003 |
| `/docs/changes/INDEX.md`        | Sim        | Tabela                       | Adicionar o CR-003 |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação      | Caminho do Arquivo | Descrição da Mudança |
|-----------|--------------------|----------------------|
| Modificar | `frontend/src/pages/ResultadoPage.tsx` | Nova ordem; estado da revisão (questão, filtro, disciplina) compartilhado entre a folha e a revisão; rolagem e foco |
| Criar     | `frontend/src/components/resultado/revisao.ts` | Filtros da revisão e escolha da questão (funções puras) |
| Modificar | `frontend/src/components/resultado/FolhaCorrigida.tsx` | Formatos `grade` (celular) e `bolhas` (desktop), clicáveis; selos de contagem |
| Modificar | `frontend/src/components/resultado/RevisaoQuestoes.tsx` | Uma questão por vez, controlada pela página |
| Modificar | `frontend/src/components/questao/QuestaoView.tsx` | Props opcionais `nivelTitulo` (h3 na revisão) e `complemento` (selo e posição no cabeçalho) |
| Modificar | `frontend/src/components/questao/ModalFigura.tsx` | Ajustar à tela / Tamanho real, barra e rodapé |
| Modificar | `frontend/src/pages/HomePage.tsx` | Banner no topo com tempo e progresso; modos secundários com simulado aberto; "Provas na base" com aviso de link externo |
| Modificar/Criar | testes (`resultado.test.tsx`, `inicio.test.tsx`, `Figura.test.tsx`, `revisao.test.ts`, `FolhaCorrigida.test.tsx`) | Cobrir as mudanças |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| —    | Nenhuma mudança de banco (só frontend) | Não |

---

## 7. Tarefas de Implementação

| ID      | Tarefa | Depende de | Done When |
|---------|--------|------------|-----------|
| CR-T-01 | `revisao.ts`: filtrar (filtro + disciplina), escolher questão com ajuste de filtro, anterior/próxima | — | Testes unitários verdes |
| CR-T-02 | `RevisaoQuestoes` uma questão por vez + `QuestaoView` com `nivelTitulo`/`complemento` (D6, P1.1) | CR-T-01 | Anterior/Próxima e filtros funcionam; rolagem e foco no título |
| CR-T-03 | `FolhaCorrigida` com formatos `grade` e `bolhas`, clicáveis, com selos (D5, P2.2) | CR-T-01 | Toque/clique abre a questão na revisão |
| CR-T-04 | `ResultadoPage`: nova ordem e estado compartilhado (P1.7) | CR-T-02, CR-T-03 | Folha antes da revisão no celular; cartão fixo no desktop |
| CR-T-05 | `ModalFigura`: ajustar à tela / tamanho real (P1.6, D7) | — | Figura centralizada e ajustada ao abrir |
| CR-T-06 | Início: banner no topo com tempo, modos secundários, "Provas na base" (P1.9, P2.6) | — | Textos do tempo nos 4 casos; links com aviso |
| CR-T-07 | Testes | CR-T-01..06 | Vitest verde |
| CR-T-08 | Validação runtime (Playwright em 1440 × 900, 390 e 320 px) + `/code-review` | CR-T-07 | Registrado na seção 8 |
| CR-T-09 | Documentação | CR-T-08 | Docs atualizados |

---

## 8. Critérios de Aceite

- [ ] P1.7: no celular, a folha corrigida vem logo depois de "Por disciplina" e antes da revisão; no desktop, fica num cartão fixo na barra lateral
- [ ] P1.7/D5: tocar ou clicar numa questão da folha (grade ou bolhas) abre aquela questão na revisão, rola até ela e põe o foco no título; fora do filtro atual, o filtro volta para "Todas"
- [ ] D5/P2.2: no celular, grade de 6 colunas com células de 50 px e selos de contagem; no desktop, bolinhas sem letra, cabeçalho A–E, marcada verde/vermelha e correta contornada em verde
- [ ] P1.1/D6: a revisão mostra uma questão por vez, com filtros (incluindo disciplina), posição no filtro, selo e Anterior/Próxima; trocar de questão rola até a revisão e foca o título
- [ ] P1.6/D7: a figura ampliada abre ajustada à tela e centralizada; "Tamanho real" mostra o tamanho natural com rolagem; Esc e clique fora fecham
- [ ] P1.9: o banner fica no topo do início com o tempo restante e o aviso do relógio (ou "Pausado com…", "O tempo acabou…"); com simulado aberto, os modos ficam com botões secundários
- [ ] P2.6: "Provas na base" mostra "FUVEST ‹ano› · PDF oficial" com ícone de link externo e "(abre em nova aba)" para leitor de tela
- [ ] Sem rolagem horizontal em 320 px e sem erros novos no console
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança
- [ ] Fluxo afetado exercitado em runtime antes do merge (Playwright em 1440 × 900, 390 e 320 px), com o resultado registrado aqui
- [ ] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados
- [ ] Revisão de segurança: N/A — só UI, sem endpoint novo ou alterado, sem auth/cookies e sem dependência nova
- [ ] Documentos afetados foram atualizados

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Revisar as 90 questões passa a exigir 89 toques em "Próxima" | Média | Baixo | A folha corrigida leva direto a qualquer questão, e os filtros reduzem a lista |
| 2 | A figura ajustada à tela fica pixelada quando é pequena | Alta | Baixo | É o comportamento do protótipo; "Tamanho real" continua disponível. Exportar as figuras em resolução maior fica para um CR de ingestão |
| 3 | Duas versões da folha corrigida no DOM (celular e desktop) | Alta | Baixo | Só uma aparece de cada vez (`display: none` também as esconde do leitor de tela); os testes escolhem a versão pelo contêiner |
| 4 | O tempo do banner fica parado enquanto o início está aberto | Média | Baixo | Atualização a cada 30 s |

---

## 10. Plano de Rollback

> Referencia: Procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (secoes 4 e 5).

### 10.1 Rollback de Codigo

- **Metodo:** `git checkout -b hotfix/revert-CR-003` → `git revert -m 1 [hash do merge]` → merge em `master` → push
- **Metodo alternativo:** Redeploy do deployment anterior via Railway Dashboard
- **Commits a reverter:** o merge da branch `feat/CR-003-resultado-figura-inicio` em `master`

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — sem migration

### 10.3 Impacto em Dados

- **Dados serao perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** o histórico e o simulado em andamento no navegador não mudam de formato.
- **Backup necessario antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variaveis novas/alteradas:** Nenhuma

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicacao acessivel e funcional
- [ ] O resultado volta à revisão paginada e a figura ampliada ao tamanho natural

---

## Changelog

| Data       | Autor  | Descrição                    |
|------------|--------|------------------------------|
| 2026-09-30 | Rafael Peixoto (com Claude) | CR criado a partir da revisão de design (P1.1 da revisão, P1.6, P1.7, P1.9, P2.6 e P2.2 da folha corrigida) com as decisões D5, D6 e D7 do usuário |
