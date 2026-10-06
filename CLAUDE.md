# CLAUDE.md — Instruções do Projeto

## Identidade do Projeto

- **Nome:** Simulado Fuvest
- **Descrição:** Site que gera simulados da prova da FUVEST a partir de questões de provas de anos anteriores (acervo oficial em fuvest.br), para estudantes praticarem com questões reais
- **Stack:** React 19 + TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL (prod) / SQLite (dev), deploy na Railway
- **Repositório:** https://github.com/RafaelPeixoto01/simulado-fuvest (público, branch padrão `master`; `gh` é o credential helper do git, conta `RafaelPeixoto01`). Identidade de commit **local ao repo**: `Rafael Peixoto <rafaelspeixoto1@gmail.com>` — a global da máquina é a de trabalho e não deve ir para este repositório
- **Produção:** https://simulado-fuvest-production.up.railway.app (Railway, projeto/serviço `simulado-fuvest` + Postgres, provisionados via `railway` CLI na T-027); deploy com a skill `/deploy-railway`

---

## Comandos Essenciais

> O backend usa o venv **do projeto** (`backend/.venv`) — nunca o Python global, que tem as versões do Meu Controle. Setup: `cd backend && python -m venv .venv && .venv/Scripts/python -m pip install -r requirements-dev.txt`; `cd frontend && npm install`.

| Ação | Comando |
|------|---------|
| Backend (dev) | `cd backend && .venv/Scripts/python -m alembic upgrade head && .venv/Scripts/python -m uvicorn app.main:app --reload` (porta 8000, SQLite `local.db`) |
| Frontend (dev) | `cd frontend && npm run dev` (porta 5173, proxy `/api` e `/figuras` → 8000) |
| Testes backend | `cd backend && .venv/Scripts/python -m pytest` |
| Lint backend | `cd backend && .venv/Scripts/python -m ruff check .` |
| Validar pacotes | `cd backend && .venv/Scripts/python -m ingestao validar --todas` (ou `--prova CODIGO`) — valida também a taxonomia `data/provas/assuntos.yaml` e as notas de corte |
| Revisar assuntos | `cd backend && .venv/Scripts/python -m ingestao assuntos --prova CODIGO` (classificação por disciplina e assunto, uma questão por linha; sem `--prova`, todos os pacotes) |
| Simulado oficial | `cd backend && .venv/Scripts/python -m ingestao baixar --prova 2027s1 --prova-url <PDF S1> --gabarito-url <PDF gabarito> --versao S1` e `... extrair --prova 2027s1` (família 2027; código da prova `AAAAsN` — CR-011). Os comandos de pacote aceitam `--prova CODIGO` (`2025`, `2027s1`); `--ano` continua aceito como sinônimo |
| Notas de corte | `cd backend && .venv/Scripts/python -m ingestao cortes --ano AAAA --url <PDF "Notas de Corte" do acervo>` (rascunho em `data/provas/notas_corte/AAAA.yaml`; não sobrescreve sem `--forcar`; nomes completados à mão — Deploy Guide §4.5) |
| Dados sintéticos (dev) | `cd backend && .venv/Scripts/python -m tests.fixtures.gerar_pacotes ../data/_cache/sinteticos && .venv/Scripts/python -m ingestao importar --data-dir ../data/_cache/sinteticos` (provas fictícias 2098/2099 e o simulado oficial sintético `2099s1`, de 80 questões, no `local.db`) |
| Admin da gestão | `railway ssh -s simulado-fuvest 'python -m ingestao contas --email X --database-url $DATABASE_URL'` (só leitura, dentro do container: mostra o `sub` da conta para `ADMIN_GOOGLE_SUBS` — Deploy Guide §8.4, CR-013) |
| Importar pacotes reais | `cd backend && .venv/Scripts/python -m ingestao importar` (usa `data/provas`; **o banco passa a espelhar o diretório** — provas fora dele são removidas) |
| Testes frontend | `cd frontend && npm test` (Vitest) |
| Build check TS | `cd frontend && npx tsc --noEmit -p tsconfig.app.json` |
| Lint frontend | `cd frontend && npm run lint` |
| Build frontend | `cd frontend && npm run build` |
| Backup de produção | `scripts/backup-producao.sh --ensaio` (Git Bash, na raiz: dump dentro do container do Postgres, SHA-256 conferido, restauração de ensaio num banco temporário; arquivo em `~/backups-simulado-fuvest` — Deploy Guide §6, CR-014) |
| Migrations | `cd backend && .venv/Scripts/python -m alembic upgrade head` (aplicar) / `... downgrade -1` (reverter) |

---

## Fluxo de Desenvolvimento (Spec-Driven Development)

Este projeto segue um fluxo de desenvolvimento baseado em documentação. **Nunca implemente código sem antes consultar os documentos existentes.**

### Fases do Fluxo

| Fase | Documento | Caminho | Quando Usar |
|------|-----------|---------|-------------|
| 0 | Change Request (CR) | `/docs/changes/CR-XXX.md` | Alterações e correções em funcionalidades existentes |
| 1 | PRD | `/docs/01-PRD.md` | Definição inicial ou adição de módulos grandes |
| 2 | Arquitetura | `/docs/02-ARCHITECTURE.md` | Decisões de stack, estrutura e padrões |
| 3 | Spec Técnica | `/docs/03-SPEC.md` | Detalhamento técnico de cada feature |
| 4 | Plano de Implementação | `/docs/04-IMPLEMENTATION-PLAN.md` | Ordem e dependências das tarefas |
| 5 | Implementação | Código-fonte | Construção efetiva |
| 6 | Revisão de Segurança | Checklist OWASP | Novos endpoints, auth, CRUD com dados de usuário, novas dependências |
| 7 | Validação | Checklist "Done When" | Verificar critérios de aceite antes do deploy |
| 8 | Deploy e Release | `/docs/05-DEPLOY-GUIDE.md` | Procedimentos de deploy, rollback e verificação |

