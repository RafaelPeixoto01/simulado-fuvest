# Change Request — CR-013: Área de gestão (indicadores do site para o administrador)

**Versão:** 1.0  
**Data:** 2026-10-06  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

O site ganha uma **área de gestão** em `/gestao`, visível só para o administrador (o dono do produto), com os indicadores do site em quatro abas: **Uso** (estudantes cadastrados, logins, usuários ativos, simulados gerados e concluídos, taxa de conclusão), **Aprendizado** (acerto médio por modo, por disciplina e por assunto, carreiras-alvo mais escolhidas), **Qualidade** (reportes de erro resolvidos pela web, questões com acerto suspeito e saúde da base) e **Estudantes** (lista das contas para suporte). Os logins, os usuários ativos e as respostas por questão, que hoje não ficam registrados, passam a ser **contados por dia, sem identificar ninguém**. É o item "Área administrativa web para curadoria e reportes" da Fase 4 do roadmap, sem a curadoria das provas, que continua pela linha de comando.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (endpoints novos, duas tabelas novas de agregados, página nova) |
| Origem           | Evolução do produto (pedido do dono do produto; Fase 4 do roadmap do PRD) |
| Urgência         | Próxima sprint |
| Complexidade     | Alta |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O único indicador de uso é o contador anônimo de simulados gerados por dia e modo (`estatisticas_geracao`, PRD §2), que ninguém vê sem consultar o banco.
- **Logins não ficam registrados:** a linha de `sessoes` é apagada ao sair ou vencer, e `usuarios.ultimo_acesso_em` só muda no login. Como a sessão dura 90 dias, um estudante entra uma vez e fica três meses sem novo login.
- **Usuários ativos e respostas por questão não existem:** nada registra quem usou o site num dia, e as respostas só existem dentro do histórico de cada conta, que guarda os 50 mais recentes e é apagado por "Limpar histórico" e pela exclusão da conta.
- Os reportes de erro são lidos e resolvidos só pelo comando `python -m ingestao reportes`, rodado contra o banco de produção.
- O PRD proíbe área administrativa na web (RNF-004, §8 Fora de Escopo) e prevê "Área administrativa web para curadoria e reportes" na Fase 4 do roadmap.
- O site promete aos estudantes que guarda só nome, e-mail, os simulados concluídos e a carreira-alvo (RNF-005; apresentação, Conta e Privacidade).

### Problema ou Necessidade
O dono do produto não tem como acompanhar se o site está sendo usado (quantos estudantes, quantos voltam, quantos simulados terminam), onde os estudantes vão pior, nem se alguma questão tem o gabarito errado. Hoje cada resposta exigiria uma consulta manual ao banco de produção, e os números de logins e de usuários ativos simplesmente não existem.

### Situação Desejada (TO-BE)
- Uma página `/gestao`, só para o administrador, com quatro abas e um filtro de período (7, 30 ou 90 dias, ou tudo).
- Contadores **anônimos** por dia (horário de Brasília) para logins, usuários ativos no dia, contas excluídas e simulados concluídos, com acertos, tempo e "finalizado por tempo" por modo, e contagem das marcações por questão (A–E e em branco), sem guardar quem respondeu. Nada disso identifica o estudante, e a promessa de privacidade continua valendo.
- Os reportes pendentes aparecem com a questão ao lado e são marcados como resolvidos pela web; o comando da CLI continua existindo.
- A lista de estudantes (nome, e-mail, cadastro, último acesso, simulados no histórico e carreira-alvo) ajuda no suporte, por exemplo num pedido de exclusão. A Privacidade passa a dizer que o responsável pelo site vê essa lista.

