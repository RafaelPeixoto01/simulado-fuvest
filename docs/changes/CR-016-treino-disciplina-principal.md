# Change Request — CR-016: Treino filtra pela disciplina principal

**Versão:** 1.0  
**Data:** 2026-10-09  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

No **Treino por questão**, o filtro de disciplinas passa a considerar **só a disciplina principal** da questão. Uma questão interdisciplinar entra no Treino apenas da disciplina principal dela, e não mais no das disciplinas secundárias. O **Personalizado não muda**: continua aceitando a questão quando a principal ou alguma secundária está entre as escolhidas.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Mudança de Regra de Negócio (filtro do Treino) |
| Origem           | Feedback do usuário: um estudante montou um Treino só de Biologia e recebeu uma questão rotulada como Química |
| Urgência         | Próxima sprint |
| Complexidade     | Baixa |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O Treino e o Personalizado usam o mesmo filtro (`_da_disciplina` em `services/geracao.py`): a questão entra quando a disciplina principal **ou** alguma secundária está entre as escolhidas (spec 02 §2.3; caso de borda 4).
- O cabeçalho da questão mostra só a disciplina principal: "Química, FUVEST 2023 (questão 80)" (`QuestaoView`).
- O Personalizado avisa na configuração: "Questões interdisciplinares entram quando tocam uma das escolhidas." O Treino não tem esse aviso.

### Problema ou Necessidade
- Um estudante escolheu só Biologia no Treino e recebeu a Q80 da FUVEST 2023. Ela trata de hemoglobina e equilíbrio químico, e na base tem Química como principal e Biologia como secundária. A tela mostrou "Química", e o estudante entendeu que o filtro falhou.
- Não é um caso isolado. Na base de 09/10/2026 (786 questões válidas, 107 com disciplina secundária), a parte do Treino de cada disciplina que vem de outra principal é:

| Disciplina | Treino hoje | Só a principal | De outra principal |
|------------|------------:|---------------:|-------------------:|
| Biologia | 110 | 86 | 24 |
| Física | 97 | 86 | 11 |
| Geografia | 120 | 96 | 24 |
| História | 148 | 130 | 18 |
| Inglês | 71 | 67 | 4 |
| Matemática | 100 | 95 | 5 |
| Português | 149 | 135 | 14 |
| Química | 98 | 91 | 7 |

- No Treino, uma questão por vez e com o rótulo da disciplina, quem escolhe uma disciplina espera ver só ela.

### Situação Desejada (TO-BE)
- O Treino de uma disciplina traz só as questões com ela como principal. O rótulo do cabeçalho passa a ser sempre uma das disciplinas escolhidas.
- O Personalizado continua com a regra atual e com o aviso da configuração.

---

## 4. Detalhamento da Mudança

### Decisão do usuário (09/10/2026)

| ID | Decisão | Escolha |
|----|---------|---------|
| D1 | Como tratar as questões interdisciplinares no filtro de disciplinas | **Solução B:** no Treino, filtrar só pela principal; o Personalizado não muda. Descartadas: (A) manter a regra e mostrar a secundária no cabeçalho, com o aviso também no Treino; (C) opção "Incluir interdisciplinares" nos filtros |

### Premissas adotadas (sem pergunta, por seguirem as regras existentes)

| ID | Premissa |
|----|----------|
| P1 | Sem disciplina marcada, o Treino continua usando todas: nenhuma questão sai |
| P2 | A tela de filtros do Treino não ganha aviso novo: o comportamento passa a ser o esperado ("Sem nenhuma marcada, o treino usa todas." continua) |
| P3 | `excluir`, `vistas` (RN-023), o lote de 20, `disponiveis` e o contador de geração não mudam; `disponiveis` passa a contar só as candidatas pela principal |

### 4.1 O que muda