### Regra de Ouro

```
Documentação PRIMEIRO → Código DEPOIS
```

- Novas features: PRD → Arquitetura → Spec → Plano → Implementação
- Alterações/Correções: CR → Avaliar impacto → Atualizar docs afetados → Implementar
- Bug fix simples: CR → Implementar → Atualizar testes

### IMPORTANTE: CR é Obrigatório

> **NUNCA implemente uma feature ou alteração significativa sem criar o CR primeiro.**
> Mesmo para mudanças urgentes ou aparentemente simples. Se uma alteração já foi feita
> sem CR, crie um retroativamente antes de prosseguir com qualquer follow-up.

---

## Templates e Prompts

### Templates de Documentos

Ao criar qualquer documento do fluxo, **use obrigatoriamente o template correspondente** como base:

| Documento | Template |
|-----------|----------|
| Change Request | `/docs/templates/00-template-change-request.md` |
| PRD | `/docs/templates/01-template-prd.md` |
| Arquitetura | `/docs/templates/02-template-architecture.md` |
| Spec Técnica | `/docs/templates/03-template-spec.md` |
| Plano de Implementação | `/docs/templates/04-template-implementation-plan.md` |
| CLAUDE.md | `/docs/templates/CLAUDE-template.md` |

---

## Regras de Implementação

### Antes de Codar

1. **Leia** `/docs/02-ARCHITECTURE.md` para entender stack e padrões
2. **Leia** o índice `/docs/03-SPEC.md` e só a spec da feature afetada em `/docs/specs/` (não carregue todas as specs)
3. **Leia** `/docs/04-IMPLEMENTATION-PLAN.md` para entender a ordem
4. **Nunca invente** funcionalidades que não estão na spec
5. **Nunca omita** funcionalidades que estão na spec
6. **Se houver ambiguidade**, pare e pergunte antes de decidir
7. **Explore antes de mudar:** Em tarefas que envolvem deploy, migrations, ou dependências, explore o estado atual antes de agir (o que está deployado, schema do banco, dependências instaladas)

### Durante a Implementação

- Siga a estrutura de pastas do `02-ARCHITECTURE.md`
- Siga as convenções de nomenclatura do `02-ARCHITECTURE.md`
- Implemente uma tarefa por vez conforme o `04-IMPLEMENTATION-PLAN.md`
- Escreva testes para cada funcionalidade
- Verifique o checklist "Done When Universal" ao concluir cada tarefa

### Done When Universal

Toda tarefa (CR-T-XX, T-XXX) só é considerada concluída quando:

**Obrigatórios:**
- [ ] Funcionalidade implementada conforme descrito na tarefa
- [ ] App roda localmente sem erros (backend + frontend)
- [ ] Fluxo afetado exercitado em runtime antes do merge — Playwright para UI, chamada HTTP real para endpoints — com registro no CR do que foi validado; ou justificativa de N/A no CR
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a funcionalidade adicionada/alterada
- [ ] Commit segue Conventional Commits e referencia o ID da tarefa

**Se aplicável:**
- [ ] Revisão de código pré-merge executada (`/code-review` no diff da branch) para CRs de complexidade Média/Alta, com findings corrigidos ou justificados no CR
- [ ] Migration testada: `alembic upgrade head` + `alembic downgrade -1`
- [ ] Endpoints respondem com status codes corretos
- [ ] Documentos afetados atualizados (Spec, Architecture, CLAUDE.md)
- [ ] Sem erros/warnings no console do browser (frontend)
- [ ] Revisão de segurança realizada (checklist OWASP — ver seção "Revisão de Segurança")

### Revisão de Segurança

**Quando executar** — obrigatório se a tarefa/CR envolver:
- Novo endpoint ou mudança em endpoint existente
- Autenticação, tokens, cookies ou sessões
- CRUD com dados de outros usuários (verificação de ownership)
- Nova dependência (biblioteca externa)

Pular com justificativa explícita apenas se a mudança for exclusivamente: UI sem novos endpoints, atualização de documentação, ou refactoring interno sem alteração de contrato.

**Checklist OWASP (adaptado à stack):**
- [ ] Sem segredos hardcoded no código (SECRET_KEY, API keys, tokens)
- [ ] Inputs do usuário validados via Pydantic (backend) antes de uso no banco
- [ ] Tokens sensíveis não armazenados em `localStorage` (preferir cookie HttpOnly)
- [ ] Endpoints de dados verificam ownership (usuário acessa só seus próprios recursos)
- [ ] Queries usam ORM parametrizado (SQLAlchemy) — sem concatenação de SQL raw
- [ ] CORS: origins e headers explícitos; `allow_credentials=True` exige origins não-wildcard
- [ ] Headers de segurança HTTP presentes
- [ ] Novas dependências auditadas: `pip audit` / `npm audit`

### Fluxo de Branches

- Nunca commitar diretamente em `master`
- Criar branch para cada CR: `git checkout -b feat/CR-XXX-slug`
- Nomenclatura:
  - Nova feature/CR: `feat/CR-XXX-slug`
  - Correção/CR:     `fix/CR-XXX-slug`
  - Hotfix urgente:  `hotfix/descricao`
- Ao concluir: merge em `master` com `--no-ff` e deletar a branch:
  ```bash
  git checkout master
  git merge feat/CR-XXX-slug --no-ff
  git branch -d feat/CR-XXX-slug
  git push origin master
  ```
- Push em `master` dispara o auto-deploy na Railway (depois de configurado o serviço)

### Commits

