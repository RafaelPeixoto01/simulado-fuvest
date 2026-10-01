# Change Request — CR-006: Login obrigatório para usar o site

**Versão:** 1.0  
**Data:** 2026-10-01  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

O login com Google, opcional desde o CR-005, passa a ser **obrigatório para usar o site**. Sem login, o visitante vê só uma página de apresentação, com "Entrar com Google", e a página de Privacidade. A exigência vale na interface e na API: sem sessão, o servidor recusa catálogo, geração, questões, correção e reportes. Em produção, se o login não estiver configurado, o site fica indisponível em vez de abrir sem conta. Em desenvolvimento, sem configuração, ele continua aberto.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Mudança de Regra de Negócio (acesso ao site) |
| Origem           | Evolução do produto (decisão do dono do produto, 01/10/2026) |
| Urgência         | Próxima sprint |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O site é público e funciona por inteiro sem conta (PRD §1, RF-024 "opcionalmente", RNF-005). Quem entra com o Google ganha o histórico sincronizado (CR-005).
- Nenhum endpoint de conteúdo lê a sessão (ADR-004): catálogo, geração, questões, correção e reportes respondem a qualquer um.
- Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, o login some e o site segue aberto.

### Problema ou Necessidade
O dono do produto decidiu que o uso do site exige login com Google.

### Situação Desejada (TO-BE)
- **Sem login:** o início vira uma **página de apresentação** (o que é o site, os quatro modos e "Entrar com Google"), e a `/privacidade` continua aberta (é o link de política de privacidade da tela de consentimento do Google). Qualquer outra página leva à apresentação, e o login volta para a página pedida.
- **API:** sem sessão, `GET /api/catalogo`, `POST /api/simulados`, `GET /api/questoes`, `POST /api/correcoes` e `POST /api/reportes` respondem 401 `nao_autenticado`. Continuam abertos `/api/health` (healthcheck da Railway), `/figuras/...` (conteúdo público dos PDFs da FUVEST), o login e `/api/sessao`.
- **Login não configurado:** em produção, a API de conteúdo responde 503 `site_indisponivel` e o site mostra "temporariamente indisponível". Fora de produção (desenvolvimento, testes, CI), o site fica aberto, como hoje.

**Decisões do usuário (01/10/2026):**
- **D1 · O que fica aberto:** a apresentação e a Privacidade. Todo o resto exige login.
- **D2 · Onde exigir:** na interface e na API. O health e as figuras continuam públicos.
- **D3 · Login não configurado:** fecha em produção e abre em desenvolvimento.

**Consequências que seguem das decisões (Claude):**
- O catálogo fica protegido (D2), então a apresentação não mostra números da base (provas, questões). Ela descreve o site e os modos com texto fixo; a lista de provas aparece no início depois do login.
- Na interface, se a verificação da sessão falhar por rede, a página abre mesmo assim, porque a API continua protegida. Um estudante no meio de uma prova de 5 h não pode ser barrado por uma falha momentânea.
- Uma resposta 401 `nao_autenticado` de qualquer chamada recarrega a sessão. Se ela acabou, a página volta para a apresentação e o login retorna para ela. O simulado em andamento continua salvo no navegador.
- O modo anônimo do histórico (CR-005) só segue valendo em desenvolvimento. Ao entrar, os simulados feitos neste navegador continuam indo para a conta (D1 do CR-005), inclusive os de quem usava o site antes desta mudança.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Acesso ao site | Público | Login com Google obrigatório (RN-017) |
| 2 | `GET /api/sessao` | `login_disponivel`, `usuario` | + `acesso`: `conta` (login obrigatório), `livre` (sem login configurado, fora de produção) ou `indisponivel` (sem login configurado, em produção) |
| 3 | API de conteúdo | Sem autenticação | Dependência `exigir_acesso`: 401 sem sessão (`conta`), 503 `site_indisponivel` (`indisponivel`), aberta (`livre`) |
| 4 | Início (`/`) | Modos e catálogo para todos | Sem login: página de apresentação; com login: o início de hoje |
| 5 | Demais rotas | Abertas | `RequerConta`: sem login, vão para a apresentação com `?voltar=<rota>` |
| 6 | Cabeçalho | Desempenho, Histórico, Entrar | Sem login: só "Entrar" |
| 7 | Sessão vencida no meio do uso | Só o histórico notava (CR-005) | Qualquer 401 recarrega a sessão e leva à apresentação |
| 8 | Página Conta, sem login | "Entre para guardar o histórico" | "Entre para usar o site" |
| 9 | Privacidade | Seção "Sem conta" | Diz que o uso exige conta; sem conta, só apresentação e privacidade |
| 10 | Smoke test do Docker (CI) | — | Confere que, em produção sem login configurado, `/api/catalogo` responde 503 |