| # | Item | Antes (AS-IS) | Depois (TO-BE) |
|---|------|---------------|----------------|
| 1 | Filtro de disciplinas do Treino | Principal **ou** secundária entre as escolhidas | Só a principal entre as escolhidas |
| 2 | `disponiveis` do Treino com disciplinas | Conta as interdisciplinares que tocam a escolha | Conta só as de principal escolhida |
| 3 | Spec 02 (regra do treino e caso de borda 4) | "filtro igual ao personalizado" | Filtro próprio, pela principal; o caso de borda 4 diz que a questão não aparece no Treino de História |

### 4.2 O que NÃO muda

- O filtro do Personalizado (principal ou secundária) e o aviso da configuração dele.
- A Prova completa (distribuição pela principal, RN-003) e a Prova de um ano.
- O intervalo de anos, `excluir`, `vistas` e o lote de 20 do Treino.
- O pacote `prova.yaml`, a classificação das questões, o catálogo e o banco (sem migration).
- O cabeçalho da questão (`QuestaoView`) e as telas do Treino.

---

## 5. Impacto nos Documentos

| Documento                       | Impactado? | Seções Afetadas              | Ação Necessária       |
|---------------------------------|------------|------------------------------|-----------------------|
| `/docs/01-PRD.md`               | Sim | Cabeçalho, RF-010 e RF-012 (detalhamento), US-004, glossário (disciplina principal), histórico de versões | Filtro do Treino pela principal; v7.2 |
| `/docs/02-ARCHITECTURE.md`      | Não | — | Nenhuma decisão de arquitetura: a geração continua sem estado (ADR-004) e o modelo não muda |
| `/docs/03-SPEC.md`              | Sim | Cabeçalho, resumo, linha da spec 02; `specs/02-catalogo-e-geracao.md` (§2.3 treino, casos de borda, testes) | Regra do treino, caso 4 e BT-117. A spec 03 (telas do Treino) não muda: os filtros da tela e o pedido são os mesmos |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Cabeçalho e tabela de CRs | Linha do CR-016 |
| `/docs/05-DEPLOY-GUIDE.md`      | Não | — | Sem migration, variável ou procedimento novo |
| `CLAUDE.md`                     | Sim | Change Requests, Última Tarefa | CR-016; CR-011 vai para o INDEX.md (já está lá) |
| `docs/changes/INDEX.md`         | Sim | Tabela | Linha do CR-016 |
| `docs/ROADMAP.md`               | Não | — | Não é item do roadmap. O item 3 ("Treinar este assunto") já usa o assunto, que é da principal (RN-014) |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação      | Caminho do Arquivo                   | Descrição da Mudança               |
|-----------|--------------------------------------|-------------------------------------|
| Modificar | `backend/app/services/geracao.py`    | `_da_disciplina` com o parâmetro `secundarias`: o Personalizado passa `True`, o Treino `False` |
| Modificar | `backend/tests/test_geracao.py`      | BT-117: o Treino de uma disciplina não traz questão em que ela é só secundária, e o Personalizado continua trazendo; BT-114 passa a montar as candidatas pela principal |

### 6.2 Banco de Dados

| Ação      | Descrição                            | Migration Necessária? |
|-----------|--------------------------------------|-----------------------|
| Nenhuma   | O filtro usa as colunas que já existem | Não |

---

## 7. Tarefas de Implementação

| ID      | Tarefa                              | Depende de | Done When                          |
|---------|-------------------------------------|------------|------------------------------------|
| CR-T-01 | Filtro do Treino pela principal (`geracao.py`) e testes BT-117 e BT-114 | — | pytest e ruff verdes |
| CR-T-02 | Validação runtime na base real | CR-T-01 | `POST /api/simulados` com `modo: treino` e Biologia: nenhuma questão de outra principal e `disponiveis = 86`; o Personalizado de Biologia continua com 110 |
| CR-T-03 | Atualizar documentação | CR-T-01 | PRD, specs, plano, CLAUDE.md e INDEX refletem a mudança |

---

## 8. Critérios de Aceite

