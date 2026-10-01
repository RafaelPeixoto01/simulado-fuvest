# Change Request — CR-004: Assuntos e desempenho (Fase 3A do roadmap)

**Versão:** 1.0  
**Data:** 2026-09-30  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Primeira parte da Fase 3 do roadmap do PRD ("Contas e estatísticas"). Cada questão passa a ter **um assunto** dentro da sua disciplina principal, tirado de uma taxonomia fixa condensada do programa oficial da FUVEST. O estudante vê o desempenho **por assunto** no resultado de cada simulado e num **painel acumulado** ("Meu desempenho") que agrega o histórico do navegador. A segunda parte da Fase 3 (contas com login Google e histórico no servidor) fica para um CR próprio (Fase 3B).

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (com mudança de contrato do pacote `prova.yaml` e da API) |
| Origem           | Evolução do produto (Roadmap Futuro do PRD, Fase 3) |
| Urgência         | Próxima sprint |
| Complexidade     | Alta |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- A única classificação da questão é a disciplina (principal + secundárias). O `prova.yaml` não tem assunto, e o PRD lista "Classificação por assunto dentro da disciplina" como fora de escopo.
- O resultado mostra acertos por disciplina (RF-018). O histórico (RF-020) só lista os simulados, sem nenhuma visão acumulada.

### Problema ou Necessidade
Saber que vai mal em Física não diz o que estudar. O estudante precisa ver **em que parte** da disciplina erra (Eletricidade? Óptica?), tanto num simulado quanto somando os simulados que já fez.

### Situação Desejada (TO-BE)
- **Taxonomia** `data/provas/assuntos.yaml`: de 11 a 14 assuntos por disciplina (5 em Inglês), condensados do "Programa das disciplinas" do Guia de Provas FUVEST, versionada no repositório como os pacotes (ADR-002, ADR-009).
- **Exatamente 1 assunto por questão**, da disciplina principal. É obrigatório para publicar: uma nova validação, a **V11**, bloqueia pacote publicado sem assunto válido.
- **Resultado:** em "Por disciplina", cada disciplina ganha "Ver por assunto", com os acertos de cada assunto.
- **Painel "Meu desempenho"** (`/desempenho`): soma os simulados concluídos do histórico local, por disciplina e por assunto, do pior para o melhor.

**Decisões do usuário (30/09/2026):**
- **D1 · Ordem:** assuntos antes das contas, porque não coletam dado pessoal. As contas viram a Fase 3B (CR próprio).
- **D2 · Taxonomia:** programa FUVEST condensado (a faixa combinada era de 8 a 15 assuntos por disciplina), com rascunho de Claude revisado pelo usuário. **Gate 1 (30/09):** aprovada como proposta, com 11 a 14 assuntos por disciplina e 5 em Inglês (a prova é só de leitura: 19 questões em 3 provas).
- **D3 · Um assunto por questão:** as estatísticas fecham a conta.
- **D4 · Obrigatório:** V11 bloqueante, com as 270 questões publicadas (2023–2025) classificadas **na mesma entrega**, para nenhuma prova sair do ar. 2022 e 2020 nascem classificadas na curadoria delas (T-029).
- **D5 · Onde aparece:** resultado do simulado e painel acumulado. **Sem** filtro por assunto no Personalizado/Treino.
- **D6 · Treino fora do painel:** o painel usa só os simulados concluídos; o Treino continua sem histórico (RF-012).
- **Para a Fase 3B (registrado no PRD):** login só com Google; o servidor sincroniza só o histórico concluído.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Pacote `prova.yaml` | `disciplina` + `disciplinas_secundarias` | + `assunto` (slug da taxonomia; `null` no rascunho) |
| 2 | Taxonomia | Não existe | `data/provas/assuntos.yaml`, carregado e validado por `app/pacote/assuntos.py` |
| 3 | Validação | V01–V10 | + **V11** (bloqueante): assunto definido e pertencente à disciplina principal; `validar` também valida a taxonomia |
| 4 | Banco | `questoes` sem assunto | Coluna `questoes.assunto` (varchar 40, nullable, índice), migration `002_assunto_questoes` |
| 5 | Sincronização | — | Grava `assunto`; taxonomia inválida ou ausente aborta a sincronização (exit 1) sem tocar o banco |
| 6 | `GET /api/catalogo` | Disciplinas com `total_questoes` | + `assuntos[{slug, nome, total_questoes}]` em cada disciplina, na ordem da taxonomia |
| 7 | `POST /api/correcoes` | Item com `disciplina`; `por_disciplina` | Item com `assunto`; cada disciplina com `assuntos[{assunto, nome, total, acertos, percentual}]` |
| 8 | Resultado | "Por disciplina" com barras | + "Ver por assunto" recolhido em cada disciplina |
| 9 | Painel | Não existe | `/desempenho` ("Meu desempenho"), com link no cabeçalho e no Histórico |
| 10 | CLI do curador | — | `python -m ingestao assuntos [--ano AAAA]`: relatório da classificação para revisão |

