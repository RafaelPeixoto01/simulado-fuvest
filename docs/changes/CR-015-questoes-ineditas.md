# Change Request — CR-015: Questões inéditas primeiro no sorteio

**Versão:** 1.0  
**Data:** 2026-10-07  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

A Prova completa, o Personalizado e o Treino passam a sortear **primeiro as questões que o estudante ainda não fez**: as que não aparecem em nenhum simulado do histórico dele. Quando as inéditas não bastam (numa disciplina da Prova completa, ou nos filtros do Personalizado e do Treino), o sorteio completa com as questões **vistas há mais tempo**. O navegador manda a lista das questões já feitas no pedido de geração, e a geração continua sem estado no servidor (ADR-004).

É o item 1 do roadmap de produto ([`docs/ROADMAP.md`](../ROADMAP.md)).

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Mudança de Regra de Negócio (sorteio) |
| Origem           | Evolução do produto (análise de produto de 07/10/2026, roadmap item 1) |
| Urgência         | Próxima sprint. A 1ª fase da FUVEST 2027 é em 01/11/2026, e o pico de simulados é agora |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O sorteio é uniforme entre as questões válidas que atendem aos filtros (`services/geracao.py`) e não sabe o que o estudante já fez:
  - a Prova completa sorteia o alvo de cada disciplina (RN-003) entre todas as questões dela;
  - o Personalizado sorteia a quantidade pedida entre as questões dos filtros;
  - o Treino exclui só as questões já mostradas **na sessão** (`excluir`), e esquece tudo ao sair da página.
- O histórico do navegador (`HistoricoEntry.questaoIds`), que com conta é o espelho da conta (ADR-011), já tem as questões de cada simulado concluído, mas a geração não o usa.

### Problema ou Necessidade
- A base tem 786 questões válidas (9 provas, em 07/10/2026). Cada Prova completa usa 80, cerca de 10% da base.
- Com o sorteio sem memória, a repetição chega cedo: cerca de 19% das questões do 3º simulado já apareceram antes, e cerca de 42% no 6º (`1 − 0,9^k`, com k simulados anteriores).
- Quem fez as 9 provas de um ano já viu a base inteira, mas a Prova completa continua sorteando como se nada tivesse sido feito.
- Nas semanas antes da 1ª fase, quem mais usa o site é quem faz vários simulados por semana, e é para esse estudante que a repetição pesa mais.

### Situação Desejada (TO-BE)
- Sem nenhuma opção nova para configurar, o sorteio dá prioridade às questões inéditas para o estudante. Com a base de hoje, isso garante cerca de 9 Provas completas sem repetir questão.
- Quando faltam inéditas, entram as questões vistas há mais tempo, para que a repetição fique o mais espaçada possível.
- No início, a descrição da Prova completa, do Personalizado e do Treino avisa: "As questões que você ainda não fez vêm primeiro."

---

## 4. Detalhamento da Mudança

### Decisões do usuário (07/10/2026)

| ID | Decisão | Escolha |
|----|---------|---------|
| D1 | Onde o site descobre quais questões o estudante já fez | **O navegador manda a lista** no pedido de geração (`vistas`), tirada do histórico do navegador, que com conta é o espelho da conta. A geração continua sem estado (ADR-004), como o `excluir` do Treino, e conta também os simulados ainda não enviados à conta |
| D2 | Quais repetidas entram quando faltam inéditas | **As vistas há mais tempo**, do simulado mais antigo para o mais recente |
| D3 | O estudante pode desligar a prioridade | **Não: sempre ligada.** Para refazer questões de propósito ficam a Prova de um ano e, depois, o caderno de erros (roadmap item 2) |
| D4 | O que o estudante vê | **Uma frase nos modos:** "As questões que você ainda não fez vêm primeiro." na descrição da Prova completa, do Personalizado e do Treino, no início |

### Premissas adotadas (sem pergunta, por seguirem as regras existentes)

| ID | Premissa |
|----|----------|
| P1 | **Questão vista** = qualquer questão de um simulado concluído do histórico (Prova completa, Personalizado ou Prova de um ano), inclusive as deixadas em branco e as anuladas. O Treino não conta, porque não tem histórico (RF-012) |
| P2 | A memória é a do histórico: os 50 simulados mais recentes (RN-016). Uma questão que só apareceu em simulados mais antigos volta a ser inédita. "Limpar histórico" também zera a memória |
| P3 | A prioridade nunca reduz o que pode ser sorteado: `disponiveis`, o 409 `questoes_insuficientes` e a distribuição da Prova completa (RN-003) não mudam |
| P4 | Sem `vistas` (lista vazia), o sorteio é exatamente o de antes do CR: a mesma semente gera o mesmo simulado |

### 4.1 O que muda

