# Change Request — CR-005: Contas com Google e histórico sincronizado (Fase 3B do roadmap)

**Versão:** 1.0  
**Data:** 2026-10-01  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Segunda parte da Fase 3 do roadmap do PRD ("Contas e estatísticas"). O estudante pode, **se quiser**, entrar com a conta Google. Com a conta, o **histórico dos simulados concluídos** passa a ficar também no servidor e aparece em qualquer dispositivo em que ele entrar. O painel "Meu desempenho" soma esse histórico sincronizado. Quem não entra continua usando o site como hoje, sem cadastro e sem nenhum dado pessoal no servidor. O simulado em andamento e o Treino continuam só no navegador.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (com mudança de arquitetura: primeiro estado do estudante no servidor) |
| Origem           | Evolução do produto (Roadmap Futuro do PRD, Fase 3B) |
| Urgência         | Próxima sprint |
| Complexidade     | Alta |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O servidor não guarda nada do estudante (ADR-004, RN-012): não há usuário, sessão nem resultado no banco. Os únicos dados escritos em runtime são os reportes anônimos e o contador de simulados gerados.
- O histórico (RF-020) e o painel "Meu desempenho" (RF-022) leem só o `localStorage`. Trocar de dispositivo ou limpar os dados do navegador perde tudo, e as páginas avisam isso.
- Não há segredos nem cookies: a CSP só permite scripts da própria origem.

### Problema ou Necessidade
O estudante estuda no celular e no computador (Persona 1), mas cada aparelho tem um histórico separado, e o painel de desempenho só vê uma parte dos simulados. Limpar os dados do navegador apaga meses de histórico.

### Situação Desejada (TO-BE)
- **Login opcional, só com Google** (decisão de 30/09). Ele aparece no cabeçalho ("Entrar") e na página `/conta`.
- **Servidor guarda só o histórico concluído** (decisão de 30/09): os mesmos `HistoricoEntry` de hoje, até os 50 mais recentes por conta.
- **Navegador com conta = espelho da conta.** Ao entrar, os simulados feitos neste navegador vão para a conta (D1). Simulado concluído com conta vai para o servidor na hora, e fica pendente se estiver sem rede. O histórico e o painel mostram o que está na conta.
- **Sair** envia o que estiver pendente e apaga o histórico deste navegador (D2), que continua na conta.
- **Excluir conta** (LGPD) apaga a conta e todo o histórico dela no servidor.
- Página **Privacidade** (`/privacidade`) com o que é guardado, para quê e como apagar. Ela também serve de link de política de privacidade na tela de consentimento do Google.

**Decisões do usuário (01/10/2026):**
- **D1 · Ao entrar:** os simulados feitos sem conta neste navegador vão automaticamente para a conta.
- **D2 · Ao sair:** o histórico é apagado deste navegador (computador compartilhado) e continua na conta.
- **D3 · Dados pessoais:** identificador da conta Google (obrigatório), **e-mail e nome**. O cabeçalho mostra o primeiro nome.
- **D4 · Limite:** 50 simulados, como hoje, no servidor e no navegador. O painel soma os 50 mais recentes em qualquer dispositivo.