- [x] O Treino com Biologia não traz questão de outra principal (a Q80 da FUVEST 2023 não entra) e `disponiveis` é 86 na base real
- [x] O Personalizado com Biologia continua trazendo as interdisciplinares (`disponiveis` 110 na base real)
- [x] O Treino sem disciplina marcada continua usando todas as questões válidas (786 na base real)
- [x] Testes existentes continuam passando (regressão): pytest e ruff, e o hook do commit `ce43c8a` (pytest, ruff, tsc, eslint, vitest) verde
- [x] Novos testes cobrem a mudança: BT-117 (`test_treino_filtra_so_pela_disciplina_principal`), que falhou antes da correção (33 candidatas em vez de 24) e passa depois; BT-114 monta as candidatas pela principal
- [x] Fluxo afetado exercitado em runtime antes do merge: backend na porta 8002 sobre uma cópia SQLite da base real (9 provas, 786 questões) e 14 chamadas HTTP ao `POST /api/simulados`. Treino de Biologia percorrido até o fim com `excluir`: 86 questões, todas de Biologia, sem a `2023-080`. Personalizado de Biologia: `disponiveis` 110. Treino sem filtro: 786. Treino de Química: 91 questões, com a `2023-080`. Sem erro no log. A UI não muda (validação com Playwright N/A; o Playwright MCP também estava fora do ar nesta sessão)
- [x] ~~Revisão de código pré-merge~~ — N/A, complexidade Baixa (CR-040)
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md), por mudar o comportamento de um endpoint existente: sem segredos; entrada validada pelo mesmo Pydantic (`GerarTreino`, sem campo novo); nenhum token, cookie ou sessão tocado; a geração não lê dados de usuário (sem ownership); a consulta continua pelo ORM, e o filtro novo roda em Python sobre o resultado; CORS e headers inalterados; nenhuma dependência nova
- [x] Documentos afetados foram atualizados: PRD v7.2 (RF-010, RF-012, US-004, glossário), spec 02 v1.5 (§1, §2.3, caso 4, BT-117), índice 03-SPEC v1.15, plano, INDEX.md e CLAUDE.md
- [ ] CI verde na branch e em `master`

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral           | Probabilidade | Impacto | Mitigação                        |
|----|------------------------------------|---------------|---------|----------------------------------|
| 1  | O Treino de uma disciplina fica com menos questões (de 4 a 24 a menos, ver §3) | Alta | Baixo | Toda disciplina continua com 67 ou mais questões; o Treino sem filtro continua com todas |
| 2  | O Treino e o Personalizado passam a ter regras diferentes para o mesmo filtro | Alta | Baixo | O Personalizado mantém o aviso das interdisciplinares; a regra de cada um fica no PRD (RF-010, RF-012) e na spec 02 |
| 3  | Classificação errada de principal num pacote passa a tirar a questão do Treino da disciplina certa | Baixa | Baixo | A classificação é revisada pelo curador na publicação; o reporte de erro continua disponível |

---

## 10. Plano de Rollback

> Referencia: Procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (secoes 4 e 5).

### 10.1 Rollback de Codigo

- **Metodo:** `git checkout -b hotfix/revert-CR-016` → `git revert -m 1 <merge do CR-016>` → merge em `master` → push
- **Metodo alternativo:** Redeploy do deployment anterior via Railway Dashboard
- **Commits a reverter:** o merge da branch `fix/CR-016-treino-disciplina-principal`

### 10.2 Rollback de Migration

- N/A — sem migration.

### 10.3 Impacto em Dados

- **Dados serao perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** só a regra de filtro muda; nada é gravado
- **Backup necessario antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variaveis novas/alteradas:** Nenhuma

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicacao acessivel e funcional
- [ ] O Treino de Biologia volta a trazer as interdisciplinares (`disponiveis` 110)
- [ ] Usuarios existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição                    |
|------------|--------|------------------------------|
| 2026-10-09 | Rafael Peixoto (com Claude) | CR criado a partir do reporte de um estudante (Treino de Biologia com a Q80 da FUVEST 2023); D1 = solução B |
| 2026-10-09 | Rafael Peixoto (com Claude) | Implementação (CR-T-01), validação por HTTP na base real (CR-T-02) e documentos (CR-T-03). Falta o CI verde |