| # | Item | Antes (AS-IS) | Depois (TO-BE) |
|---|------|---------------|----------------|
| 1 | Pedido de geração (`GerarCompleta`, `GerarPersonalizado`, `GerarTreino`) | Sem informação do histórico | Campo opcional `vistas: list[IdQuestao]` (até 4.500 ids = 50 simulados × 90, RN-016), da questão vista mais recentemente para a mais antiga. Ids repetidos ou fora da base são aceitos e ignorados |
| 2 | Sorteio (`_priorizar`) | `rng.sample` entre todas as candidatas | Se as inéditas bastam, `rng.sample` entre elas; senão, todas as inéditas e, para completar, as vistas há mais tempo (pela posição em `vistas`, a mais antiga primeiro) |
| 3 | Prova completa | Sorteio por disciplina, déficit coberto pelo restante | O mesmo, com `_priorizar` no alvo de cada disciplina e no déficit |
| 4 | Personalizado | `rng.sample(candidatas, quantidade)` | `_priorizar(candidatas, quantidade)` |
| 5 | Treino | Lote de 20 entre as que não estão em `excluir` | O mesmo, com `_priorizar`: dentro da sessão, `excluir` continua tirando as já mostradas, e `vistas` dá prioridade às que o estudante nunca fez em simulado |
| 6 | SPA | Pedido sem histórico | `useIniciarSimulado` (Prova completa e Personalizado) e o Treino mandam `vistas = questoesVistas(listarHistorico())` |
| 7 | Início | Descrições sem menção ao histórico | Prova completa: "80 questões na distribuição da prova real, com 5 horas. As questões que você ainda não fez vêm primeiro."; Personalizado e Treino ganham a mesma frase no fim da descrição |
| 8 | PRD | — | RF-009, RF-010 e RF-012 com a prioridade; RN-023 nova; US-025; glossário "Questão inédita" |

### 4.2 O que NÃO muda
- A Prova de um ano: a prova inteira, na ordem original (RF-011); `GerarAno` não tem `vistas`, e o campo, se vier, é ignorado como qualquer campo extra.
- A distribuição da Prova completa (RN-003), a não repetição dentro do simulado (RN-004), o agrupamento por texto-base (RN-005), os tempos (RN-009) e o 409 do Personalizado.
- O contador de geração (o Treino continua contando só sem `excluir`), a correção, o formato do histórico e a sincronização com a conta.
- Nenhuma tabela, migration ou variável de ambiente. O servidor não grava nem registra a lista `vistas`.
- A apresentação (sem login) e as telas de configuração do Personalizado e do Treino: nenhum texto novo nelas.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, RF-009, RF-010, RF-012, US, RN, Glossário, histórico | v7.1: prioridade das inéditas nos três modos, RN-023, US-025, termo "Questão inédita" |
| `/docs/02-ARCHITECTURE.md` | Sim | ADR-004, §5 (Backend) | Nota: a geração recebe do navegador a lista das questões já feitas e continua sem estado; v1.15 |
| `/docs/03-SPEC.md` | Sim | Cabeçalho, §2 (contrato de `POST /api/simulados`), changelog | v1.14 |
| `/docs/specs/02-catalogo-e-geracao.md` | Sim | §2.2, §2.3, §2.5, §5, §6 | v1.4: `vistas`, `_priorizar`, validação, casos de borda, BT-112 a BT-116 |
| `/docs/specs/03-resolucao.md` | Sim | §2.3 (Iniciar simulado, Treino), §3 (Início com conta), §6 | v1.12: `vistas` no pedido, frases dos modos, FT-027 e FT-028 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Cabeçalho, Visão Geral | CR-015 na tabela |
| `/docs/05-DEPLOY-GUIDE.md` | Não | — | Sem migration, variável nem procedimento novo |
| `/docs/ROADMAP.md` | Sim | Item 1, changelog | Status "Concluído (CR-015)" |
| `CLAUDE.md` | Sim | Documentos existentes, Change Requests, Última tarefa | CR-015 nos 5 mais recentes (sai o CR-010, que já está no INDEX); roadmap nos documentos |
| `/docs/changes/INDEX.md` | Sim | Tabela | CR-015 |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `backend/app/schemas.py` | `LIMITE_VISTAS = 4500` e o tipo `Vistas`; campo `vistas` em `GerarCompleta`, `GerarPersonalizado` e `GerarTreino` |
| Modificar | `backend/app/services/geracao.py` | `_priorizar` (inéditas primeiro, depois as vistas há mais tempo); `sortear_completa` recebe a idade de cada questão; Personalizado e Treino usam `_priorizar` |
| Modificar | `backend/tests/test_geracao.py` | BT-112 a BT-115 |
| Modificar | `backend/tests/test_api_simulados.py` | BT-116 (validação de `vistas` na API) |
| Modificar | `frontend/src/types.ts` | `vistas?: string[]` nos pedidos de Prova completa, Personalizado e Treino |
| Modificar | `frontend/src/simulado/novoSimulado.ts` | `questoesVistas(historico)`: as questões do histórico, da mais recente para a mais antiga, sem repetição, até `LIMITE_VISTAS` |
| Modificar | `frontend/src/hooks/useIniciarSimulado.ts` | Acrescenta `vistas` ao pedido (menos na Prova de um ano) |
| Modificar | `frontend/src/pages/TreinoPage.tsx` | `vistas` lidas uma vez por sessão e mandadas em todos os lotes |
| Modificar | `frontend/src/pages/HomePage.tsx` | Frase nas descrições da Prova completa, do Personalizado e do Treino |
| Criar | `frontend/src/simulado/novoSimulado.test.ts` | FT-027 (`questoesVistas`) |
| Modificar | testes do início e do Treino | FT-028 (o pedido leva `vistas`; frases no início) |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma: a lista vem no pedido e não é gravada | Não |