**Decisões do usuário (06/10/2026, na conversa de planejamento e na retomada):**
- **D1 · Escopo:** Uso e crescimento, Qualidade do conteúdo e Aprendizado agregado. Sem exportação em CSV.
- **D2 · Coleta:** só contadores anônimos por dia. Sem registro da atividade de cada estudante (portanto sem retenção por coorte).
- **D3 · Estudantes:** a área mostra a lista nominal das contas.
- **D4 · Decisões técnicas confirmadas (D1–D6 do plano):**
  - **T1 · Administrador:** identificado pelo `sub` da conta Google numa variável `ADMIN_GOOGLE_SUBS` (lista separada por vírgula), não pelo e-mail: o login não exige `email_verified` (`services/google.py`), e o e-mail não é identidade segura. Sem a variável, a área não existe. Um comando novo, `python -m ingestao contas --email X`, mostra o `sub` da conta.
  - **T2 · 404 para quem não é administrador**, inclusive sem sessão: a área não se revela. A página `/gestao` mostra "Página não encontrada".
  - **T3 · Dia no horário de Brasília** (UTC−3 fixo; o Brasil não tem horário de verão desde 2019) para os contadores novos e para o contador de simulados gerados, que hoje vira o dia às 21h (UTC).
  - **T4 · Concluídos e marcações contados na chegada do histórico ao servidor**, só para as entradas realmente inseridas (reenvio não conta de novo). A migration faz o backfill do histórico que já está no banco.
  - **T5 · Acerto por questão calculado na leitura**, com o gabarito atual: guardam-se as marcações por letra, e corrigir um gabarito corrige a estatística.
  - **T6 · Gráficos sem biblioteca nova**, desenhados com os tokens "Papel & Caneta" e com os valores em tabela acessível.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Administrador | Não existe | `ADMIN_GOOGLE_SUBS` (Railway) → `Settings.admin_google_subs`; `UsuarioPublico.admin` em `GET /api/sessao`; dependência `exigir_admin` (404 `nao_encontrado` para quem não é admin) |
| 2 | Contadores | Só `estatisticas_geracao` (dia UTC) | + `estatisticas_diarias (dia, metrica, total)`: `login`, `ativo`, `conta_excluida`, `concluido.<modo>`, `por_tempo.<modo>`, `tempo_ms.<modo>`, `questoes.<modo>`, `acertos.<modo>`, `prova_ano.<codigo>`; + `estatisticas_questoes (questao_id, marcadas_a … marcadas_e, em_branco)`; tudo no dia de Brasília, inclusive a geração |
| 3 | Último acesso | `usuarios.ultimo_acesso_em` muda só no login | Muda também no primeiro pedido do dia de Brasília (no máximo uma escrita por usuário por dia), e esse pedido conta `ativo` |
| 4 | Histórico | `gravar` insere e corta em 50 | + para as entradas inseridas, as métricas do modo, a prova da Prova de um ano e as marcações de cada questão (não conta reenvio nem entrada recusada) |
| 5 | API nova | — | `GET /api/gestao/uso`, `/aprendizado`, `/qualidade`, `/reportes`, `/estudantes`; `POST /api/gestao/reportes/resolver` (só admin, `no-store`) |
| 6 | CLI | `reportes listar/resolver` | + `contas --email X` (lista `sub`, e-mail e cadastro das contas com aquele e-mail) |
| 7 | Página nova | — | `/gestao` (Uso), `/gestao/aprendizado`, `/gestao/qualidade`, `/gestao/estudantes`, dentro do `RequerConta` e do `RequerAdmin`; link "Gestão" no cabeçalho e no menu do celular só para o admin |
| 8 | Gráficos | — | `GraficoColunas` (colunas em HTML/CSS próprio, tokens, tabela com os números) |
| 9 | Privacidade | Lista o que é guardado | + data de cadastro e último acesso; o responsável pelo site vê a lista de contas para suporte; os números de uso (logins, acessos, respostas) são contados por dia sem identificar ninguém |

### 4.2 O que NÃO muda