### 4.2 O que NÃO muda

- Geração dos simulados (os 4 modos, RN-002 a RN-005, RN-009): o assunto não entra no sorteio nem nos filtros (D5).
- `QuestaoPublica` (`POST /api/simulados`, `GET /api/questoes`): o assunto **não** aparece durante a resolução.
- Regra da nota (RN-002, RN-008) e a ordem "Por disciplina" (do pior para o melhor).
- Treino: sem histórico permanente (RF-012) e fora do painel (D6).
- `HistoricoEntry` continua `versao: 1` (campos novos opcionais); servidor sem estado do estudante (ADR-004).
- Disciplinas secundárias: continuam só informativas, sem assunto.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, RF-005, RF-018, módulo "Desempenho" (RF-022, RF-023), US-011/US-012, RN-007, RN-014, RN-015, Fora de Escopo, Glossário, Roadmap | v2.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura de pastas, Modelagem (`questoes.assunto`, seção Assuntos), padrões da API, ADR-009 | v1.4 |
| `/docs/03-SPEC.md` | Sim | Índice (spec 06), contratos, changelog | v1.4 |
| `/docs/specs/01-ingestao.md` | Sim | Schema do pacote, V11, comando `assuntos`, sincronização, testes | v1.1 |
| `/docs/specs/02-catalogo-e-geracao.md` | Sim | `DisciplinaCatalogo.assuntos` | v1.1 |
| `/docs/specs/04-correcao-resultado.md` | Sim | `ItemCorrigido.assunto`, `DesempenhoAssunto`, componente `DesempenhoDisciplinas` | v1.2 |
| `/docs/specs/06-assuntos-desempenho.md` | Sim (novo) | Taxonomia, painel, casos de borda, testes | Criar v1.0 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-004 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Migration 002, publicação exige assunto, rollback conjunto código + conteúdo | Atualizar |
| `CLAUDE.md` | Sim | Change Requests, Comandos Essenciais (`ingestao assuntos`), Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `backend/app/pacote/assuntos.py` | Schema Pydantic da taxonomia, `carregar_taxonomia` (estrito) e `taxonomia_em_uso` (cache por mtime, tolerante) |
| Criar | `data/provas/assuntos.yaml` | Taxonomia (conteúdo) |
| Modificar | `backend/app/pacote/schema.py` | `Questao.assunto` |
| Modificar | `backend/app/pacote/validacao.py` | V11; `validar_pacote` recebe a taxonomia |
| Modificar | `backend/app/pacote/sincronizar.py` | Carrega a taxonomia, grava `assunto`; aborta se a taxonomia for inválida |
| Modificar | `backend/app/models.py` | `Questao.assunto` |
| Criar | `backend/alembic/versions/002_assunto_questoes.py` | Coluna + índice |
| Modificar | `backend/app/schemas.py` | `AssuntoCatalogo`, `DesempenhoAssunto`, campos novos |
| Modificar | `backend/app/services/catalogo.py`, `correcao.py` | Assuntos no catálogo e na correção |
| Modificar | `backend/app/routers/catalogo.py`, `correcoes.py`, `app/dependencias.py` | Dependência `obter_taxonomia` |
| Modificar | `backend/ingestao/cli.py` | `validar` com taxonomia; comando `assuntos` |
| Modificar | `backend/tests/fixtures/gerar_pacotes.py` | Taxonomia sintética + assunto em cada questão |
| Criar/Modificar | `backend/tests/test_pacote_assuntos.py`, `test_cli_assuntos.py`, `test_pacote_validacao.py`, `test_pacote_sincronizar.py`, `test_migrations.py`, `test_catalogo.py`, `test_correcao.py` | Testes |
| Modificar | `frontend/src/types.ts` | Tipos novos |
| Modificar | `frontend/src/components/resultado/DesempenhoDisciplinas.tsx` | "Ver por assunto" |
| Criar | `frontend/src/utils/desempenho.ts` (+ teste) | Agregação do painel (RN-015) |
| Criar | `frontend/src/pages/DesempenhoPage.tsx` (+ teste) | Painel |
| Modificar | `frontend/src/App.tsx`, `components/Layout.tsx`, `pages/HistoricoPage.tsx` | Rota e links |
| Modificar | `data/provas/2023..2025/prova.yaml` | Assunto nas 270 questões (curadoria) |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| Adicionar coluna | `questoes.assunto varchar(40) NULL` + índice `ix_questoes_assunto` | Sim (`002_assunto_questoes`) |