**Migration:** N/A.

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Backend: `vistas` nos schemas e `_priorizar` nos três modos, com testes | — | BT-112 a BT-116 passam; a suíte inteira passa; ruff limpo |
| CR-T-02 | Frontend: `questoesVistas`, `vistas` em `useIniciarSimulado` e no Treino, frases do início, com testes | CR-T-01 | FT-027 e FT-028 passam; tsc, eslint e vitest limpos |
| CR-T-03 | Validação em runtime | CR-T-02 | Chamadas HTTP e fluxo no Playwright registrados no §8 |
| CR-T-04 | Revisão de código (`/code-review`) e de segurança | CR-T-03 | Findings corrigidos ou justificados no §8 |
| CR-T-05 | Documentação | CR-T-04 | Docs do §5 atualizados |

---

## 8. Critérios de Aceite

- [ ] Com `vistas`, a Prova completa não traz nenhuma questão vista enquanto houver inéditas suficientes em cada disciplina (BT-112)
- [ ] Quando faltam inéditas numa disciplina, a Prova completa usa todas as inéditas dela e completa com as vistas há mais tempo; o total por disciplina continua o da RN-003 (BT-113)
- [ ] O Personalizado e o Treino dão prioridade às inéditas; o Treino continua respeitando `excluir` (BT-114)
- [ ] Sem `vistas`, a mesma semente gera o mesmo simulado de antes do CR (BT-115)
- [ ] `vistas` com mais de 4.500 ids ou com id fora do formato → 422; ids repetidos ou fora da base são aceitos (BT-116)
- [ ] O SPA manda `vistas` na Prova completa, no Personalizado e no Treino, da mais recente para a mais antiga, sem repetição; a Prova de um ano não manda (FT-027, FT-028)
- [ ] O início mostra "As questões que você ainda não fez vêm primeiro." na Prova completa, no Personalizado e no Treino (FT-028)
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança
- [ ] Fluxo afetado exercitado em runtime antes do merge — registrar o que foi validado e o resultado
- [ ] Revisão de código pré-merge (`/code-review` no diff da branch) executada — registrar findings corrigidos/justificados
- [ ] Revisão de segurança (checklist OWASP do CLAUDE.md) executada — o contrato de `POST /api/simulados` muda
- [ ] Documentos afetados foram atualizados
- [ ] CI verde na branch e em `master`

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| # | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|---|--------------------------|---------------|---------|-----------|
| 1 | Pedido grande | Baixa | Baixo | Limite de 4.500 ids (cerca de 70 KB no pior caso). Na prática, a lista não passa do tamanho da base (786 hoje), porque não tem repetição |
| 2 | Aba aberta durante o deploy | Média | Baixo | SPA antigo com servidor novo: sem `vistas`, o sorteio é o de antes (P4). SPA novo com servidor antigo: o campo extra é ignorado (spec 02, caso de borda 10) |
| 3 | Histórico desatualizado num aparelho que ainda não sincronizou | Baixa | Baixo | A sincronização roda ao abrir o site; no pior caso, algumas questões feitas em outro aparelho podem repetir |
| 4 | Depois de esgotar a base, a ordem "vistas há mais tempo" é determinística e repete em ciclo | Média | Baixo | É o comportamento desejado (D2): a repetição fica o mais espaçada possível. A ampliação da base (roadmap item 10) adia o ciclo |
| 5 | O estudante quer refazer questões e não consegue escolher | Baixa | Baixo | D3: a Prova de um ano continua igual, e o caderno de erros (roadmap item 2) vem em seguida |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (seções 4 e 5).

### 10.1 Rollback de Código
- **Método:** `git checkout -b hotfix/revert-CR-015` → `git revert -m 1 <merge do CR-015>` → merge em `master` → push
- **Método alternativo:** redeploy do deployment anterior pelo dashboard da Railway
- **Commits a reverter:** o merge da branch `feat/CR-015-questoes-ineditas`

### 10.2 Rollback de Migration
- N/A: sem migration.

### 10.3 Impacto em Dados
- **Dados serão perdidos no rollback?** Não. Nada é gravado: o histórico e as contas não mudam.
- **Backup necessário antes do deploy?** Não.

### 10.4 Rollback de Variáveis de Ambiente
- **Variáveis novas/alteradas:** nenhuma.

### 10.5 Verificação Pós-Rollback
- [ ] Aplicação acessível e funcional
- [ ] Prova completa, Personalizado e Treino geram simulados
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data | Autor | Descrição |
|------|-------|-----------|
| 2026-10-07 | Rafael Peixoto (com Claude) | CR criado, com as decisões D1–D4 do usuário e as premissas P1–P4 |