- Curadoria das provas, das notas de corte e da taxonomia: continua pela CLI e por branches de conteúdo (ADR-002, ADR-008). A área só lê o banco e resolve reportes.
- Geração, resolução, correção, resultado, histórico e "Meu desempenho" do estudante: nenhum contrato muda. `POST /api/historico` responde igual; os contadores são efeito colateral.
- O que a conta guarda sobre o estudante: os contadores novos não têm `usuario_id` nem nada que identifique a pessoa. Excluir a conta continua apagando tudo dela (as contagens anônimas ficam).
- `ingestao reportes listar/resolver` continua existindo; os dois usam o mesmo serviço.
- Login, sessão de 90 dias, cookies, CSRF por `Origin`, limite de 50 simulados por conta.
- Nenhuma dependência nova (backend nem frontend).
- O estudante comum não vê nada novo, exceto o parágrafo na Privacidade.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, Visão Geral, Métricas (§2), Persona 2, módulo novo "Gestão" (RF-030 a RF-034), RF-007, RNF-004, RNF-005, US-022 a US-024, RN-020 a RN-022, Fora de Escopo, Glossário, Roadmap | v7.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura de pastas, Modelagem (`estatisticas_diarias`, `estatisticas_questoes`, `estatisticas_geracao` no dia de Brasília, `ultimo_acesso_em`), padrões da API (rotas de gestão), §9.3 (`ADMIN_GOOGLE_SUBS`), ADR-016 | v1.13 |
| `/docs/03-SPEC.md` | Sim | Índice (spec 09), contratos `/api/gestao/*`, `UsuarioPublico.admin`, erro `nao_encontrado`, migration 006, changelog | v1.13 |
| `/docs/specs/09-gestao.md` | Sim (novo) | Acesso, contadores, API, telas, casos de borda, testes | Criar v1.0 |
| `/docs/specs/05-reportes.md` | Sim | Resolução também pela área de gestão | Nota apontando para a spec 09 |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | `UsuarioPublico.admin`, último acesso diário, contagem no `gravar`, texto da Privacidade | Atualizar |
| `/docs/specs/03-resolucao.md` | Sim | Rotas (`/gestao/*`), cabeçalho e menu do celular | Atualizar |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-013 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Variável `ADMIN_GOOGLE_SUBS` e como achar o `sub`, migration 006, rollback | Atualizar |
| `CLAUDE.md` | Sim | Change Requests, Comandos (`ingestao contas`), Lembretes (`ADMIN_GOOGLE_SUBS`, rotas de gestão), Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `backend/app/config.py` | `admin_google_subs: frozenset[str]` de `ADMIN_GOOGLE_SUBS` |
| Modificar | `backend/app/models.py` + criar `backend/alembic/versions/006_estatisticas_gestao.py` | `EstatisticaDiaria`, `EstatisticaQuestao`; migration com backfill a partir de `simulados_concluidos` |
| Modificar | `backend/app/services/estatisticas.py` | `dia_local`, `inicio_do_dia`, `incrementar` (upsert em savepoint), `registrar_atividade`, `registrar_conclusoes`; `registrar_geracao` no dia de Brasília |
| Modificar | `backend/app/services/contas.py` | `login` e `ativo` no `entrar`; `conta_excluida` no `excluir_conta` |
| Modificar | `backend/app/services/historico.py` | `RETURNING` dos ids inseridos e `registrar_conclusoes` |
| Modificar | `backend/app/dependencias.py` | `registrar_atividade` no `obter_usuario`; `eh_admin`, `exigir_admin` |
| Criar | `backend/app/services/gestao.py`, `backend/app/routers/gestao.py` | Consultas agregadas e rotas `/api/gestao/*` |
| Modificar | `backend/app/schemas.py`, `backend/app/routers/conta.py`, `backend/app/main.py` | Schemas da gestão; `UsuarioPublico.admin`; registro do router |
| Modificar | `backend/ingestao/cli.py` | Comando `contas --email` |
| Criar | `backend/tests/test_estatisticas.py`, `test_gestao_acesso.py`, `test_gestao_uso.py`, `test_gestao_aprendizado.py`, `test_gestao_qualidade.py`, `test_gestao_estudantes.py` (inclui o comando `contas`) | Testes |
| Modificar | `backend/tests/test_migrations.py`, `test_config.py`, `test_auth.py`, `conftest.py` (`client_admin`) | Migration 006, variável nova, `admin` na sessão |
| Modificar | `frontend/src/types.ts`, `services/api.ts` | Tipos e chamadas da gestão; `Usuario.admin` |
| Criar | `frontend/src/hooks/useGestao.ts` | Consultas e a mutação de resolver reportes |
| Criar | `frontend/src/components/RequerAdmin.tsx`, `components/GraficoColunas.tsx` | Porteiro do admin e gráfico de colunas |
| Criar | `frontend/src/pages/gestao/*` (+ `pages/gestao.test.tsx`, `components/GraficoColunas.test.tsx`) | `GestaoLayout`, `UsoPage`, `AprendizadoPage`, `QualidadePage`, `EstudantesPage`, `periodo.ts`, `componentes.tsx` |
| Modificar | `frontend/src/App.tsx`, `components/Layout.tsx`, `components/MenuCelular.tsx`, `components/questao/QuestaoView.tsx` (`reportavel`), `pages/PrivacidadePage.tsx` | Rotas, links, questão sem "Reportar problema" na gestão e texto da Privacidade |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| Criar tabela | `estatisticas_diarias (dia date, metrica varchar(40), total bigint)`, PK `(dia, metrica)` | Sim (`006_estatisticas_gestao`) |
| Criar tabela | `estatisticas_questoes (questao_id varchar(12) PK, marcadas_a … marcadas_e int, em_branco int)`, sem FK (como `reportes`, ADR-006) | Sim (`006_estatisticas_gestao`) |
| Backfill | Métricas dos simulados concluídos já guardados (dia de `recebido_em` em Brasília) e marcações das questões | Sim (na mesma migration, em Python, portável) |