**Migration:**
```sql
ALTER TABLE questoes ADD COLUMN assunto VARCHAR(40);
CREATE INDEX ix_questoes_assunto ON questoes (assunto);
```
A coluna é nullable porque a migration roda antes da sincronização no start do container. A sincronização do mesmo start regrava todas as questões com o assunto, e a V11 garante que toda questão publicada tem um.

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, PRD v2.0, Arquitetura v1.4 (ADR-009), spec 06 nova, specs 01/02/04, índice 03, Plano, Deploy Guide | — | Docs revisados e commitados |
| CR-T-02 | Taxonomia: `app/pacote/assuntos.py` + rascunho de `data/provas/assuntos.yaml` a partir do Guia de Provas FUVEST. **Gate 1: o usuário revisa a taxonomia** | CR-T-01 | Testes da taxonomia verdes; taxonomia aprovada pelo usuário |
| CR-T-03 | Pacote: `Questao.assunto`, V11, `validar` com taxonomia, pacotes sintéticos com assunto | CR-T-02 | IT-014 a IT-017 verdes; `extrair` gera `assunto: null` |
| CR-T-04 | Banco: migration 002, model, sincronização gravando `assunto` e abortando com taxonomia inválida | CR-T-03 | Upgrade/downgrade verdes; IT-018 e IT-019 verdes |
| CR-T-05 | API: assuntos no catálogo e na correção | CR-T-04 | BT-025, BT-026 e os BT-001/BT-020 a BT-024 existentes verdes |
| CR-T-06 | CLI `ingestao assuntos` | CR-T-03 | IT-020 verde |
| CR-T-07 | Resultado: tipos + "Ver por assunto" | CR-T-05 | UT-024 verde |
| CR-T-08 | Painel `/desempenho` + links | CR-T-07 | UT-025, UT-026 verdes; FT-012 exercitado |
| CR-T-09 | **(curador)** Classificar as 270 questões de 2023–2025 (primeira passada por Claude, relatório do `ingestao assuntos`). **Gate 2: o usuário revisa** | CR-T-02, CR-T-06 | `validar --todas` verde com V11; usuário aprovou a classificação |
| CR-T-10 | Revisão OWASP, validação runtime, `/code-review`, docs finais, merge + push + CI verde | CR-T-01 a CR-T-09 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] Toda questão publicada (2023, 2024 e 2025) tem exatamente 1 assunto, da taxonomia da sua disciplina principal, e `validar --todas` passa com a V11 ativa — 270/270, `validar --todas` verde, 0 questão sem assunto no banco local; **Gate 2 aprovado pelo usuário em 01/10, sem ajustes** (15 dúvidas apresentadas e mantidas)
- [x] Pacote publicado sem assunto, ou com assunto de outra disciplina, é bloqueado pela V11 (CLI, CI e sincronização) — IT-015, `test_publicada_sem_assunto_falha_com_v11`
- [x] Taxonomia inválida é recusada por `validar` e faz a sincronização terminar com erro sem alterar o banco — IT-016, IT-019
- [x] `GET /api/catalogo` traz os assuntos de cada disciplina com o total de questões não anuladas — BT-025; HTTP real abaixo
- [x] `POST /api/correcoes` traz o assunto de cada item e os assuntos de cada disciplina, do pior para o melhor — BT-026; HTTP real abaixo
- [x] No resultado, "Ver por assunto" mostra os acertos por assunto de cada disciplina; resultado antigo, sem assunto, abre sem erro — UT-024; Playwright abaixo
- [x] `/desempenho` agrega o histórico local por disciplina e assunto (RN-015): anuladas fora, em branco como erro, "poucas questões" abaixo de 5, estado vazio e aviso de histórico local — UT-025, UT-026; Playwright abaixo
- [x] O Treino não entra no painel, e o assunto não aparece durante a resolução — o painel lê só o histórico (o Treino não grava nele, RF-012); `GET /api/questoes` e `POST /api/simulados` sem `assunto` (conferido por HTTP)
- [x] `python -m ingestao assuntos --ano AAAA` lista a classificação para revisão — IT-020
- [x] Migration `002` testada: `upgrade head` + `downgrade -1` (SQLite local e Postgres no CI) — local `001 → 002 → 001 → 002` em 30/09; CI da branch verde (job "Backend ... migrations no Postgres")
- [x] Testes existentes continuam passando (regressão) — backend 217 testes, frontend 159
- [x] Novos testes cobrem a mudança — IT-014 a IT-020, BT-025, BT-026, BT-047, UT-024 a UT-026 + 2 da revisão de código
- [x] Fluxo afetado exercitado em runtime antes do merge — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: dois endpoints alterados — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — PRD v2.0, Arquitetura v1.4, 03-SPEC v1.4, specs 01/02/03/04/06, Plano, Deploy Guide v1.1, CLAUDE.md, INDEX.md
- [x] CI verde na branch e em `master`; `/api/catalogo` em produção com os assuntos — branch verde (runs 36870182478 e 36871841546), `master` verde no merge `128550c` (run 36873133200). Em produção (01/10): 3 provas e 270 questões; em todas as disciplinas os assuntos somam o total; `POST /api/correcoes` com `assunto` por item e nomes da taxonomia; `/desempenho` → 200