- Formato: Conventional Commits
- Nova feature: `feat: implement T-XXX - <descrição>`
- Correção: `fix: CR-XXX - <descrição>`
- Documentação: `docs: update <documento> for CR-XXX`
- Refactoring: `refactor: <descrição>`
- Testes: `test: add tests for T-XXX`

### Push e Deploy

- Antes de push, verifique se o build passa: `cd frontend && npx tsc --noEmit -p tsconfig.app.json` e `npm run lint`, e os testes do backend
- CI (GitHub Actions, `.github/workflows/ci.yml`) roda em push de **qualquer branch**: pytest + ruff + migrations num Postgres 18 (a versão da produção, CR-014) + tsc + eslint + vitest — verifique que ficou verde após o push (`gh run watch`). Não há Postgres/Docker local: o CI é onde as migrations são testadas no Postgres
- Commits devem referenciar o CR relevante (ex: `feat: CR-004 - descricao`)
- Após implementação, atualize TODOS os documentos relacionados antes de push
- Faça merge da branch do CR em `master` e então push: `git push origin master`

---

## Regras para Alterações e Correções

Quando eu pedir uma alteração, correção ou nova funcionalidade em algo que já existe, **use a skill `/sdd-pipeline`**, que automatiza o fluxo completo:

> CR (template + numeração sequencial em `/docs/changes/`) → branch `feat/CR-XXX-slug` → avaliação de impacto e atualização dos docs afetados → implementação → revisão de segurança (checklist OWASP) → validação (critérios de aceite + Done When Universal) → build TS + lint + testes → merge `--no-ff` em `master` + push.

Os detalhes de cada etapa estão nas seções "Fluxo de Desenvolvimento", "Regras de Implementação" e "Fluxo de Branches" acima. Todo CR concluído entra em `/docs/changes/INDEX.md`.

**Nunca faça alterações direto no código sem antes documentar o CR.**

---

## Regras para Criação de Documentos

- Ao criar qualquer documento, **leia primeiro o template correspondente** em `/docs/templates/`
- Mantenha versionamento nos documentos (Versão 1.0, 1.1, 2.0...)
- Ao atualizar um documento, adicione entrada no changelog (quando existente)
- Referencie IDs entre documentos (RF-001, RN-001, T-001, CR-001, US-001)
- Use diagramas Mermaid quando aplicável

---

## Estrutura de Pastas do Projeto

Estrutura planejada — o detalhe arquivo a arquivo passa a viver no `/docs/02-ARCHITECTURE.md` (fonte da verdade da estrutura) depois da fase de Arquitetura. Para o estado atual real, liste o filesystem (Glob) em vez de confiar em árvores documentadas.

```
Simulado Fuvest/
├── .github/workflows/ci.yml   # CI: pytest (backend) + tsc/eslint/vitest (frontend)
├── .claude/                    # Versionado (exceto settings.local.json)
│   ├── hooks/check-quality.js  #   Bloqueia git commit se algum check falhar
│   ├── skills/deploy-railway/  #   /deploy-railway (copiada do Meu Controle): merge em master + push + verificação
│   ├── hooks/check-config.json #   Lista de checks do hook (vazia até o T-001)
│   └── settings.json           #   Hook PreToolUse para git commit
├── docs/                       # PRD, Arquitetura, Spec, Plano, Deploy Guide
│   ├── changes/                #   Change Requests CR-XXX + INDEX.md
│   └── templates/              #   Templates obrigatórios dos documentos
├── data/provas/CODIGO/         # Pacotes de prova (prova.yaml + figuras/), um por código: 2025, 2027s1 — FONTE DA VERDADE das questões (ADR-002, ADR-015)
├── data/provas/assuntos.yaml   # Taxonomia de assuntos por disciplina (ADR-009, CR-004)
├── data/provas/notas_corte/    # Notas de corte da 1ª fase por ano, AAAA.yaml (ADR-014, CR-010)
├── data/_cache/                # PDFs baixados do acervo (gitignored)
├── backend/                    # FastAPI + SQLAlchemy + Alembic; app/pacote (schema/validação/sincronização); ingestao/ (CLI do curador)
├── frontend/                   # React + Vite + TS (SPA servido pelo FastAPI em produção)
├── scripts/backup-producao.sh  # Backup do Postgres de produção pelo railway ssh (CR-014)
├── CLAUDE.md
└── .gitignore
```

---

## Convenções de Código

| Item              | Padrão        | Exemplo                 |
|-------------------|---------------|-------------------------|
| Arquivos Python   | snake_case    | `question_service.py`   |
| Arquivos TS/TSX   | camelCase     | `useSimulado.ts`        |
| Componentes React | PascalCase    | `QuestionCard.tsx`      |
| Classes Python    | PascalCase    | `Question`              |
| Funções Python    | snake_case    | `build_simulado()`      |
| Funções TS        | camelCase     | `formatScore()`         |
| Tabelas BD        | snake_case    | `questions`, `exams`    |
| Rotas API         | kebab-case    | `/api/simulados/{id}`   |

- TypeScript em modo strict (`strict: true`)
- PATCH para atualização parcial (`exclude_unset=True`)
- Tailwind CSS v4: `@import "tailwindcss"` + `@theme` (NÃO usar diretivas v3)
- Tabelas criadas via migration Alembic, nunca via `create_all()`

---

## Stack Tecnológica

Versões definidas em `/docs/02-ARCHITECTURE.md` §1 (fonte da verdade) e fixadas no scaffold (T-001/T-002).