**Migration:**
```sql
CREATE TABLE estatisticas_diarias (dia DATE, metrica VARCHAR(40), total BIGINT NOT NULL, PRIMARY KEY (dia, metrica));
CREATE TABLE estatisticas_questoes (questao_id VARCHAR(12) PRIMARY KEY, marcadas_a INTEGER NOT NULL DEFAULT 0, ...,
                                    marcadas_e INTEGER NOT NULL DEFAULT 0, em_branco INTEGER NOT NULL DEFAULT 0);
-- + backfill a partir de simulados_concluidos (Python, mesma regra de services/estatisticas.registrar_conclusoes)
```
O downgrade apaga as duas tabelas: são só agregados, nada de usuário se perde.

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação inicial: este CR, a spec 09 e as emendas ao PRD (v7.0), à Arquitetura (ADR-016) e ao índice da spec | — | Docs commitados na branch |
| CR-T-02 | Variável `ADMIN_GOOGLE_SUBS`, migration 006 (tabelas + backfill), models, contadores (`estatisticas.py`) e pontos de coleta (login, atividade, exclusão, histórico, geração no dia de Brasília) | CR-T-01 | BT-047 (006), BT-097 a BT-103 e BT-111 verdes; upgrade/downgrade testados |
| CR-T-03 | Acesso de administrador (`exigir_admin`, `admin` na sessão) e API `/api/gestao/*`; comando `contas` | CR-T-02 | BT-104 a BT-110 verdes |
| CR-T-04 | Frontend: tipos, cliente, `RequerAdmin`, rotas, links, `GraficoColunas` e as quatro abas; Privacidade | CR-T-03 | UT-069 a UT-076 verdes |
| CR-T-05 | Revisão OWASP, validação runtime (HTTP real e Playwright com o provedor falso — FT-026), `/code-review`, docs finais (specs 03/05/07, Plano, Deploy Guide, CLAUDE.md, INDEX), merge + push + CI verde | CR-T-01 a CR-T-04 | Todos os critérios da §8 marcados |
| CR-T-06 | **(produção)** Descobrir o `sub` do administrador (`ingestao contas` via `railway ssh`), definir `ADMIN_GOOGLE_SUBS` na Railway e conferir a área com o login real | CR-T-05 | Usuário confere a área em produção |