**Validação runtime (01/10/2026, build servido pelo FastAPI na porta 8001, SQLite local com 2023–2025):**
- HTTP: `GET /api/health` → 3 provas; `GET /api/catalogo` → em todas as disciplinas a soma dos assuntos é igual ao total (Física: 31); `POST /api/correcoes` com 5 questões de 2025 → `assunto` em cada item e Física com "Física moderna e radiações 0/1", "Óptica 1/2", "Impulso e quantidade de movimento 1/1" (do pior para o melhor); payload inválido → 422; `/desempenho` → 200 (SPA).
- Playwright (FT-012): Prova de um ano 2025 → 4 respostas pelo teclado → "Finalizar simulado" → resultado com "Ver por assunto" recolhido em cada disciplina; aberto em Geografia, 11 assuntos do pior para o melhor. Link "Desempenho" do cabeçalho → painel com 2 simulados (o novo e um anterior ao CR-004, já no navegador), 180 questões; Geografia com "poucas questões" e "Sem assunto 1 de 13" por último; nomes do catálogo. Console sem erros nem avisos.
- **Achado e corrigido:** a 320 px, os dois links do cabeçalho estouravam a largura (documento com 340 px). Abaixo de 640 px os links ficaram empilhados (`da8f190`); a 320 px o documento passou a 305 px e a 360 px ficou sem rolagem; a 1440 px, os links continuam lado a lado.