**Decisões técnicas (propostas por Claude no início do CR, sem objeção do usuário; ADR-010 e ADR-011):**
- **Login por redirecionamento** (OpenID Connect, fluxo *authorization code* com PKCE e `state`), feito pelo servidor. O site **não carrega script do Google**: a CSP fica como está e quem não entra não é exposto ao Google (RNF-005). O botão do Google com One Tap foi descartado por isso.
- **Sessão no banco:** token aleatório no cookie e só o hash SHA-256 no banco. O cookie é `HttpOnly` e `SameSite=Lax`, com `Secure` e prefixo `__Host-` em produção, e a sessão vale 90 dias. Nada de token no `localStorage`.
- **Nenhuma dependência nova:** a troca do código usa `urllib` da stdlib. O `id_token` chega direto do endpoint de token do Google por TLS, autenticado com o segredo do cliente, então as *claims* (`iss`, `aud`, `exp`, `sub`) são validadas sem baixar as chaves (OIDC Core §3.1.3.7; a documentação do Google diz o mesmo).
- **Login desligado sem configuração:** sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `/api/sessao` diz `login_disponivel: false` e o site esconde "Entrar". Desenvolvimento, CI e o smoke test do Docker seguem sem segredo.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Banco | Sem tabela de estudante | `usuarios`, `sessoes`, `simulados_concluidos` (migration `003_contas`) |
| 2 | Login | Não existe | `GET /api/auth/google` (302 para o Google) e `GET /api/auth/google/callback` (cria a sessão) |
| 3 | Sessão | Não existe | `GET /api/sessao` (estado) e `DELETE /api/sessao` (sair) |
| 4 | Histórico no servidor | Não existe | `GET`/`POST`/`DELETE /api/historico`, só com sessão, limitado aos 50 mais recentes |
| 5 | Conta | Não existe | `DELETE /api/conta` apaga o usuário, as sessões e o histórico |
| 6 | Configuração | Sem segredos | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (segredo, só na Railway), `PUBLIC_URL` |
| 7 | Cabeçalho | "Desempenho", "Histórico" | + "Entrar" (sem conta) ou o primeiro nome (com conta), que levam a `/conta` |
| 8 | Páginas | — | `/conta` (entrar, sair, excluir) e `/privacidade`, com link "Privacidade" no rodapé |
| 9 | Histórico e painel | Leem o `localStorage` | Leem `useHistorico`: o `localStorage` sem conta, ou o espelho sincronizado com conta. O aviso muda conforme a situação |
| 10 | Finalizar simulado | Grava no `localStorage` | Grava no `localStorage` e, com conta, envia ao servidor (ou deixa pendente) |
| 11 | "Limpar histórico" | Apaga o `localStorage` | Com conta, apaga na conta (todos os dispositivos), com confirmação explícita |
| 12 | Resultado (`/resultado/:id`) | Só do `localStorage` | Também espera a sincronização antes de dizer "não encontrado" |

### 4.2 O que NÃO muda