| Camada         | Tecnologia                       | Versão |
|----------------|----------------------------------|--------|
| Frontend       | React + TypeScript               | React 19.3, TS ~6.0 (não 7 — ADR-007) |
| Build/Dev      | Vite + @vitejs/plugin-react      | 8.x / 6.x |
| Estilização    | Tailwind CSS                     | 4.x    |
| Fontes         | Atkinson Hyperlegible Next, Literata e Fraunces (`@fontsource-variable`, no build — CSP `self`) | 5.x |
| State/Fetch    | TanStack Query                   | 5.x    |
| Routing        | react-router-dom                 | 7.x    |
| Lint (FE)      | ESLint + typescript-eslint       | 10.x / 8.x |
| Testes (FE)    | Vitest + jsdom                   | 5.x    |
| Backend        | Python + FastAPI + uvicorn       | 3.12 / 0.142 / 0.54 |
| ORM            | SQLAlchemy (síncrono)            | 2.1    |
| Banco de Dados | PostgreSQL (prod) + SQLite (dev) | —      |
| Migrations     | Alembic                          | 1.20   |
| Validação      | Pydantic                         | 2.13   |
| Rate limit     | slowapi                          | 0.1    |
| Login (CR-005) | Google OAuth 2.0 / OpenID Connect (code + PKCE), stdlib `urllib` | — |
| Ingestão (PDF) | pdfplumber + pypdfium2 + Pillow  | 0.11 / 5.13 / 12.3 |
| Pacotes        | PyYAML                           | 6.0    |
| Lint (BE)      | ruff                             | 0.16   |
| Testes (BE)    | pytest + httpx                   | 9.1 / 0.28 |
| CI             | GitHub Actions                   | Node 24 / Python 3.12 |
| Deploy         | Railway (Docker, serviço único)  | —      |
| Arquitetura    | Monorepo (backend/ + frontend/ + data/) | — |

---

## Contexto Atual do Projeto

### Documentos Existentes
- [x] PRD (`/docs/01-PRD.md`) — v7.0 (MVP + Fase 3A, CR-004 + Fase 3B, CR-005 + login obrigatório, CR-006 + apresentação com a base, CR-007 + identidade "Papel & Caneta", CR-008 + Fase 4: notas de corte, CR-010 + formato de 80 questões e simulados oficiais, CR-011 + área de gestão, CR-013)
- [x] Arquitetura (`/docs/02-ARCHITECTURE.md`) — v1.13 (área de gestão, CR-013), ADR-001 a ADR-016 (ADR-012 emendado pelo CR-007; ADR-013 identidade por tokens e fontes no próprio site; rolagem ao trocar de rota — CR-009; ADR-014 notas de corte como conteúdo versionado — CR-010; ADR-015 código da prova e total de questões por prova, ADR-006 emendado — CR-011; ADR-016 administrador por `sub` e contagens anônimas — CR-013)
- [x] Spec Técnica (`/docs/03-SPEC.md`) — índice + `/docs/specs/01..09`
- [x] Plano de Implementação (`/docs/04-IMPLEMENTATION-PLAN.md`) — T-001 a T-030, branch `feat/mvp`
- [x] Guia de Deploy (`/docs/05-DEPLOY-GUIDE.md`) — v1.8: provisionamento via CLI, cliente OAuth do Google (§3.1), simulados oficiais (§4.2), migrations 005 e 006 (§4.3), notas de corte de um ano novo (§4.5), rollback, backup, operação do curador, ligar a área de gestão (§8.4)

### Change Requests
> **Histórico completo em [`docs/changes/INDEX.md`](docs/changes/INDEX.md)** — mantido aqui apenas os 5 mais recentes. Ao concluir um CR novo: adicionar aqui, mover o mais antigo dos 5 para o INDEX.md.

- **CR-013** — Área de gestão (Concluído, 2026-10-06): página `/gestao` só para o administrador (`ADMIN_GOOGLE_SUBS` com o `sub` da conta Google, nunca o e-mail; 404 para os demais, antes de qualquer validação), com as abas Uso, Aprendizado, Qualidade (reportes resolvidos pela web, questões suspeitas — RN-022 — e saúde da base) e Estudantes (lista das contas). Contagens anônimas por dia de Brasília (`estatisticas_diarias`, `estatisticas_questoes`, migration 006 com backfill): login, usuário ativo (no primeiro pedido do dia), conta excluída, concluídos por modo e marcações por questão; a geração passa ao dia de Brasília. Decisões D1–D3 e T1–T6 no CR. Em produção com a conta do dono do produto como administrador, conferida pelo usuário
- **CR-012** — Família 2026 no extrator (Concluído, 2026-10-05): a prova da FUVEST 2026 (aplicada em 23/11/2025) e o simulado oficial de 19/10/2025, ambos de 90 questões e no acervo de 2026, estrearam o layout da família 2027. A `familia_2026` junta o parser de prova da 2027 com o gabarito de 90 da 2025 e registra `2026` e `2026s1`. D1: o simulado aparece como "Simulado FUVEST 2026 · 1ª edição". A curadoria é conteúdo (`conteudo/prova-2026`, `conteudo/simulados-2026`)
- **CR-011** — Formato de 80 questões (FUVEST 2027) e simulados oficiais da FUVEST (Concluído, 2026-10-05): a 1ª fase passa a ter 80 questões (Resolução CoG 9008/2026). Prova identificada por **código** (`2025`; `2027s1` no simulado oficial, edição 1), que é o diretório do pacote, a chave de `provas`, o prefixo dos ids (`2027s1-001`) e o caminho das figuras (ADR-015; migration 005 recria as tabelas derivadas); pacote com `tipo`, `edicao` e `total_questoes` (V01 pelo total); família de layout `familia_2027` e `--prova` na CLI. Prova completa com 80 (distribuição pela média das proporções), Personalizado com 225 s por questão, Prova de um ano com o total da prova e seção de simulados oficiais, origem na questão, notas de corte com `pontos_prova` e comparação proporcional ("equivale a … (estimativa)"). Decisões D1–D3 e P1–P5 no CR. A curadoria dos dois simulados é conteúdo (`conteudo/simulados-2027`)
- **CR-010** — Notas de corte por carreira e carreira-alvo, Fase 4 do roadmap (Concluído, 2026-10-02): notas de corte da 1ª fase de 2020 e 2022–2025 (e, depois, 2026, como conteúdo) em `data/provas/notas_corte/AAAA.yaml` (ADR-014; extrator e comando `cortes`, regras C01–C05; de 2024 em diante o campus vem do Guia de Carreiras/Manual do Candidato); `GET /api/notas-corte`; carreira-alvo na conta (migration 004, `PUT`/`DELETE /api/conta/carreira-alvo`, só da lista mais recente, nunca a modalidade); página `/notas-de-corte`; comparação nos simulados de 90 questões (resultado e "Seu último simulado"). Decisões D1–D4: só notas de corte na Fase 4 por ora; carreira-alvo da lista mais recente, sem equivalência entre anos; página própria; sempre as três modalidades
- **CR-009** — Rolagem ao trocar de página e extras do início (Concluído, 2026-10-02): R1 (bug) toda mudança de caminho começa no topo, inclusive no voltar do navegador (`RolarAoTopo` no `App`, `scrollRestoration` em `manual`); extras do CR-008 que faltavam: E4 (sobretítulo, etiquetas e `MiniFolha` no cartão da Prova completa), E7 (lateral de 340 px a partir de 1280 px) e E6 (modos em linhas inteiras clicáveis abaixo de 640 px); A1 (círculo de caneta com mais folga em número de um algarismo) e A2 (marcas do painel da folha abaixo da legenda)