**Revisão de código (`/code-review high`, diff `master...HEAD`) — 8 achados, 6 corrigidos e 2 justificados (`17d2dee`):**
1. Corrigido: `ingestao assuntos` quebrava com `UnicodeEncodeError` quando a saída era redirecionada no Windows (cp1252). A CLI passou a escrever em UTF-8 (teste com subprocesso).
2. Justificado: renomear um slug na taxonomia sem reclassificar tira as provas do banco na sincronização (exit 0). É o mesmo comportamento de qualquer pendência V01–V10 (ADR-002, spec 01 caso de borda 7); o portão é o CI (`validar --todas`), e o caso está documentado (spec 01 caso 12, Deploy Guide §4.4).
3. Corrigido: o comentário de `calcularPercentual` prometia o mesmo arredondamento do servidor, mas os empates exatos diferem (Python arredonda para o par). O comentário agora diz isso, porque o painel não é comparado número a número com a API.
4. Corrigido: a docstring de `validar_pacote` não batia com o `extrair`, que agora passa `None` (o rascunho não tem assunto; sem aviso de taxonomia ausente no stderr).
5. Justificado: um `stat` do `assuntos.yaml` por requisição custa pouco e deixa a taxonomia ser trocada sem reiniciar no desenvolvimento e nos testes, cujos dados entram depois de o app ser criado.
6. Corrigido: a escolha dos diretórios ficou num helper único, `_diretorios_alvo`, usado por `validar` e `assuntos`.
7. Corrigido: `Placar` único para "a de t (p%)", usado no resultado e no painel.
8. Corrigido: questão sem disciplina aparecia em "Sem disciplina" e de novo em "Sem assunto"; agora só na primeira (teste novo).

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum segredo novo; nenhuma variável de ambiente nova |
| Validação de entrada | Corpos das requisições inalterados (Pydantic). A taxonomia é conteúdo do repositório, validada por Pydantic (`extra="forbid"`, slug `^[a-z0-9-]+$`) no CI e na sincronização |
| Tokens / ownership | N/A: sem usuário nem dado pessoal (ADR-004 inalterado); o painel lê só o `localStorage` |
| SQL | Só ORM/`select()` parametrizado (`select(Questao.disciplina, Questao.assunto)`) |
| Caminho de arquivo | `DATA_DIR/assuntos.yaml`, fixo, sem entrada do usuário |
| XSS | Nomes de assunto renderizados como texto pelo React; nada de HTML |
| Exposição de dados | Gabarito continua só em `POST /api/correcoes`; o assunto não vai na questão pública |
| CORS / headers | Inalterados |
| Dependências | Nenhuma nova (PyYAML já era usado) |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | V11 tira provas do ar se o merge não tiver a classificação | Baixa | Alto | V11 e classificação de 2023–2025 no mesmo merge; `validar --todas` e `importar` locais com as 3 provas antes do push; CI roda `validar --todas` |
| 2 | Rollback só do código com os pacotes já classificados invalida as provas (`extra="forbid"` rejeita `assunto`) | Média | Alto | Rollback = `git revert` do merge inteiro (código + conteúdo); documentado aqui e no Deploy Guide |
| 3 | Taxonomia quebrada chega à produção | Baixa | Alto | `validar` valida a taxonomia no CI; a sincronização aborta (exit 1) sem tocar o banco, o deploy falha no start e a Railway mantém o anterior |
| 4 | Amostras pequenas por assunto num simulado (1–2 questões) | Alta | Baixo | Detalhe recolhido no resultado; limiar de 5 questões e aviso "poucas questões" no painel (RN-015) |
| 5 | Classificação subjetiva (questão que cabe em dois assuntos) | Média | Baixo | Um assunto por questão (D3); dúvidas listadas para o usuário no Gate 2; reporte "outro" continua disponível |
| 6 | Reclassificação posterior não altera resultados antigos | Alta | Baixo | O resultado guarda o assunto do momento da correção (documentado na spec 06); o painel usa o que está no histórico |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-004` → `git revert -m 1 <merge do CR-004>` → merge em `master` → push. O revert leva **código e conteúdo juntos** (taxonomia + `assunto` nos pacotes); reverter só o código deixaria os pacotes com um campo que o schema antigo rejeita.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard. A imagem antiga traz os pacotes antigos, então é consistente.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-004-assuntos`.

### 10.2 Rollback de Migration

- **Migration afetada:** `002_assunto_questoes.py`
- **Comando de downgrade:** `alembic downgrade 001`
- **Downgrade testado?** [x] Sim / [ ] Nao — SQLite local e Postgres no CI
- **Downgrade é destrutivo?** [ ] Sim / [x] Nao — a coluna só tem dado derivado do repositório, recriado na sincronização

Sem o downgrade, o código anterior também funciona: ele ignora a coluna extra.

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** o banco de questões é um índice derivado de `data/provas` (ADR-002). Os reportes e as estatísticas de geração não são tocados. O histórico do estudante fica no navegador, e os resultados já gravados com assunto continuam abrindo no código antigo, que ignora os campos extras.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `alembic current` mostra a revisão esperada (se a migration foi revertida)
- [ ] `/api/catalogo` sem `assuntos` e com as mesmas provas de antes
- [ ] ~~Usuários existentes conseguem fazer login~~ — N/A: o site não tem login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-09-30 | Rafael Peixoto (com Claude) | CR criado com as decisões D1–D6 |
| 2026-09-30 | Rafael Peixoto (com Claude) | Gate 1: taxonomia aprovada como proposta (Inglês com 5 assuntos) |
| 2026-10-01 | Rafael Peixoto (com Claude) | Implementação concluída (CR-T-01 a CR-T-08), primeira passada da classificação (CR-T-09), validação runtime, revisão de código e de segurança; CI da branch verde |
| 2026-10-01 | Rafael Peixoto (com Claude) | Gate 2: classificação de 2023–2025 aprovada sem ajustes; merge em `master` autorizado |
| 2026-10-01 | Rafael Peixoto (com Claude) | Merge `128550c`, CI de `master` verde e conferência em produção — validação ✅, status Concluído |
