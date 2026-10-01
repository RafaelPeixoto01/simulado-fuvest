# Change Request — CR-006: Login obrigatório para usar o site

**Versão:** 1.0  
**Data:** 2026-10-01  
**Status:** Em Implementação  
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
| Modificar | `backend/app/routers/catalogo.py`, `simulados.py`, `questoes.py`, `correcoes.py`, `reportes.py` | `dependencies=[Depends(exigir_acesso)]` no router |
| Criar | `backend/tests/test_acesso.py` | BT-070 a BT-074 |
| Modificar | `.github/workflows/ci.yml` | Smoke test: `/api/catalogo` → 503 em produção sem login |
| Modificar | `frontend/src/types.ts`, `test/apiFalsa.ts` | `Sessao.acesso`; sessão falsa padrão com `acesso: 'livre'` |
| Criar | `frontend/src/components/RequerConta.tsx` | Porteiro das rotas |
| Criar | `frontend/src/pages/ApresentacaoPage.tsx` | Página de apresentação |
| Modificar | `frontend/src/components/Estados.tsx` | `SiteIndisponivel` |
| Modificar | `frontend/src/App.tsx` | Rotas protegidas por `RequerConta` |
| Modificar | `frontend/src/components/Layout.tsx` | Cabeçalho sem login |
| Modificar | `frontend/src/queryClient.ts`, `test/renderizar.tsx` | `criarQueryClient`: 401 em qualquer chamada recarrega a sessão |
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

- [ ] Sem login, só a apresentação (`/`) e a Privacidade abrem; qualquer outra rota leva à apresentação, e o login volta para a rota pedida
- [ ] Com login, o site funciona como antes (início, modos, Treino, resultado, histórico, painel, conta)
- [ ] Sem sessão, a API de conteúdo responde 401 `nao_autenticado`; health, figuras, login e sessão continuam abertos
- [ ] Em produção sem login configurado, a API de conteúdo responde 503 `site_indisponivel` e o site mostra "temporariamente indisponível"; fora de produção, sem configuração, o site fica aberto
- [ ] Sessão que acaba no meio do uso leva à apresentação, e o simulado em andamento continua salvo
- [ ] Sem login, o cabeçalho mostra só "Entrar"
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança — BT-070 a BT-074, UT-040 a UT-042
- [ ] Fluxo afetado exercitado em runtime antes do merge — FT-015 (provedor falso local, Playwright) e chamadas HTTP
- [ ] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados
- [ ] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: endpoints alterados e autenticação
- [ ] Documentos afetados foram atualizados
- [ ] CI verde na branch e em `master`; produção conferida (sem cookie: 401 na API e apresentação no navegador; com login: uso normal)

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