### 4.2 O que NÃO muda

- O fluxo de login, a sessão, o histórico da conta, sair e excluir conta (CR-005, ADR-010, ADR-011).
- As regras dos simulados, a correção e o painel. O simulado em andamento continua só no navegador.
- Os reportes continuam sem dado pessoal: o servidor exige a sessão, mas não grava quem reportou.
- `/figuras` e `/api/health` continuam públicos; CSP e demais headers inalterados.
- Nenhuma tabela, migration ou variável de ambiente nova.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, Visão geral, Persona 1, RF-008, RF-024, RN-012, RN-016, RN-017 (nova), RNF-004, RNF-005, US-015 (nova), Riscos, Glossário | v4.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Arquitetura geral, padrões da API e do frontend, ADR-004 (status), ADR-012 (nova) | v1.6 |
| `/docs/03-SPEC.md` | Sim | Contratos (coluna de acesso), erros de domínio, changelog | v1.6 |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | `SessaoResponse.acesso`, `exigir_acesso`, `RequerConta`, apresentação, casos de borda e testes do CR-006 | v1.2 |
| `/docs/specs/02-catalogo-e-geracao.md`, `03-resolucao.md`, `04-correcao-resultado.md`, `05-reportes.md` | Sim | Autenticação dos endpoints; rotas, início e cabeçalho | Nota de acesso (CR-006) |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-006 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Variáveis (sem login, produção fecha), smoke test, verificação pós-deploy, rollback | v1.3 |
| `CLAUDE.md` | Sim | Change Requests, Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `backend/app/dependencias.py` | `modo_de_acesso`, `exigir_acesso` |
| Modificar | `backend/app/schemas.py`, `routers/conta.py` | `SessaoResponse.acesso` |
| Modificar | `backend/app/routers/catalogo.py`, `simulados.py`, `questoes.py`, `correcoes.py`, `reportes.py` | `dependencies=[Depends(exigir_acesso)]` no router (+ `verificar_origem` nos POSTs) |
| Criar | `backend/tests/test_acesso.py` | BT-070 a BT-074 |
| Modificar | `.github/workflows/ci.yml` | Smoke test: `/api/catalogo` → 503 em produção sem login |
| Modificar | `frontend/src/types.ts`, `test/apiFalsa.ts` | `Sessao.acesso`; sessão falsa padrão com `acesso: 'livre'` |
| Criar | `frontend/src/components/RequerConta.tsx` | Porteiro das rotas |
| Criar | `frontend/src/pages/ApresentacaoPage.tsx` | Página de apresentação |
| Modificar | `frontend/src/components/Estados.tsx` | `SiteIndisponivel` |
| Modificar | `frontend/src/App.tsx` | Rotas protegidas por `RequerConta` |
| Modificar | `frontend/src/components/Layout.tsx` | Cabeçalho sem login |
| Modificar | `frontend/src/services/api.ts`, `queryClient.ts`, `test/renderizar.tsx` | `definirAoErroDeAcesso` (401/503 em qualquer chamada) + `criarQueryClient`, que recarrega a sessão |
| Modificar | `frontend/src/hooks/useSessao.ts` | `retryOnMount: false` (sem ciclo de remontagem com erro de rede) |
| Remover | `frontend/src/components/ConviteConta.tsx` | Convite para entrar no Histórico e no painel: sem login, essas páginas nem abrem |
| Modificar | `frontend/src/pages/HomePage.tsx`, `ContaPage.tsx`, `PrivacidadePage.tsx` | Textos |
| Criar | `frontend/src/pages/acesso.test.tsx` | UT-040 a UT-042 |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma mudança | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, PRD v4.0, Arquitetura v1.6 (ADR-012), specs 07 e 02–05, índice, Plano, Deploy Guide | — | Docs revisados e commitados |
| CR-T-02 | Backend: `exigir_acesso`, `acesso` na sessão, routers de conteúdo; smoke test do CI | CR-T-01 | BT-070 a BT-074 verdes; testes existentes verdes |
| CR-T-03 | Frontend: `RequerConta`, apresentação, indisponível, cabeçalho, 401 global, textos | CR-T-02 | UT-040 a UT-042 verdes; testes existentes verdes |
| CR-T-04 | Validação runtime (FT-015), revisão OWASP, `/code-review` | CR-T-03 | Registrados na §8 |
| CR-T-05 | Docs finais, merge + push + CI verde; conferência em produção | CR-T-04 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] Sem login, só a apresentação (`/`) e a Privacidade abrem; qualquer outra rota leva à apresentação, e o login volta para a rota pedida — UT-040, UT-041; FT-015 (`/historico` → `/?voltar=%2Fhistorico` → login → `/historico`)
- [x] Com login, o site funciona como antes (início, modos, Treino, resultado, histórico, painel, conta) — BT-071; regressão (backend 323, frontend 206); FT-015 (início com os modos, Prova de 2025 finalizada, Treino)
- [x] Sem sessão, a API de conteúdo responde 401 `nao_autenticado`; health, figuras, login e sessão continuam abertos — BT-070, BT-074; HTTP real abaixo
- [x] Em produção sem login configurado, a API de conteúdo responde 503 `site_indisponivel` e o site mostra "temporariamente indisponível"; fora de produção, sem configuração, o site fica aberto — BT-072, BT-073, UT-040; smoke test do Docker no CI; FT-015 no modo produção sem login
- [x] Sessão que acaba no meio do uso leva à apresentação, e o simulado em andamento continua salvo — UT-042 (query, chamada direta do Treino e 503); FT-015 (cookie apagado no meio da Prova de 2025 e do Treino)
- [x] Sem login, o cabeçalho mostra só "Entrar" — UT-041; FT-015
- [x] Testes existentes continuam passando (regressão) — backend 323, frontend 206 (4 testes do Histórico passaram a esperar a sessão; 2 cenários do CR-005 que não existem mais saíram)
- [x] Novos testes cobrem a mudança — BT-070 a BT-075, UT-040 a UT-042
- [x] Fluxo afetado exercitado em runtime antes do merge — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: endpoints alterados e autenticação — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — PRD v4.0, Arquitetura v1.6, 03-SPEC v1.6, specs 02/03/04/05 e 07 v1.2, Plano, Deploy Guide v1.3, CLAUDE.md, INDEX.md
- [x] CI verde na branch e em `master`; produção conferida (sem cookie: 401 na API e apresentação no navegador; com login: uso normal) — branch verde; `master` verde no merge `ff38f46` (run 36920047332). Produção, sem cookie: `/api/sessao` → `acesso: "conta"`; catálogo, questões e simulados → 401; health (3 provas), figura e início do login abertos; no navegador, início com a apresentação e só "Entrar" no cabeçalho, `/desempenho` → `/?voltar=%2Fdesempenho`, Privacidade aberta, nenhum cookie, console limpo. Com login: o usuário entrou, fez um simulado curto e o viu no Histórico (01/10)