---

## 8. Critérios de Aceite

- [x] Com `ADMIN_GOOGLE_SUBS` contendo o `sub` da conta, o administrador vê o link "Gestão" e as quatro abas; qualquer outra conta, quem não entrou e qualquer conta sem a variável recebem 404 `nao_encontrado` em todas as rotas `/api/gestao/*`, e a página `/gestao` mostra "Página não encontrada" — BT-104 (inclusive query inválida e JSON malformado de não admin), UT-069, UT-070; HTTP real e Playwright abaixo
- [x] Logins, usuários ativos (uma vez por usuário por dia de Brasília), contas excluídas e simulados concluídos são contados por dia sem `usuario_id`; reenviar o mesmo simulado não conta duas vezes; o contador de gerados passa a usar o dia de Brasília — BT-097 a BT-103 (duas abas no mesmo instante contam um ativo; exclusão repetida conta uma)
- [x] A migration `006` cria as tabelas e importa o histórico já guardado (concluídos por modo e marcações das questões); `upgrade head` + `downgrade -1` testados (SQLite local e Postgres no CI) — BT-047 (006: o backfill dá o mesmo que o serviço, no dia de Brasília de `recebido_em`) e, pelo Alembic, `005 → 006 → 005 → 006` num SQLite novo em 06/10; Postgres no CI da branch (ver abaixo)
- [x] Aba Uso: cartões (estudantes, novos, ativos hoje, em 7 e em 30 dias, logins, gerados, concluídos, contas excluídas), séries por dia até 31 dias e por semana acima, taxa de conclusão por modo, distribuição de simulados por estudante e provas mais feitas na Prova de um ano, conforme o período — BT-105, UT-071, UT-075; Playwright abaixo
- [x] Aba Aprendizado: acerto médio, % finalizados por tempo e tempo médio por questão por modo no período; acerto por disciplina e assunto calculado com o gabarito atual, sem anuladas; carreiras-alvo mais escolhidas com os cortes e quantos estudantes atingiriam cada um no último simulado de Prova completa — BT-106 (trocar o gabarito muda o acerto; escala direta e convertida), UT-072
- [x] Aba Qualidade: saúde da base, reportes pendentes com a questão e "marcar como resolvidos" (com `Origin`), e questões suspeitas pelos limiares da RN-022 com a distribuição A–E e o gabarito — BT-107, BT-108, UT-073; Playwright abaixo
- [x] Aba Estudantes: lista paginada (50 por página) com busca por nome ou e-mail e ordem por cadastro ou último acesso; nenhuma ação sobre as contas — BT-109 (`%` e `_` literais), UT-074
- [x] A Privacidade diz que o responsável pelo site vê a lista de contas e que os números de uso são contados sem identificar ninguém — UT-076
- [x] Testes existentes continuam passando (regressão) — backend 519 testes (eram 466), frontend 317 (eram 297)
- [x] Novos testes cobrem a mudança — BT-097 a BT-111, BT-047 (006), UT-069 a UT-076 e os da revisão de código
- [x] Fluxo afetado exercitado em runtime antes do merge — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: rotas novas com dado pessoal, só para o administrador — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — PRD v7.0, Arquitetura v1.13 (ADR-016), 03-SPEC v1.13, spec 09 nova, specs 03, 05 e 07, Plano, Deploy Guide v1.8, CLAUDE.md, INDEX.md
- [x] CI verde na branch e em `master`; em produção, `ADMIN_GOOGLE_SUBS` configurada e a área conferida pelo usuário com o login real — branch verde (run 37520656472), `master` verde no merge `f867359` (run 37520985605). Em produção (06/10): `Running upgrade 005 -> 006` no log da Railway e as 9 provas sincronizadas; sem cookie, as 6 rotas `/api/gestao/*` → 404 (inclusive o `POST` com JSON malformado); o `sub` da conta do dono do produto saiu do `ingestao contas` rodado dentro do container (o Postgres não tem URL pública) e foi para `ADMIN_GOOGLE_SUBS`; redeploy `SUCCESS`; o usuário conferiu a área com o login real ("A área ficou correta")