- Geração, correção, catálogo, questões, figuras e reportes: sem estado e sem autenticação (ADR-004 continua valendo para eles). Nenhum endpoint existente passa a exigir login.
- O simulado em andamento fica só no navegador (RN-011, RN-012), inclusive com conta.
- O Treino não tem histórico (RF-012), nem com conta.
- O formato do `HistoricoEntry` (`versao: 1`) e a agregação do painel (RN-015, `utils/desempenho.ts`) ficam iguais. O servidor guarda a entrada como o navegador a montou.
- A CSP e os demais headers de segurança. O CORS de desenvolvimento ganha só o método `DELETE`.
- Sem conta, o site funciona exatamente como hoje, e o servidor não recebe dado pessoal.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, Visão geral, Persona 1, módulo novo "Conta" (RF-024 a RF-026), RF-020, RF-022, US-013/US-014, RN-012, RN-016, RNF-004, RNF-005, Fora de Escopo, Dependências, Riscos, Glossário, Roadmap | v3.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Stack, Arquitetura geral, Estrutura de pastas, Modelagem (3 tabelas), Padrões da API e do frontend, Integrações (Google), ADR-004 revisto, ADR-010, ADR-011, Variáveis de ambiente | v1.5 |
| `/docs/03-SPEC.md` | Sim | Índice (spec 07), contratos (coluna de autenticação), erros de domínio, headers, migration 003, changelog | v1.5 |
| `/docs/specs/07-contas-sincronizacao.md` | Sim (novo) | Login, sessão, histórico no servidor, sincronização, telas, casos de borda, testes | Criar v1.0 |
| `/docs/specs/03-resolucao.md` | Sim | Rotas (`/conta`, `/privacidade`), `Layout` (link da conta, rodapé) | v1.5 |
| `/docs/specs/04-correcao-resultado.md` | Sim | Finalizar (envio ao servidor), `ResultadoPage` (espera a sincronização), `HistoricoPage` (aviso e limpar com conta) | v1.3 |
| `/docs/specs/06-assuntos-desempenho.md` | Sim | Fonte do painel (`useHistorico`) e aviso com conta | v1.1 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-005 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Variáveis, segredo, cliente OAuth no Google Cloud, backup (agora há dado de usuário), rollback da migration 003, verificação pós-deploy | v1.2 |
| `CLAUDE.md` | Sim | Change Requests, Última Tarefa, Documentos Existentes, Lembretes (dados de usuário no banco) | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `backend/app/config.py` | `google_client_id`, `google_client_secret`, `public_url`, `login_disponivel` |
| Modificar | `backend/app/models.py` | `Usuario`, `Sessao`, `SimuladoConcluido` |
| Criar | `backend/alembic/versions/003_contas.py` | 3 tabelas + índices |
| Criar | `backend/app/services/google.py` | `ProvedorGoogle`: URL de autorização, troca do código, validação do `id_token` |
| Criar | `backend/app/autenticacao.py` | Nomes e atributos dos cookies, PKCE, `state`, caminho de volta |
| Criar | `backend/app/services/contas.py` | Registrar login, criar/obter/encerrar sessão, excluir conta |
| Criar | `backend/app/services/historico.py` | Listar, gravar (idempotente, limite 50), limpar |
| Criar | `backend/app/routers/auth.py`, `conta.py`, `historico.py` | Endpoints novos |
| Modificar | `backend/app/dependencias.py` | `obter_usuario`, `exigir_usuario`, `verificar_origem` |
| Modificar | `backend/app/schemas.py` | `UsuarioPublico`, `SessaoResponse`, `EntradaHistorico` (+ partes), `HistoricoRequest`, `HistoricoResponse` |
| Modificar | `backend/app/main.py` | Routers novos, `app.state.provedor_google`, `DELETE` no CORS de dev |
| Criar | `backend/tests/test_auth.py`, `test_historico.py`, `test_google.py` | Testes |
| Modificar | `backend/tests/test_migrations.py`, `test_config.py` | Migration 003; variáveis novas |
| Modificar | `frontend/src/types.ts`, `services/api.ts` | `Usuario`, `Sessao`; chamadas novas; resposta 204 |
| Modificar | `frontend/src/storage/historicoStorage.ts` | `substituirHistorico`, marca da conta |
| Criar | `frontend/src/storage/sincronizacao.ts` (+ teste) | `sincronizarHistorico`, `historicoSemConta`, `apagarHistoricoDoNavegador` |
| Criar | `frontend/src/hooks/useSessao.ts`, `useHistorico.ts`, `useConta.ts` | Sessão, histórico unificado, sair/excluir |
| Modificar | `frontend/src/hooks/useFinalizarSimulado.ts` | Invalida o histórico (dispara o envio) |
| Modificar | `frontend/src/components/Layout.tsx` | Link da conta e "Privacidade" no rodapé |
| Criar | `frontend/src/components/BotaoGoogle.tsx` | "Entrar com Google" (link, logo do Google inline) |
| Criar | `frontend/src/pages/ContaPage.tsx`, `PrivacidadePage.tsx` (+ testes) | Páginas novas |
| Modificar | `frontend/src/pages/HistoricoPage.tsx`, `DesempenhoPage.tsx`, `ResultadoPage.tsx`, `App.tsx` | `useHistorico`, avisos, rotas |
| Modificar | `frontend/src/test/apiFalsa.ts` | Sessão anônima por padrão |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| Criar tabela | `usuarios` (id, google_sub único, email, nome, criado_em, ultimo_acesso_em) | Sim (`003_contas`) |
| Criar tabela | `sessoes` (token_hash PK, usuario_id FK cascade, criado_em, expira_em) | Sim |
| Criar tabela | `simulados_concluidos` (usuario_id FK cascade + id do simulado = PK composta, finalizado_em_ms, dados JSON, recebido_em) | Sim |