**Validação runtime (01/10/2026, build servido pelo FastAPI na porta 8001, SQLite local com 2023–2025, provedor Google falso — o resto é o código de produção):**
- HTTP (curl), modo `conta`: `/api/sessao` → `acesso: "conta"`; sem cookie, `GET /api/catalogo`, `GET /api/questoes`, `POST /api/correcoes` e `POST /api/reportes` → 401 `nao_autenticado`, e `POST /api/simulados` com corpo inválido também → 401 (antes do 422); `/api/health` e uma figura de 2025 → 200; com sessão, catálogo e questões → 200; depois da revisão, `POST /api/simulados` com `Origin` de outro site → 403 e com o do site → 200.
- HTTP, modo produção sem login: `/api/sessao` → `acesso: "indisponivel"`; `/api/catalogo` → 503 `site_indisponivel`; health → 200.
- Playwright (FT-015): sem cookie, `/historico` vai para `/?voltar=%2Fhistorico` com "Entre com a sua conta Google para continuar.", cabeçalho só com "Entrar" e nenhum cookie → "Entrar com Google" volta a `/historico` (cabeçalho "Desempenho, Histórico, Ana") → início com os modos e "O simulado em andamento fica salvo neste navegador." → Prova de 2025 com 2 respostas; o cookie de sessão é apagado e "Finalizar" leva a `/?voltar=%2Fsimulado` com o simulado ainda no navegador → login → `/simulado` com as 2 respostas → finalizado ("Você acertou 1 de 90 questões") → "Sair" → `/desempenho` leva à apresentação → apresentação a 360 e 320 px sem rolagem horizontal. Modo produção sem login: `/`, `/historico` e `/simulado` mostram "Site temporariamente indisponível"; `/privacidade` e `/conta` abrem. Depois da revisão: no Treino, cookie apagado e resposta → `/?voltar=%2Ftreino`. Console: só o registro do próprio navegador para as respostas 401 esperadas.