**Validação runtime (06/10/2026, build servido pelo FastAPI na porta 8001 com o provedor Google falso, `ADMIN_GOOGLE_SUBS` com o `sub` falso do administrador e um SQLite novo com as 9 provas publicadas; 30 estudantes, históricos e reportes semeados pelos próprios serviços, o que exercitou os contadores do login e da chegada do histórico):**
- HTTP: sem sessão e com a conta comum (Beto), as 6 rotas → 404 `nao_encontrado`, inclusive `?periodo=x`; a sessão do Beto traz `admin: false` e a do administrador, `true`. Administrador: `GET /api/gestao/uso` → 200 com `Cache-Control: no-store`, 30 pontos por dia em 30 dias e 14 semanas em 90, `periodo=15` → 422; `/aprendizado` com os modos, 3 disciplinas e a carreira-alvo semeada (10 estudantes, 5 com Prova completa, "atingiriam" AC 1 · EP 4 · PPI 5); `/qualidade` com 9 provas e 786 questões válidas, e a questão 2025-005 suspeita (11,1% em 45 respostas, os dois motivos); reportes pendentes com a questão (e `null` para `2019-001`); resolver com `Origin` de outro site → 403, `ids: []` → 422, `[1, 999]` → resolvidos `[1]`, inexistentes `[999]`; estudantes com a busca "aluno1" (11) e a etiqueta de admin.
- Playwright (FT-026), 1280 px: login falso → `/gestao` com os oito cartões, os cinco gráficos, a tabela por modo, a distribuição e a prova mais feita; período de 90 dias → "por semana", 14 colunas, e o período segue na aba Aprendizado; Aprendizado com os assuntos do pior para o melhor ("Obras de leitura obrigatória" com 11,1%) e a carreira-alvo; Qualidade → "Ver questão" abre a questão com o texto-base e a alternativa correta marcada, sem "Reportar problema"; marcar o reporte #2 → "1 reporte marcado como resolvido.", resumo "1 pendente · 3 resolvidos" e a lista recarregada; Estudantes com busca e ordem pela URL. A 360 px, documento com 345 px nas quatro abas (a primeira passada achou a última aba cortada, com barra de rolagem: corrigido em `5573d28`); menu do celular com "Gestão". Conta comum (Beto) em `/gestao` → "Página não encontrada", sem o link e sem pedir a API. Console sem erros nem avisos (o único erro registrado foi o 404 do `fetch` de conferência feito à mão).

