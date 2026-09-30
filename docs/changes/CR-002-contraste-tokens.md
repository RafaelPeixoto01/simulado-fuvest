# Change Request — CR-002: Contraste e tokens

**Versão:** 1.0  
**Data:** 2026-09-30  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Segundo CR da revisão de design de 30/09/2026 (canvas "Protótipo Simulado Fuvest", telas "Revisão de design · itens numerados" e "Contraste: antes e depois"). Corrige os pares de cor abaixo do mínimo WCAG AA (P2.1 a P2.4) e dá um título próprio a cada rota (P2.5, WCAG 2.4.2).

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Bug Fix (acessibilidade: contraste e título de página) |
| Origem           | Revisão de design (medidas do navegador no build `0d11ac5`) |
| Urgência         | Próxima sprint |
| Complexidade     | Baixa |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
O rosa do impresso óptico (`optico` #d9667f) é usado como cor de texto nas letras A–E das alternativas e nos números da folha de respostas. A folha corrigida do resultado mostra as letras dentro das bolinhas, a 8 px, em `optico` com 60% de opacidade. O verde de acerto (`acerto` #1b7f4b) aparece como texto sobre o verde-claro (`acerto-claro`). As bordas de `input`, `select` e `textarea` usam `linha` (#dde1e7). O `<title>` é sempre "Simulado Fuvest", em qualquer rota.

### Problema ou Necessidade
| Item | Par | Hoje | Mínimo |
|------|-----|------|--------|
| P2.1 | `optico` #d9667f sobre branco (letras A–E, números da folha) | 3,41:1 | 4,5:1 (texto) |
| P2.2 | `optico`/60 e /80 nas letras de 8 px dentro das bolinhas (folha corrigida) | 2,04–2,62:1 | ilegível em qualquer cor |
| P2.3 | `acerto` sobre `acerto-claro` (rótulo "Correta") | 4,43:1 | 4,5:1 |
| P2.4 | `linha` #dde1e7 como borda de campo | 1,21:1 | 3:1 (componente, WCAG 1.4.11) |
| P2.5 | `<title>` igual em todas as rotas | — | título descritivo por página (WCAG 2.4.2) |

### Situação Desejada (TO-BE)
Tokens novos no `index.css`, como na tela "Contraste: antes e depois":
- `--color-optico-texto: #b8405f` (5,33:1) nas letras e números;
- `--color-borda-campo: #848e9c` (≥ 3:1) nas bordas de campo;
- `--color-acerto: #17703f` (5,40:1 sobre `acerto-claro`).

O rosa #d9667f continua nos círculos e bordas decorativos. Cada rota define o próprio título.

**P2.2 (letras de 8 px dentro das bolinhas):** na folha da resolução, já resolvido pelo CR-001 (D2). Na folha corrigida do resultado, sai no redesenho do CR-003: grade de células no celular e bolinhas sem letra, com cabeçalho A–E, no desktop, conforme a decisão do usuário de 30/09/2026. Este CR não mexe na estrutura da folha corrigida, para não refazer o trabalho do CR-003.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Token de texto do impresso (P2.1) | Letras e números em `text-optico` | `text-optico-texto` (#b8405f) em: letra da bolinha neutra das alternativas, números da folha da resolução (bolhas e grade) e números da folha corrigida |
| 2 | Letras dentro das bolinhas (P2.2) | Letras A–E de 8 px na folha da resolução e na folha corrigida | Resolução: já feito no CR-001 (D2). Folha corrigida: no CR-003 |
| 3 | Verde de acerto (P2.3) | `--color-acerto: #1b7f4b` | `#17703f` (vale para texto, borda e preenchimento de acerto) |
| 4 | Borda de campo (P2.4) | `border-linha` | `border-borda-campo` em: `select` de anos (Personalizado e Treino), quantidade (Personalizado), `select` de disciplina e seletor segmentado da revisão, `textarea` do reporte |
| 5 | Título da página (P2.5) | Sempre "Simulado Fuvest" | Hook `useTituloPagina`: "Simulado Fuvest" no início e "‹página› · Simulado Fuvest" nas demais (Simulado personalizado, Prova de um ano, ‹descrição do simulado›, Treino por questão, Resultado, Histórico, Página não encontrada) |

### 4.2 O que NÃO muda

- O rosa `optico` #d9667f nos círculos da marca, nas bordas das bolinhas e nos contornos decorativos (cartão da folha).
- A estrutura da folha corrigida (colunas, bolinhas, cores, contorno da correta): o redesenho, a navegação por ela e a nova ordem do resultado ficam no CR-003. Aqui só o número muda para `optico-texto`.
- Os demais tokens (`caneta`, `erro`, `alerta`, `tinta-suave`), que já passam no AA.
- Os cartões de disciplina com checkbox: a borda deles é decorativa, e o limite do componente é o próprio checkbox.

---

## 5. Impacto nos Documentos

| Documento                       | Impactado? | Seções Afetadas              | Ação Necessária       |
|---------------------------------|------------|------------------------------|-----------------------|
| `/docs/01-PRD.md`               | Não        | —                            | RNF-003 já exige contraste WCAG AA; o CR só faz a interface cumprir o requisito |
| `/docs/02-ARCHITECTURE.md`      | Sim        | §3 Estrutura (`hooks/`)      | Listar `useTituloPagina` |
| `/docs/03-SPEC.md`              | Sim        | Cabeçalho, changelog         | v1.2 com referência ao CR-002 |
| `/docs/specs/03-resolucao.md`   | Sim        | §3 (componentes), tokens, títulos | Tokens de texto e borda, título por rota; v1.2 |
| `/docs/specs/04-correcao-resultado.md` | Não | —                            | A folha corrigida muda no CR-003 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim      | Cabeçalho, Visão Geral       | Registrar o CR-002 |
| `/docs/05-DEPLOY-GUIDE.md`      | Não        | —                            | Sem variáveis, migrations ou procedimentos novos |
| `CLAUDE.md`                     | Sim        | Change Requests              | Adicionar o CR-002 |
| `/docs/changes/INDEX.md`        | Sim        | Tabela                       | Adicionar o CR-002 |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação      | Caminho do Arquivo | Descrição da Mudança |
|-----------|--------------------|----------------------|
| Modificar | `frontend/src/index.css` | Tokens `optico-texto`, `borda-campo` e novo valor de `acerto` |
| Modificar | `frontend/src/components/questao/Alternativas.tsx` | Letra da bolinha neutra em `text-optico-texto` |
| Modificar | `frontend/src/components/resolucao/FolhaRespostas.tsx` | Números em `text-optico-texto` |
| Modificar | `frontend/src/components/resultado/FolhaCorrigida.tsx` | Números em `text-optico-texto` (o redesenho é do CR-003) |
| Modificar | `frontend/src/pages/ConfigurarPersonalizadoPage.tsx`, `TreinoPage.tsx`, `components/resultado/RevisaoQuestoes.tsx`, `components/questao/ReportarModal.tsx` | `border-borda-campo` nos campos |
| Criar     | `frontend/src/hooks/useTituloPagina.ts` | Define `document.title` por página |
| Modificar | `frontend/src/pages/*.tsx` | Chamar `useTituloPagina` |
| Criar     | `frontend/src/tokens.test.ts` | Contraste dos pares de tokens calculado a partir do `index.css` |
| Modificar | `frontend/vite.config.ts` | Vitest processa só o `index.css` (o teste de contraste lê os tokens pelo `?raw`) |
| Modificar | testes das páginas | Título por rota |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| —    | Nenhuma mudança de banco (só frontend) | Não |

---

## 7. Tarefas de Implementação

| ID      | Tarefa | Depende de | Done When |
|---------|--------|------------|-----------|
| CR-T-01 | Tokens no `index.css` e teste de contraste calculado a partir do arquivo (P2.1, P2.3, P2.4) | — | Teste mede ≥ 4,5:1 para texto e ≥ 3:1 para a borda |
| CR-T-02 | `text-optico-texto` nas letras e números; `border-borda-campo` nos campos | CR-T-01 | Nenhum texto em `text-optico`; nenhum campo com `border-linha` |
| CR-T-03 | P2.2: conferir que a resolução já não tem letras nas bolinhas (CR-001) e registrar a folha corrigida no escopo do CR-003 | — | Registrado no CR-003 |
| CR-T-04 | `useTituloPagina` em todas as rotas (P2.5) | — | Teste confere o título de cada rota |
| CR-T-05 | Validação runtime (Playwright: cores calculadas e títulos) + documentação | CR-T-01..04 | Registrado na seção 8; docs atualizados |

---

## 8. Critérios de Aceite

- [ ] P2.1: letras A–E das alternativas e números das folhas em #b8405f (≥ 4,5:1 sobre branco e sobre `caneta-clara`)
- [ ] P2.2: a folha da resolução não tem letras dentro das bolinhas (CR-001); a folha corrigida entra no escopo do CR-003
- [ ] P2.3: "Correta" e "Sua resposta" (acerto) em #17703f, ≥ 4,5:1 sobre `acerto-claro`
- [ ] P2.4: bordas de `input`, `select`, `textarea` e do seletor segmentado em #848e9c (≥ 3:1 sobre branco e sobre `fundo`)
- [ ] P2.5: cada rota tem um título próprio no formato "‹página› · Simulado Fuvest"
- [ ] O rosa #d9667f continua nos elementos decorativos
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança
- [ ] Fluxo afetado exercitado em runtime antes do merge (Playwright), com o resultado registrado aqui
- [ ] Revisão de código: N/A — complexidade Baixa (troca de tokens e de classes, um hook de título)
- [ ] Revisão de segurança: N/A — só UI, sem endpoint novo ou alterado, sem auth/cookies e sem dependência nova
- [ ] Documentos afetados foram atualizados

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | A folha corrigida continua com as letras de 8 px até o CR-003 | Alta | Baixo | O CR-003 é o próximo da fila e já tem o redesenho decidido; o rótulo acessível de cada linha traz a letra marcada e a correta |
| 2 | O verde mais escuro altera o visual de acerto em todas as telas | Alta | Baixo | Mudança intencional e pequena (#1b7f4b → #17703f) |
| 3 | O título muda a cada rota e pode aparecer diferente em favoritos e abas | Alta | Baixo | Efeito desejado (WCAG 2.4.2) |

---

## 10. Plano de Rollback

> Referencia: Procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (secoes 4 e 5).

### 10.1 Rollback de Codigo

- **Metodo:** `git checkout -b hotfix/revert-CR-002` → `git revert -m 1 [hash do merge]` → merge em `master` → push
- **Metodo alternativo:** Redeploy do deployment anterior via Railway Dashboard
- **Commits a reverter:** o merge da branch `feat/CR-002-contraste-tokens` em `master`

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — sem migration

### 10.3 Impacto em Dados

- **Dados serao perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** só estilos e títulos; nada do navegador ou do servidor muda de formato.
- **Backup necessario antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variaveis novas/alteradas:** Nenhuma

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicacao acessivel e funcional
- [ ] Letras e números voltam ao rosa #d9667f e o título volta a ser "Simulado Fuvest" em todas as rotas

---

## Changelog

| Data       | Autor  | Descrição                    |
|------------|--------|------------------------------|
| 2026-09-30 | Rafael Peixoto (com Claude) | CR criado a partir da revisão de design (P2.1 a P2.5) e da tela "Contraste: antes e depois" |