**Revisão de código (`/code-review high`, diff `master...HEAD`) — 10 achados: 9 corrigidos e 1 justificado (`b5fecc1`):**
1. Corrigido: o 401 só recarregava a sessão nas chamadas do React Query; o Treino (`api.corrigir`) e o reporte (`api.reportar`) chamam a API direto. O aviso passou para o `requisitar` (`definirAoErroDeAcesso` em `services/api.ts`), registrado pelo `criarQueryClient` (UT-042, Treino).
2. Corrigido: um 503 `site_indisponivel` com o site aberto não atualizava a sessão. O mesmo aviso cobre o 503 (UT-042).
3. Corrigido: com o site indisponível, quem estava conectado via "Desempenho" e "Histórico", que só levam ao aviso. O cabeçalho mostra esses links só com acesso ao conteúdo (UT-042).
4. **Justificado:** o `voltar` leva só o caminho, sem query string nem state. Nenhuma rota protegida usa query string, o state do router não sobrevive à ida ao Google (recarga de página inteira), e o servidor recusa `?` no `voltar` (`caminho_seguro`).
5. Corrigido: `exigir_acesso` consultava (e às vezes apagava) a sessão em todos os modos; agora só no modo `conta`.
6. Corrigido: os POSTs de conteúdo (simulados, correções, reportes) passaram a autenticar por cookie sem a verificação de `Origin` das rotas de conta; agora a têm (BT-075).
7. Corrigido: o `Literal` dos modos estava duplicado; `ModoAcesso` fica só em `schemas.py`.
8. Corrigido: checagem redundante em `exigir_acesso`.
9. Corrigido: o Deploy Guide mandava conferir `GET /api/catalogo` sem cookie, que agora dá 401.
10. Corrigido: `async` sobrando no `queryFn` do `useHistorico`.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum; nenhuma variável nova |
| Validação de entrada | Inalterada (Pydantic); a autenticação vem antes da validação do corpo (401 antes do 422), então pedidos sem sessão nem chegam a ser avaliados |
| Tokens / armazenamento | Inalterado (cookie `HttpOnly`, hash no banco — ADR-010) |
| Autorização | Todas as rotas de conteúdo exigem sessão por dependência de router (`exigir_acesso`), e não rota a rota, o que evita esquecer uma; produção sem login configurado falha fechada (503) |
| Ownership | Sem dado de usuário novo; os reportes continuam sem gravar quem reportou |
| CSRF | `SameSite=Lax` + `Origin` conferido também nos POSTs de conteúdo (BT-075) |
| SQL | Inalterado (ORM) |
| CORS / headers | Inalterados |
| Dependências | Nenhuma nova |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Todo estudante, em geral menor de idade, passa a entregar nome e e-mail para usar o site (LGPD art. 14, "melhor interesse" do adolescente) | Alta | Médio | Só o mínimo (D3 do CR-005); exclusão pelo próprio estudante; Privacidade atualizada dizendo que o uso exige conta e para quê |
| 2 | Menos uso: quem não quer ou não pode entrar com Google deixa de usar o site | Alta | Médio | Decisão do dono do produto; a apresentação explica o site antes do login. Reverter é desligar a exigência (rollback de código) |
| 3 | Variável do Google removida ou errada deixa o site fora do ar em produção (D3) | Baixa | Alto | Mensagem "temporariamente indisponível"; o log mostra o motivo (`PUBLIC_URL` sem https); o Deploy Guide diz como restaurar. Smoke test do CI confere o comportamento |
| 4 | Estudante no meio de uma prova é barrado por falha momentânea de rede ao verificar a sessão | Baixa | Alto | Erro de rede na sessão não bloqueia a página (a API segue protegida); o simulado em andamento fica no navegador |
| 5 | Sessão vencida no meio de uma prova | Baixa | Médio | 401 recarrega a sessão e leva ao login, que volta para `/simulado`; as respostas continuam salvas no navegador |
| 6 | Mecanismos de busca deixam de indexar o conteúdo | Alta | Baixo | A apresentação continua pública |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-006` → `git revert -m 1 <merge do CR-006>` → merge em `master` → push. O site volta a ser público com login opcional (CR-005).
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-006-login-obrigatorio`.

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — nenhuma migration
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade é destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** contas e históricos ficam como estão; o rollback só muda quem pode acessar.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma. Remover `GOOGLE_CLIENT_ID` **não** reabre o site depois deste CR: em produção, ele fica indisponível (D3).
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] Sem login, o início mostra os modos e a API de conteúdo responde
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-01 | Rafael Peixoto (com Claude) | CR criado com as decisões D1–D3 |
| 2026-10-01 | Rafael Peixoto (com Claude) | Implementação (CR-T-01 a CR-T-04): backend, frontend, validação runtime (FT-015), revisão de código (10 achados) e de segurança; achado durante os testes: ciclo de remontagem da sessão com erro de rede (corrigido com `retryOnMount: false`); CI da branch verde |
| 2026-10-01 | Rafael Peixoto (com Claude) | Merge `ff38f46`, CI de `master` verde; produção conferida sem login (Claude) e com login (usuário) — validação ✅, status Concluído |