**Revisão de código (`/code-review high`, diff da branch) — 10 achados, 7 corrigidos e 3 justificados (`f9f834b`):**
1. Corrigido: JSON malformado no `POST /reportes/resolver` dava 422 a quem não é admin (o FastAPI decodifica o corpo antes das dependências) e revelava a rota. O corpo passou a ser lido numa dependência depois do `exigir_admin` (dois testes novos).
2. Justificado: uma conta pode inflar os agregados com históricos forjados de ids novos. É o risco 4 da §9: exige conta Google e rate limit, não toca os dados de ninguém, o acerto por questão usa o gabarito do servidor e a questão suspeita é só um sinal para o curador conferir (RN-022). Limitar por conta exigiria registrar quem concluiu, o que a D2 descarta.
3. Corrigido: a prova da Prova de um ano ganhava rótulo a partir do código mesmo fora da base (ou com código forjado); agora só a que está na base tem rótulo, e as demais mostram o código (teste ajustado).
4. Corrigido: duas exclusões simultâneas da mesma conta contavam duas; agora conta as linhas que o `DELETE` apagou (teste novo).
5. Corrigido: a "média por dia" dos ativos por semana fazia a média das semanas sem pesar as parciais; agora vem do servidor (`ativos_media_dia`, soma ÷ dias do período).
6. Corrigido: a consulta das marcações carregava a questão inteira (enunciado, alternativas); agora só as colunas usadas.
7. Justificado: as carreiras-alvo leem o histórico de quem as escolheu, 10 consultas por pedido. É o risco 5 da §9, aceitável até alguns milhares de contas; se crescer, guardar a última nota é outro CR.
8. Corrigido: `como_utc` duplicava `contas._utc`; agora há um só.
9. Corrigido: a regra do administrador estava repetida na lista de estudantes; agora as duas usam `Settings.eh_admin`.
10. Justificado (falso positivo): a questão aberta na Qualidade não quebra a ordem dos títulos, porque sem `posicao` o `QuestaoView` não renderiza título nenhum.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum. `ADMIN_GOOGLE_SUBS` não é segredo e fica só na Railway |
| Validação de entrada | Pydantic e FastAPI: `periodo`, `status` e `ordem` por `Literal`; `pagina` 1–10000; `busca` até 100 caracteres; `ids` 1–100 inteiros ≥ 1, sem repetição, `extra="forbid"` |
| Autorização (ownership) | Todas as rotas `/api/gestao/*` passam pelo `exigir_admin` no router: 404 para quem não é admin, sem sessão ou sem a variável, antes de validar query e corpo (inclusive JSON malformado). Identidade pelo `sub`, nunca pelo e-mail (sem `email_verified`). O frontend só esconde o link; o teste de acesso cobre as 6 rotas |
| Tokens / cookies | Nenhuma mudança na sessão; o administrador usa o mesmo cookie `HttpOnly` |
| SQL | Só ORM e Core parametrizados; a busca usa `ilike` com `%`, `_` e `\` escapados; a migration usa `sa.select`/`bulk_insert` |
| CSRF / CORS | `verificar_origem` no `POST` (403 com Origin de fora); CORS inalterado (só em desenvolvimento) |
| Cabeçalhos | `Cache-Control: no-store` em todas as rotas de gestão (lista de contas é dado pessoal); demais cabeçalhos do middleware inalterados |
| XSS | Nomes, e-mails e descrições de reporte renderizados como texto pelo React |
| Rate limit | 60/min por IP nas leituras, 30/min no `POST` |
| Dado pessoal (LGPD) | Contadores sem `usuario_id`; a lista de contas é só para o administrador; a Privacidade descreve os dois. Nenhum dado novo sobre o estudante é guardado (o último acesso já existia) |
| Dependências | Nenhuma nova: `pip audit` e `npm audit` não se aplicam |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Alguém além do administrador ver a lista de estudantes (nome e e-mail de menores) | Baixa | Alto | Identidade pelo `sub` (não pelo e-mail sem verificação); 404 em todas as rotas para qualquer outro; checagem no servidor em cada rota (o frontend só esconde o link); `no-store`; testes de acesso em todas as rotas |
| 2 | Uma escrita por usuário por dia no `obter_usuario` deixa os pedidos mais lentos ou falha | Baixa | Baixo | Checagem em memória antes (a maioria dos pedidos não escreve); `UPDATE` condicional atômico; falha vira log e nunca derruba o pedido |
| 3 | Falha num contador derruba o login ou a sincronização do histórico | Baixa | Médio | Contadores em savepoint: o erro é registrado no log e a operação principal segue (mesma regra do `registrar_geracao`) |
| 4 | Números manipulados por uma conta que envia histórico forjado | Baixa | Baixo | Só com conta, com rate limit; afeta só agregados; tempo limitado a 24 h por simulado; o acerto por questão usa o gabarito do servidor |
| 5 | Leitura pesada na aba Aprendizado (histórico de quem tem carreira-alvo) quando a base crescer | Média (longo prazo) | Baixo | Só para as 10 carreiras mais escolhidas; aceitável até alguns milhares de contas; se crescer, guardar a última nota (novo CR) |
| 6 | Indicadores começam incompletos: logins e ativos só a partir do deploy; "ativos em 30 dias" subestimado no primeiro mês (antes, o último acesso só mudava no login) | Alta | Baixo | Texto na própria aba; backfill dos concluídos e das marcações |
| 7 | Dias anteriores do contador de gerados ficam em UTC e os novos em Brasília | Alta | Baixo | Diferença de 3 h só na virada; registrado no PRD e na Arquitetura |
| 8 | Transparência com o estudante (LGPD) | Média | Médio | A Privacidade descreve a lista de contas vista pelo responsável e os contadores anônimos |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-013` → `git revert -m 1 <merge do CR-013>` → merge em `master` → push.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard. O código anterior ignora as duas tabelas novas.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-013-area-gestao`.

### 10.2 Rollback de Migration

- **Migration afetada:** `006_estatisticas_gestao.py`
- **Comando de downgrade:** `alembic downgrade 005`
- **Downgrade testado?** [x] Sim / [ ] Nao — SQLite local (Alembic `006 → 005 → 006` e BT-047) e Postgres no CI (runs 37520656472 e 37520985605)
- **Downgrade é destrutivo?** [x] Sim / [ ] Nao — apaga só os contadores novos e as marcações por questão; contas, sessões, históricos e reportes ficam

Sem o downgrade, o código anterior também funciona: ele não lê as tabelas novas.

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [x] Sim (só com o downgrade) / [ ] Nao
- **Detalhamento:** com `downgrade`, os logins e acessos contados desde o deploy se perdem; concluídos e marcações voltam pelo backfill num novo upgrade (limitados ao histórico ainda guardado). Sem `downgrade`, nada é perdido.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao — a migration só cria tabelas novas e lê `simulados_concluidos`. O banco tem dados de usuário (CR-005): backup obrigatório antes de qualquer `downgrade` em produção
- **Procedimento de backup:** Deploy Guide §6

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** `ADMIN_GOOGLE_SUBS`
- **Ação de rollback:** remover `ADMIN_GOOGLE_SUBS` da Railway (a área deixa de existir sem mudar o código)

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `alembic current` mostra a revisão esperada (se a migration foi revertida)
- [ ] `/api/gestao/uso` responde 404
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-06 | Rafael Peixoto (com Claude) | CR criado a partir do plano de 06/10 (feito no Claude Code, antes do CR), com as decisões D1–D3 do usuário e as decisões técnicas T1–T6 confirmadas por ele |
| 2026-10-06 | Rafael Peixoto (com Claude) | Implementação (CR-T-02 a CR-T-04), validação runtime (HTTP real e Playwright; ajuste das abas a 360 px), revisão de código (7 corrigidos, 3 justificados) e de segurança, documentos atualizados. Na implementação, `contas` passou a exigir `--database-url` (ADR-008), as colunas do gráfico ficaram em HTML/CSS e o cartão ganhou `ativos_media_dia` |
| 2026-10-06 | Rafael Peixoto (com Claude) | CI da branch verde (run 37520656472); merge `f867359` em `master`, CI verde (run 37520985605) e deploy com a migration `006`. `ADMIN_GOOGLE_SUBS` definida com o `sub` da conta do dono do produto (descoberto com o `ingestao contas` via `railway ssh`: o Postgres não tem URL pública, e o Deploy Guide passou a usar o container) |
| 2026-10-06 | Rafael Peixoto (com Claude) | Conferência em produção pelo usuário com o login real — validação ✅, status Concluído |