### Última Tarefa Implementada
- CR-013 (2026-10-06): área de gestão — `/gestao` com Uso, Aprendizado, Qualidade e Estudantes, só para o `sub` em `ADMIN_GOOGLE_SUBS`; contagens anônimas (migration 006, backfill do histórico guardado). Validado com o Playwright (provedor falso, `ADMIN_GOOGLE_SUBS` com o `sub` falso); revisão de código com 7 corrigidos e 3 justificados. CI verde (branch e `master`), migration 006 em produção, `ADMIN_GOOGLE_SUBS` definida e a área conferida pelo usuário com o login real
- Simulado oficial FUVEST 2026 (2026-10-06): `2026s1` (aplicado em 19/10/2025, "Simulado FUVEST 2026 · 1ª edição" — D1 do CR-012) curado, aprovado pelo usuário (inclusive as 19 classificações em dúvida) e publicado (`conteudo/simulados-2026`); com ele são 9 provas e 786 questões na base, e todo o acervo de 2026 está publicado. O texto das Q36–37 virou o texto-base `tb08` (os ids de texto-base não precisam ser sequenciais). Script em `data/_cache/curadoria/curadoria_2026s1.py`
- Prova FUVEST 2026 (2026-10-06): curada, aprovada pelo usuário (inclusive as 21 classificações em dúvida) e publicada (`conteudo/prova-2026`, família 2026 — CR-012); com ela são 8 provas e 696 questões não anuladas na base (anulada no gabarito: Q3). Decisão nova do usuário: trecho citado em itálico no meio do enunciado vira aspas (aspas internas viram simples), porque o site não tem itálico. Script em `data/_cache/curadoria/curadoria_2026.py`. Próximo: o simulado oficial `2026s1` (`conteudo/simulados-2026`)
- CR-012 (2026-10-05): `familia_2026` no extrator para a prova da FUVEST 2026 e o simulado oficial de 2025 (achados conferindo o relatório do Gemini Deep Research sobre simulados; os de cursinho ficam só nas plataformas, com todos os direitos reservados). Com os PDFs reais: 90 questões cada, 55 e 41 sem pendência estrutural, gabarito casado (a 3 anulada na prova). Próximo: curadoria das duas provas, cada uma numa branch de conteúdo
- Simulados oficiais 2027 (2026-10-05): 1ª e 2ª edições (`2027s1`, `2027s2`) curadas, aprovadas pelo usuário e publicadas (`conteudo/simulados-2027`); com elas são 7 provas e 607 questões não anuladas na base (anuladas no gabarito: Q51 da 1ª e Q20 da 2ª edição). Scripts da curadoria em `data/_cache/curadoria/curadoria_2027s{1,2}.py`
- CR-011 (2026-10-03): formato de 80 questões e simulados oficiais — código da prova (ADR-015), migration 005, família 2027, Prova completa com 80, simulados na Prova de um ano, comparação proporcional com o corte. Os rascunhos reais de `2027s1` e `2027s2` extraem 80 questões com o gabarito casado (só no diretório temporário; a curadoria é a branch `conteudo/simulados-2027`)
- T-029 (2026-10-02): prova 2020 curada e publicada (`conteudo/prova-2020`); com 2020 e 2022–2025, são 5 provas e 449 questões no catálogo de produção, a meta do PRD §2. Os textos com linhas numeradas (Q03, Q43, texto das Q44–45) mantêm uma linha do PDF por linha, com o número a cada 5 na margem. Próximo: T-030 (revisão final)
- CR-010 (2026-10-02): notas de corte por carreira (Fase 4) — página `/notas-de-corte`, carreira-alvo na conta e comparação no resultado e no início; notas de corte de 2020 e 2022–2025 publicadas, com os nomes revisados pelo usuário (Gate 1), e conferidas em produção com o login real. Depois, as notas de corte de 2026 (conteúdo, `conteudo/cortes-2026`), que viram a lista da carreira-alvo; o limite do nome da carreira subiu para 250 caracteres
- CR-009 (2026-10-02): página nova sempre no topo (bug da rolagem herdada) e extras do início (cartão da Prova completa com miniatura da folha, lateral de 340 px, modos em linhas no celular), círculo de um algarismo e marcas do painel da folha
- CR-008 (2026-10-02): identidade visual "Papel & Caneta" e, no início com conta, saudação, "Seu último simulado" e Prova completa em destaque
- CR-007 (2026-10-01): apresentação com os números da base (vitrine pública) e a prévia do simulado, menu do cabeçalho no celular e barra da resolução opaca
- CR-006 (2026-10-01): login obrigatório para usar o site (apresentação pública, API de conteúdo com sessão, produção sem login configurado fica indisponível)
- CR-005 (2026-10-01): contas com Google e histórico sincronizado (Fase 3B), com login real em produção. A Fase 3 do roadmap está completa
- CR-004 (2026-10-01): assuntos e painel "Meu desempenho" (Fase 3A); 2023–2025 classificadas por Claude e aprovadas pelo usuário. 2022 e 2020 já devem ser publicadas com assunto (V11). Próximo da Fase 3: CR da Fase 3B (contas)
- CR-003 (2026-09-30): resultado, figura ampliada e banner do início
- CR-002 (2026-09-30): contraste dos tokens e título por rota
- CR-001 (2026-09-30): resolução em modo foco, barra inferior, folha e pausa
- MVP em produção (2026-09-30), grupos 1 a 5 + T-028: rascunhos extraídos de 2020, 2022, 2023, 2024 e 2025 em `data/provas/` (a família 2025 cobre esses anos; 2021 exige OCR). Provas 2025, 2024 e 2023 curadas e publicadas; 2022 e 2020 publicadas depois, cada uma numa branch `conteudo/prova-AAAA` (T-029 concluída em 2026-10-02). Depois: T-030 (revisão final)