**Migration:**
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL,
  nome VARCHAR(200),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessoes (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_sessoes_usuario_id ON sessoes (usuario_id);
CREATE TABLE simulados_concluidos (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id VARCHAR(64) NOT NULL,
  finalizado_em_ms BIGINT NOT NULL,
  dados JSON NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, id)
);
CREATE INDEX ix_simulados_concluidos_usuario_finalizado ON simulados_concluidos (usuario_id, finalizado_em_ms);
```
Migration só aditiva: o código anterior ignora as tabelas novas.

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, PRD v3.0, Arquitetura v1.5 (ADR-010, ADR-011), spec 07 nova, specs 03/04/06, índice 03, Plano, Deploy Guide | — | Docs revisados e commitados |
| CR-T-02 | Banco: models + migration `003_contas` | CR-T-01 | Upgrade/downgrade verdes; models em sincronia com a migration (BT-047) |
| CR-T-03 | Login e sessão: `config`, `ProvedorGoogle`, cookies, `services/contas`, routers `auth` e `conta`, dependências (`exigir_usuario`, `verificar_origem`) | CR-T-02 | BT-050 a BT-055, BT-060 a BT-064 verdes |
| CR-T-04 | Histórico no servidor: schemas, `services/historico`, router | CR-T-03 | BT-056 a BT-059 verdes |
| CR-T-05 | Frontend, base: tipos, `api` (204), `useSessao`, marca da conta, `sincronizacao.ts` | CR-T-04 | UT-030 a UT-032 verdes |
| CR-T-06 | Frontend, telas: `useHistorico`, `useConta`, `Layout`, `ContaPage`, `PrivacidadePage`, Histórico/Desempenho/Resultado, finalizar | CR-T-05 | UT-033 a UT-036 verdes |
| CR-T-07 | Validação runtime local com provedor falso (FT-013), revisão OWASP, `/code-review` | CR-T-06 | Registrados na §8 |
| CR-T-08 | **(usuário)** Criar o cliente OAuth no Google Cloud e configurar as variáveis na Railway (passo a passo no Deploy Guide §3.1). **Gate: sem isso o login fica desligado em produção** | CR-T-01 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `PUBLIC_URL` definidas no serviço |
| CR-T-09 | Docs finais, merge + push + CI verde; conferência em produção com login real (FT-014, com o usuário) | CR-T-07, CR-T-08 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [ ] Sem conta, o site funciona como antes: nenhum cookie é criado, nenhum script de terceiros é carregado e nenhum dado pessoal vai para o servidor
- [ ] "Entrar com Google" leva ao consentimento do Google e volta logado para a página de origem; o cabeçalho mostra o primeiro nome
- [ ] A sessão fica num cookie `HttpOnly`/`SameSite=Lax` (`Secure` + `__Host-` em produção); o banco guarda só o hash do token
- [ ] Ao entrar, os simulados deste navegador vão para a conta (D1) e o histórico passa a ser o da conta, inclusive em outro dispositivo
- [ ] Simulado concluído com conta é enviado ao servidor; sem rede, fica pendente e é enviado na próxima sincronização
- [ ] O servidor guarda no máximo os 50 simulados mais recentes por conta (D4); o painel "Meu desempenho" soma o histórico sincronizado
- [ ] "Sair" envia os pendentes e apaga o histórico deste navegador (D2); entrar de novo o traz de volta
- [ ] "Limpar histórico" com conta apaga na conta (todos os dispositivos), com confirmação que diz isso
- [ ] "Excluir conta" apaga usuário, sessões e histórico no servidor, e o histórico do navegador
- [ ] Um usuário nunca lê nem apaga o histórico de outro (ownership — BT-058)
- [ ] Login desligado (sem as variáveis): "Entrar" não aparece e `/api/auth/google` responde 404
- [ ] `/privacidade` descreve os dados guardados, a finalidade, o cookie de sessão e como excluir
- [ ] Migration `003` testada: `upgrade head` + `downgrade -1` (SQLite local e Postgres no CI)
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança — BT-047, BT-050 a BT-064, UT-030 a UT-036
- [ ] Fluxo afetado exercitado em runtime antes do merge — FT-013 (provedor falso local, Playwright) e chamadas HTTP
- [ ] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados
- [ ] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: endpoints novos, autenticação, cookies, sessões e dados de usuário
- [ ] Documentos afetados foram atualizados
- [ ] CI verde na branch e em `master`; login real com Google em produção conferido com o usuário (FT-014)

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | O banco passa a ter dado pessoal (e-mail, nome, resultados): vazamento ou perda | Baixa | Alto | Só o mínimo (D3); sem token em claro (hash); sessão `HttpOnly`; exclusão pelo próprio usuário; backup documentado no Deploy Guide §6. Antes, o banco era descartável; agora não é |
| 2 | CSRF nos endpoints que mudam dados (`POST`/`DELETE`) | Baixa | Médio | Cookie `SameSite=Lax` + verificação do `Origin` contra `PUBLIC_URL` (403) + corpo JSON obrigatório no `POST` |
| 3 | Login com conta errada ou `state` forjado (login CSRF) | Baixa | Médio | `state` aleatório num cookie `HttpOnly` de 10 min, comparado em tempo constante; PKCE S256 |
| 4 | Redirecionamento aberto pelo parâmetro `voltar` | Média | Médio | Só caminhos internos simples (`^/[A-Za-z0-9/_-]*$`); qualquer outro vira `/` |
| 5 | Entrada de histórico inválida trava a sincronização | Baixa | Médio | O servidor valida entrada por entrada e devolve as recusadas em `rejeitadas`; elas ficam só no navegador e o resto sincroniza |
| 6 | Sincronização apaga localmente algo que não chegou à conta | Baixa | Alto | Só sai do navegador o que a marca da conta registra como confirmado pelo servidor; pendentes nunca são apagadas por sincronização; "Sair" envia os pendentes antes de apagar (e não apaga se o envio falhar) |
| 7 | Computador compartilhado: o próximo usuário vê ou herda o histórico | Média | Médio | D2 (sair apaga o navegador); sessão encerrada sem "Sair" também remove o espelho da conta; entradas da marca de outra conta nunca vão para a conta nova |
| 8 | App OAuth em modo "Teste" no Google limita o login a usuários de teste | Média | Alto | Publicar o app ("Em produção") no Google Cloud; com escopos `openid email profile`, não há verificação (Deploy Guide §3.1) |
| 9 | Segredo do cliente vazar | Baixa | Alto | Só em variável da Railway; nunca no repositório, no chat ou em log; o código não registra tokens nem segredos |
| 10 | Excesso de chamadas de sincronização | Baixa | Baixo | Uma sincronização por carga de página/foco (TanStack Query, `staleTime` 60 s); limite por IP nos endpoints |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-005` → `git revert -m 1 <merge do CR-005>` → merge em `master` → push.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard (o código anterior ignora as tabelas novas).
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-005-contas`.
- **Efeito no estudante:** o site volta a ser só local. Os navegadores com conta mantêm o espelho no `localStorage` como histórico local; nada se perde no navegador.

### 10.2 Rollback de Migration

- **Migration afetada:** `003_contas.py`
- **Comando de downgrade:** `alembic downgrade 002`
- **Downgrade testado?** [ ] Sim / [ ] Nao
- **Downgrade é destrutivo?** [x] Sim (dados perdidos) / [ ] Nao — apaga contas, sessões e históricos do servidor

Não é preciso reverter a migration para reverter o código: o código anterior ignora as tabelas. Reverter a migration só se for para apagar os dados de propósito, com backup antes.

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao — só o código é revertido; as tabelas ficam
- **Detalhamento:** com `downgrade` (opcional), as contas e os históricos no servidor são apagados. Os históricos que estiverem nos navegadores continuam lá.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao — a migration só cria tabelas. A partir deste CR, porém, o banco tem dados de usuário e o backup passa a ser rotina (Deploy Guide §6)
- **Procedimento de backup:** Ver Deploy Guide §6

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_URL`
- **Ação de rollback:** podem ficar (o código anterior as ignora). Para desligar só o login sem reverter código: remover `GOOGLE_CLIENT_ID` (o site esconde "Entrar")

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `alembic current` mostra a revisão esperada (se a migration foi revertida)
- [ ] Simulado completo sem conta: gerar, finalizar, histórico local
- [ ] Usuários existentes conseguem fazer login (se só o login foi desligado: "Entrar" some e nada quebra)

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-01 | Rafael Peixoto (com Claude) | CR criado com as decisões D1–D4 e as decisões técnicas (ADR-010, ADR-011) |