---

## Lembretes Importantes

- **CR só é "Concluído" com todos os checkboxes fechados.** Nenhum CR pode receber Status "Concluído" com critérios de aceite desmarcados — cada um deve estar `[x]` ou riscado com justificativa. Critério pendente de evento posterior (ex: CI verde) mantém o CR "Em Implementação" até o follow-up.
- **Pergunte antes de assumir.** Se algo não está claro na spec, pergunte.
- **Não corrija o que não foi pedido.** Foque apenas no escopo da tarefa.
- **Testes são obrigatórios.** Toda funcionalidade precisa de cobertura.
- **Um passo de cada vez.** Implemente por grupo/tarefa, não tudo de uma vez.
- **Documente primeiro.** Código sem documentação gera retrabalho.
- **Docs sempre sincronizados.** Ao concluir uma feature ou CR, atualize TODOS os documentos relacionados na mesma sessão (Implementation Plan, PRD, Spec, CR). A tarefa só está completa quando os docs estão atualizados.
- **Não fabrique ferramentas.** Nunca invente ou adivinhe a existência de plugins, comandos CLI ou ferramentas. Se não tiver certeza, verifique a documentação primeiro. Se um comando falhar, reconheça o erro imediatamente.
- **Planeje antes de codar.** Em tarefas complexas (3+ etapas), crie um plano TodoWrite detalhado antes de escrever qualquer código. Inclua: CR, arquivos a modificar, verificação de build, atualizações de docs, commit.
- **Hook de qualidade ativo.** O hook `.claude/hooks/check-quality.js` intercepta `git commit` e executa os checks de `.claude/hooks/check-config.json` (pytest, ruff, tsc, eslint, vitest). Se o commit for bloqueado, corrija os erros antes de tentar novamente — **nunca use `--no-verify`**. Atenção: o hook dispara em qualquer comando Bash contendo a substring `git commit` (inclusive dentro de echo/printf ou de um JSON de simulação) — para simular o hook, passe o payload por arquivo (`node .claude/hooks/check-quality.js < payload.json`).
- **Conteúdo não é código.** Publicar prova nova ou corrigir questão reportada = branch `conteudo/prova-AAAA` (simulados oficiais: `conteudo/simulados-AAAA`; correção: `conteudo/correcao-CODIGO-NNN`) + commit do pacote em `data/provas/` + CI verde (`validar --todas`), sem CR. Desde o CR-011 o pacote fica no diretório do **código** da prova (`2025`, `2027s1`), e um pacote de 80 questões declara `total_questoes: 80`; o `extrair` só aceita códigos registrados em `ingestao/familias.py`, e registrar um código novo é mudança de parser, com CR (CR-012); notas de corte de 2027 em diante declaram `pontos_prova`. Mudanças em parser/API/UI seguem o CR. Desde o CR-004 toda questão publicada precisa de um assunto da taxonomia da sua disciplina (V11). Renomear ou remover um slug de `assuntos.yaml` exige reclassificar as questões no mesmo commit, senão as provas saem do ar na sincronização. Notas de corte de um ano novo também são conteúdo (`conteudo/cortes-AAAA`, Deploy Guide §4.5, CR-010): os nomes das carreiras são revisados pelo usuário antes da publicação.
- **Ingestão sem IA (decisão do PRD).** O parser é determinístico por família de layout (`ingestao/layouts/`); o que ele não extrai vira `pendencias` no `prova.yaml` para o curador resolver.
- **Deploy com `/deploy-railway`.** Push em `master` dispara o auto-deploy. O "Wait for CI" da Railway (toggle só no dashboard) é o gate; não há branch protection no GitHub, como no Meu Controle.
- **O banco tem dados de usuário (CR-005).** `usuarios`, `sessoes` e `simulados_concluidos` não se reconstroem do git (nem as contagens anônimas `estatisticas_*`, CR-013): backup antes de migration destrutiva com `scripts/backup-producao.sh --ensaio` (Deploy Guide §6, CR-014); nunca rodar `alembic downgrade` da `003` em produção sem backup. `GOOGLE_CLIENT_SECRET` só na Railway — nunca no repositório, em log ou no chat.
- **Login obrigatório (CR-006).** Sem as variáveis do Google, o site abre sem login fora de produção (modo `livre`: dev, testes, CI) e fica indisponível em produção (503). Rotas novas de conteúdo devem entrar num router com `exigir_acesso` (e `verificar_origem` se forem POST); páginas novas, dentro do `RequerConta`. Rotas de administração ficam no router da gestão (`exigir_admin`: 404 para quem não é admin, antes de validar query e corpo — o corpo do POST é lido numa dependência), e as páginas, dentro do `RequerAdmin` (CR-013). Públicos sem sessão: só `/api/health`, `/api/vitrine` (totais da base, CR-007), `/figuras`, o login e `/api/sessao`; campo novo na vitrine é decisão de produto (emenda à D2 do CR-006).
- **Área de gestão (CR-013).** O administrador é o `sub` em `ADMIN_GOOGLE_SUBS` (Railway), nunca o e-mail; o comando `ingestao contas` mostra o `sub`. Contagem nova entra em `services/estatisticas` (`incrementar`, em savepoint: falha vira log e nunca derruba a operação), sem `usuario_id`, no dia de Brasília (`dia_local`). A lista de estudantes é dado pessoal: nunca colar nomes ou e-mails no chat
- **Validar o login localmente com provedor falso.** O login real só roda em produção. Para o Playwright (inclusive a gestão, com `Settings(admin_google_subs={sub falso})`), subir o app com `app.state.provedor_google` trocado por um falso (mesma interface de `tests/contas.ProvedorFalso`; `url_autorizacao` devolve o próprio callback com um `code`), servindo o build na porta 8001 com `PUBLIC_URL=http://localhost:8001`, e navegar por `localhost` (não `127.0.0.1`)
- **Use `/sdd-pipeline` para novas features/CRs.** A skill é **global** (`C:\Users\Rafael\.claude\skills\sdd-pipeline\`): melhorias no pipeline devem ser feitas lá, não em cópia local.

---

## Troubleshooting e Erros Conhecidos

Referência rápida de problemas encontrados e suas soluções. Consulte esta seção antes de debugar problemas já resolvidos. As entradas iniciais vêm do projeto Meu Controle (mesma stack e mesma máquina).

### Banco de Dados Local

| Problema | Causa | Solução |
|----------|-------|---------|
| `alembic upgrade`, `alembic downgrade` ou `uvicorn` local atingem **produção** | `backend/.env` com `DATABASE_URL` apontando para o PostgreSQL da Railway (aconteceu no Meu Controle) | **Sempre sobrescrever a variável** para trabalho local: `DATABASE_URL="sqlite:///./local.db" python -m alembic upgrade head` e o mesmo prefixo no `uvicorn`. Conferir com `python -c "from app.database import engine; print(engine.url)"` antes de qualquer escrita. A suíte `pytest` deve usar SQLite in-memory via fixtures, ignorando o `.env` |

### Alembic / Migrations

| Problema | Causa | Solução |
|----------|-------|---------|
| `ALTER TABLE` com FK falha no SQLite | SQLite não suporta `ALTER` com foreign keys | Usar `op.batch_alter_table()` nas migrations Alembic |
| Depois do `alembic upgrade` para a `005`, o site local fica sem provas | A `005` recria vazias as tabelas derivadas do repositório (CR-011, ADR-015); em produção a sincronização do start as repovoa | Rodar `python -m ingestao importar` (ou `--data-dir` dos sintéticos) de novo; o mesmo depois de um `downgrade` |

### Frontend

| Problema | Causa | Solução |
|----------|-------|---------|
| Classe Tailwind acrescentada a uma constante de estilo não tem efeito (ex.: `${BOTAO} bg-alerta-claro` continua `bg-papel`) | No Tailwind v4, entre utilitários da mesma propriedade e da mesma variante vale a ordem do CSS gerado, não a ordem na lista de classes | Constantes só com a forma (sem cor/padding) e a variação escolhida por ternário (`estilos.ts`: `BOTAO_BARRA_FORMA` + `BARRA_NEUTRO`/`BARRA_ALERTA`); nunca empilhar duas classes da mesma propriedade (CR-001) |
| Página presa em "Carregando…" no dev; log do Vite com `http proxy error ... ECONNRESET` (o backend respondeu 200) | O proxy do Vite nesta máquina às vezes derruba respostas grandes (`/api/questoes` com 90 ids) | Para validar no navegador, servir o build pelo FastAPI: `npm run build` e `STATIC_DIR="../frontend/dist" DATABASE_URL="sqlite:///./local.db" .venv/Scripts/python -m uvicorn app.main:app --port 8001` (sem proxy) |
| Screenshot do Playwright MCP recusado ("outside allowed roots") | O Playwright MCP só grava dentro do projeto | Salvar em `.playwright-mcp/` (está no `.gitignore`) e ler de lá |
| `import css from './index.css?raw'` chega vazio no Vitest | `test.css: false` zera todo CSS, inclusive com `?raw` | `css: { include: [/src[\\/]index\.css/] }` no `vite.config.ts` libera só o `index.css` (o teste de contraste lê os tokens dele — CR-002) |
| Diálogo devolve o foco ao primeiro botão a cada segundo na resolução | O `useAgora` re-renderiza a página a cada 1 s; efeito de diálogo com o callback nas dependências roda de novo e refaz o foco | Guardar o callback numa ref e rodar o efeito só ao abrir (`ConfirmDialog`, `PainelFolha` — CR-001) |
| Arquivos `.js` duplicando os `.tsx` em `frontend/src/` | `tsc` rodado sem `--noEmit` emite JS ao lado dos fontes | Ignorados via `.gitignore` (`frontend/src/**/*.js`). **Sempre editar o `.tsx`/`.ts`**; os `.js` podem ser deletados com segurança |

### Ambiente Windows

| Problema | Causa | Solução |
|----------|-------|---------|
| Comando `del` falha no bash | `del` é comando do CMD, não do bash | Usar `rm -f` no bash tool |
| `timeout` não funciona no PowerShell | Comando exclusivo do CMD | Usar `Start-Sleep` no PowerShell |
| `curl` não funciona no PowerShell | Alias conflita com `Invoke-WebRequest` | Usar `Invoke-RestMethod` no PowerShell |
| uvicorn/alembic não encontrados | Executáveis não estão no PATH do Windows | Usar `python -m uvicorn` / `python -m alembic` |
| `pkill` / `kill` não encerram processo | Comandos Unix não funcionam no Windows | Usar `taskkill //F //PID <pid>` |
| Processo Python com nome inesperado | Nome pode ser `python3.12.exe` em vez de `python.exe` | Identificar via PID: `netstat -ano \| grep <porta>` + `tasklist //FI "PID eq <pid>"` |
| `pip-audit` falha com `CERTIFICATE_VERIFY_FAILED` | Interceptação de certificado local nesta máquina | Auditoria roda no CI (passo informativo no job backend) — não insistir localmente |
| Instalar dependências do backend quebra o Meu Controle | O Python global tem as versões pinadas do Meu Controle (FastAPI 0.139, SQLAlchemy 2.0) | Sempre usar `backend/.venv` (hook, comandos e docs já apontam para ele) |
| Vitest: "failed to find the current suite" só no hook | Com o cwd em `d:\...` (drive minúsculo) o Vitest carrega o próprio módulo duas vezes | O `check-quality.js` normaliza a letra do drive para maiúscula; ao rodar à mão via `cmd`, usar `D:\` |
| Regex com `\b` virou backspace (`\x08`) ao editar via script Python em heredoc | Em string Python comum, `\b` é o caractere de controle backspace; o arquivo parecia certo mas o regex não casava | Editar regex com a ferramenta Edit ou com string raw (`r'...'`); conferir com `repr()` quando um Edit "não acha" o texto |
| `npm install` avisa EBADENGINE do jsdom 30 | jsdom 30 exige Node ≥ 24.15; a máquina tem 24.11 | jsdom fixado em `^29.1` (Arquitetura §10) até atualizar o Node local |
| Arquivo editado por script Python fica com CRLF (Git avisa "CRLF will be replaced by LF") | `Path.write_text` no Windows traduz `\n` para `\r\n` | Gravar com `write_text(..., newline="\n")` (ou `write_bytes`) |
| Saída de script Python com `�` (ou `UnicodeEncodeError`) no lugar de acentos/travessão | Python redirecionado (pipe) no Windows escreve em cp1252 | A CLI `python -m ingestao` já força UTF-8 (CR-004). Para outros scripts, só com pipe/redirecionamento: prefixar `PYTHONIOENCODING=utf-8`. No terminal interativo a saída é Unicode |
| Heredoc do Bash recusado ("unexpected EOF while looking for matching `''") ou `\\n` virando quebra de linha | A ferramenta Bash interpreta parte do conteúdo de heredocs longos | Gravar o script Python num arquivo com a ferramenta Write e rodá-lo (`python script.py`) em vez de heredoc |
| Comando da CLI contra produção sem `DATABASE_PUBLIC_URL` (o Postgres não tem proxy TCP público) | A URL do banco só existe dentro da rede da Railway | Rodar dentro do container com aspas simples, para o `sh` remoto expandir a variável: `railway ssh -s simulado-fuvest 'python -m ingestao reportes listar --database-url $DATABASE_URL'` (Deploy Guide §8.1, §8.4) |
| Comando remoto com dados no stdin (`... \| railway ssh -s Postgres 'cat'`) fica esperando para sempre | O `railway ssh` não repassa a entrada padrão | Mandar o script em base64 dentro do próprio comando (`echo $B64 \| base64 -d \| sh`, como faz `scripts/backup-producao.sh`). Um arquivo não volta ao servidor por ele: a restauração usa o proxy TCP (Deploy Guide §6.1, CR-014) |
| `railway ssh -s simulado-fuvest python -c "..."` falha com `Syntax error: "(" unexpected` | O `railway ssh` repassa o comando a um `sh` remoto e perde as aspas | Mandar o código em base64 (Deploy Guide §8.3) |
| Voltar do navegador devolve a rolagem antiga mesmo com `scrollTo({top: 0})` na troca de rota | O React Router renderiza dentro do `popstate`, e o navegador (`history.scrollRestoration = 'auto'`) restaura a posição logo depois | `RolarAoTopo` põe `manual` enquanto montado (CR-009). Recarregar já começava no topo: os dados chegam depois da carga |
| Login local volta para `/conta?erro=login` mesmo com o provedor falso | O cookie de login foi gravado em `127.0.0.1`, mas o `redirect_uri` (montado do `PUBLIC_URL`) aponta para `localhost`: hosts diferentes, o cookie não vai | Usar o mesmo host do `PUBLIC_URL` no navegador/curl (`http://localhost:8001`) — é o `state` em cookie funcionando (CR-005) |
| `prova.yaml` regravado por script fica com CRLF | `salvar_pacote` usa `write_text`, que no Windows grava `\r\n` | Depois de `salvar_pacote`, regravar trocando `\r\n` por `\n` (como em `data/_cache/curadoria/assuntos_2023_2025.py`); o Git normaliza no commit (`eol=lf`), mas a cópia de trabalho fica com diferença falsa |
