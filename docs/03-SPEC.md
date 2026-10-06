# Especificação Técnica — Simulado Fuvest (Índice)

**Versão:** 1.13
**Data:** 2026-10-06
**PRD Ref:** 01-PRD v7.0
**Arquitetura Ref:** 02-ARCHITECTURE v1.13
**CR Ref:** CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-007, CR-008, CR-009, CR-010, CR-011, CR-012, CR-013

> Este arquivo é o **índice**. O detalhe de cada feature fica em `/docs/specs/`. Para trabalhar numa feature, abra só a spec dela.

---

## 1. Resumo

MVP do Simulado Fuvest: ingestão de provas da 1ª fase a partir dos PDFs oficiais, catálogo e geração de simulados em 4 modos, resolução com cronômetro e persistência local, correção com desempenho por disciplina, histórico local e reporte de erros. Fase 3A (CR-004): assunto por questão, desempenho por assunto no resultado e painel "Meu desempenho". Fase 3B (CR-005): login com Google e histórico sincronizado com a conta; obrigatório para usar o site desde o CR-006. CR-007: apresentação com os números da base (vitrine pública) e prévia do simulado, menu do cabeçalho no celular e barra da resolução opaca. CR-008: identidade visual "Papel & Caneta" (tokens, Fraunces, marca, motivos) e, no início com conta, saudação, "Seu último simulado" e Prova completa em destaque. CR-009: rolagem ao topo a cada mudança de página e extras do início (sobretítulo, etiquetas e miniatura da folha na Prova completa, lateral de 340 px, modos em linhas no celular). CR-010 (Fase 4): notas de corte da 1ª fase por carreira, página `/notas-de-corte` e carreira-alvo na conta, com a comparação no resultado e no início. CR-011: formato de 80 questões da FUVEST 2027 (Prova completa com 80, 225 s por questão no Personalizado) e simulados oficiais da FUVEST como provas próprias, identificadas pelo código (`2027s1`), com a comparação com o corte proporcional à escala da lista. CR-013: área de gestão só para o administrador (`ADMIN_GOOGLE_SUBS`), com uso, aprendizado, qualidade da base e lista de contas, sobre contagens anônimas por dia.

### Specs por feature

| # | Spec | RFs | Resumo |
|---|------|-----|--------|
| 01 | [Ingestão de Provas](specs/01-ingestao.md) | RF-001–RF-006 | CLI do curador, pacote `prova.yaml` (código da prova, tipo, edição e total — CR-011), validação V01–V10, sincronização repo → banco, famílias de layout 2025, 2026 (CR-012) e 2027 |
| 02 | [Catálogo e Geração](specs/02-catalogo-e-geracao.md) | RF-008–RF-012 | `GET /api/catalogo`, `POST /api/simulados` (4 modos; Prova completa com 80 e Prova de um ano pelo código — CR-011), `GET /api/questoes` |
| 03 | [Início, Configuração e Resolução](specs/03-resolucao.md) | RF-008–RF-016 | SPA: identidade visual e tokens (CR-002, CR-008), rotas, cabeçalho (menu do celular — CR-007), início com conta (CR-008, CR-009), rolagem ao trocar de página (CR-009), Home, configuração, resolução (modo foco, barra inferior, folha, pausa — CR-001), cronômetro, Treino, storage |
| 04 | [Correção, Resultado e Histórico](specs/04-correcao-resultado.md) | RF-017–RF-020 | `POST /api/correcoes`, resultado por disciplina, folha corrigida clicável e revisão uma questão por vez (CR-003), histórico local |
| 05 | [Reporte de Erro](specs/05-reportes.md) | RF-007, RF-021 | `POST /api/reportes`, modal, CLI de reportes |
| 06 | [Assuntos e Desempenho](specs/06-assuntos-desempenho.md) | RF-005, RF-018, RF-022, RF-023 | Taxonomia `assuntos.yaml`, V11, `questoes.assunto`, assuntos no catálogo e na correção, CLI `assuntos`, "Ver por assunto" e painel `/desempenho` (CR-004) |
| 07 | [Contas e Histórico Sincronizado](specs/07-contas-sincronizacao.md) | RF-008, RF-020, RF-022, RF-024–RF-026 | Login Google (OIDC + PKCE), sessão em cookie, `/api/sessao`, `/api/historico`, `/api/conta`, sincronização com espelho local, `/conta`, `/privacidade` (CR-005); login obrigatório (CR-006); vitrine e apresentação (CR-007) |
| 09 | [Área de Gestão](specs/09-gestao.md) | RF-030–RF-034 | `ADMIN_GOOGLE_SUBS` e `exigir_admin` (404), contagens anônimas por dia de Brasília (`estatisticas_diarias`, `estatisticas_questoes`, migration 006), `/api/gestao/*`, comando `contas`, `/gestao` com as abas Uso, Aprendizado, Qualidade e Estudantes (CR-013) |
| 08 | [Notas de Corte e Carreira-alvo](specs/08-notas-de-corte.md) | RF-027–RF-029 | `data/provas/notas_corte/AAAA.yaml` (C01–C05; `pontos_prova` — CR-011), extrator e comando `cortes`, `GET /api/notas-corte`, `PUT`/`DELETE /api/conta/carreira-alvo`, migration 004, `/notas-de-corte`, comparação no resultado e no início (CR-010), proporcional à escala da lista (CR-011) |

---

## 2. Contratos da API (Visão Geral)

Desde o CR-006 (ADR-012, `specs/07` §8), catálogo, simulados, questões, correções, reportes e, desde o CR-010, notas de corte exigem sessão (**Acesso**): 401 `nao_autenticado` sem sessão, 503 `site_indisponivel` em produção sem login configurado. Continuam sem estado (ADR-004). Só `/api/health`, `/api/vitrine` (só os totais da base — CR-007, emenda à D2 do CR-006), `/figuras`, o login e `/api/sessao` são públicos. "Sessão" = cookie de sessão obrigatório (401 sem ele); "Origin" = `POST`/`DELETE` que recusam `Origin` diferente de `PUBLIC_URL` (403) — ADR-010. "Admin" = só a conta em `ADMIN_GOOGLE_SUBS`; qualquer outro pedido, inclusive sem sessão, recebe 404 `nao_encontrado` antes da validação (CR-013, ADR-016).

| Método | Path | Rate limit | Body | Resposta | Spec |
|--------|------|------------|------|----------|------|
| `GET` | `/api/health` | — | — | `{"status":"ok","provas":n}` | §3 abaixo |
| `GET` | `/api/vitrine` | — | — | `VitrineResponse` `{"total_questoes":n,"anos":[…]}` (pública em qualquer modo — CR-007) | 07 §9 |
| `GET` | `/api/catalogo` | — | — | `CatalogoResponse` (com assuntos por disciplina — CR-004) (Acesso) | 02, 06 |
| `POST` | `/api/simulados` | 30/min/IP | `Gerar*` (por `modo`; `ano` com `prova` = código — CR-011) | `SimuladoResponse` (Acesso, Origin) | 02 |
| `GET` | `/api/questoes?ids=` | — | — | `QuestoesResponse` (Acesso) | 02 |
| `POST` | `/api/correcoes` | 120/min/IP | `CorrecaoRequest` | `CorrecaoResponse` (com assunto por item e por disciplina — CR-004) (Acesso, Origin) | 04, 06 |
| `POST` | `/api/reportes` | 10/hora/IP | `ReporteCreate` | `{id}` (201) (Acesso, Origin) | 05 |
| `GET` | `/api/notas-corte?ano=` | — | — | `NotasCorteResponse` com `pontos_prova` (Acesso — CR-010, CR-011) | 08 |
| `GET` | `/api/auth/google?voltar=` | 20/min/IP | — | 302 para o Google (404 sem configuração) | 07 |
| `GET` | `/api/auth/google/callback` | 20/min/IP | — | 302 para `voltar` + cookie de sessão, ou `/conta?erro=login` | 07 |
| `GET` | `/api/sessao` | — | — | `SessaoResponse` com `acesso` e, com usuário, `carreira_alvo` (CR-010) e `admin` (CR-013) (`no-store`) | 07, 08, 09 |
| `DELETE` | `/api/sessao` | — | — | 204 (Origin) | 07 |
| `GET` | `/api/historico` | 60/min/IP | — | `HistoricoResponse` (Sessão, `no-store`) | 07 |
| `POST` | `/api/historico` | 30/min/IP | `HistoricoRequest` | `HistoricoResponse` (Sessão, Origin) | 07 |
| `DELETE` | `/api/historico` | 10/min/IP | — | 204 (Sessão, Origin) | 07 |
| `DELETE` | `/api/conta` | 10/min/IP | — | 204 (Sessão, Origin) | 07 |
| `PUT` | `/api/conta/carreira-alvo` | 30/min/IP | `CarreiraAlvoRequest` | `CarreiraAlvo` (Acesso, Sessão, Origin, `no-store` — CR-010) | 08 |
| `DELETE` | `/api/conta/carreira-alvo` | 30/min/IP | — | 204 (Acesso, Sessão, Origin — CR-010) | 08 |
| `GET` | `/api/gestao/uso?periodo=` | 60/min/IP | — | `UsoResponse` (Admin, `no-store` — CR-013) | 09 |
| `GET` | `/api/gestao/aprendizado?periodo=` | 60/min/IP | — | `AprendizadoResponse` (Admin, `no-store`) | 09 |
| `GET` | `/api/gestao/qualidade` | 60/min/IP | — | `QualidadeResponse` (Admin, `no-store`) | 09 |
| `GET` | `/api/gestao/reportes?status=` | 60/min/IP | — | `ReportesGestaoResponse` (Admin, `no-store`) | 09 |
| `POST` | `/api/gestao/reportes/resolver` | 30/min/IP | `ResolverReportesRequest` | `ResolverReportesResponse` (Admin, Origin, `no-store`) | 09 |
| `GET` | `/api/gestao/estudantes?busca=&ordem=&pagina=` | 60/min/IP | — | `EstudantesResponse` (Admin, `no-store`) | 09 |
| `GET` | `/figuras/{prova}/{arquivo}` | — | — | `image/webp` (`prova` = código: `2025`, `2027s1` — CR-011) | §3 abaixo |
| `GET` | `/*` (demais) | — | — | `index.html` (SPA) | §3 abaixo |

**Ids:** questões `CODIGO-NNN` e textos-base `CODIGO-tbNN`, com o código da prova `AAAA` (vestibular) ou `AAAAsN` (simulado oficial, edição N): regex `^\d{4}(s[1-9])?-\d{3}$` em `/api/questoes`, correção, reportes, treino e histórico (ADR-006, ADR-015, CR-011). Os ids anteriores (`2025-037`) não mudam.

**Formato de erro de domínio:** `{"detail": {"codigo": "<snake_case>", "mensagem": "<pt-BR>", ...extras}}`. Erros de validação usam o 422 padrão do FastAPI. Os códigos são `prova_nao_encontrada`, `questoes_insuficientes` e `questao_nao_encontrada`; o CR-005 acrescenta `login_indisponivel` (404), `nao_autenticado` (401) e `origem_invalida` (403); o CR-006, `site_indisponivel` (503); o CR-010, `carreira_invalida` (422); o CR-013, `nao_encontrado` (404, rotas de gestão).

---

## 3. Aspectos Transversais

### 3.1 Aplicação (`app/main.py`)
- Routers sob `/api`; `GET /api/health` conta as provas sincronizadas.
- `ENVIRONMENT=production` desliga `/docs`, `/redoc` e `/openapi.json`, e não registra CORS. Em desenvolvimento, CORS só para `ALLOWED_ORIGINS`.
- Rate limit com slowapi (`app/rate_limit.py`), chave = IP do cliente (uvicorn com `--proxy-headers`). 429 com `{"detail": "Muitas requisições. Tente novamente em instantes."}`.

### 3.2 Figuras
- `GET /figuras/{prova}/{arquivo}`: `prova` é o código da prova (`^\d{4}(s[1-9])?$` — CR-011); `arquivo` casando `^[a-z0-9-]+\.webp$`. Qualquer outro valor → 404, **antes** de tocar o disco, o que impede path traversal.
- Serve `DATA_DIR/{prova}/figuras/{arquivo}` com `Content-Type: image/webp` e `Cache-Control: public, max-age=86400`.
- Só serve figuras de provas presentes em `provas` (sincronizadas); rascunho não sincronizado → 404.

### 3.3 SPA
- `/assets/*` servido do build (`static/assets`); qualquer outra rota fora de `/api` e `/figuras` → `static/index.html`.
- Rotas `/api/*` inexistentes → 404 JSON (não caem no fallback do SPA).

### 3.4 Headers de Segurança (`app/security_headers.py`)
| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'` |
| `Strict-Transport-Security` | `max-age=31536000` (só em produção) |
| `Cache-Control` | `no-store` nas respostas com dado pessoal (`/api/sessao`, `/api/historico`) — CR-005 — e em todas as rotas de gestão (CR-013) |

### 3.5 Migrations
`001_schema_inicial` cria `provas`, `textos_base`, `questoes`, `reportes` e `estatisticas_geracao` conforme `02-ARCHITECTURE.md` §4. `002_assunto_questoes` (CR-004) acrescenta `questoes.assunto` e o índice `ix_questoes_assunto`. `003_contas` (CR-005) cria `usuarios`, `sessoes` e `simulados_concluidos` (downgrade destrutivo: apaga contas e históricos). `004_carreira_alvo` (CR-010) acrescenta `usuarios.carreira_alvo_ano` e `carreira_alvo_codigo` (downgrade apaga só as carreiras-alvo). `005_codigo_prova` (CR-011) recria vazias as tabelas derivadas do repositório (`provas` com a chave `codigo` e `ano`, `tipo`, `edicao`; `textos_base` e `questoes` com `prova_codigo`; ids de 12 caracteres), que a sincronização do start repovoa, e alarga `reportes.questao_id` para 12; contas, históricos e reportes ficam. `006_estatisticas_gestao` (CR-013) cria `estatisticas_diarias` e `estatisticas_questoes` e faz o backfill a partir de `simulados_concluidos` (downgrade apaga só os agregados). Testadas com `upgrade head` + `downgrade base`.

---

## 4. Plano de Testes Transversal

| ID | Cenário | Método/Rota | Esperado |
|----|---------|-------------|----------|
| BT-040 | Health | GET /api/health | 200 `{"status":"ok"}` |
| BT-041 | Figura existente | GET /figuras/2025/q002-1.webp | 200 `image/webp` + Cache-Control |
| BT-042 | Path traversal / extensão inválida | GET /figuras/2025/..%2Fprova.yaml, /figuras/2025/x.png | 404 |
| BT-043 | Figura de prova não sincronizada | GET /figuras/2019/q001-1.webp | 404 |
| BT-044 | Rota do SPA / API inexistente | GET /historico, GET /api/nada | index.html / 404 JSON |
| BT-045 | Headers de segurança presentes | qualquer rota | Todos os headers de §3.4 |
| BT-046 | Docs desligados em produção | GET /docs com `ENVIRONMENT=production` | 404 |
| BT-047 | Migration upgrade/downgrade | alembic | Sem erro nos dois sentidos |
| BT-087 | Migration 005 (CR-011) | alembic 004 → 005 → 004 | Chave da prova trocada nos dois sentidos; contas, sessões, históricos e reportes preservados |
| BT-093 | Figura de simulado oficial (CR-011) | GET /figuras/2099s1/q015-1.webp, /figuras/2099S1/... | 200 / 404 |

---

## 5. Changelog

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-09-29 | Criação: specs 01–05 do MVP |
| 1.13 | 2026-10-06 | CR-013: spec 09 nova (área de gestão); contratos `/api/gestao/*`, `UsuarioPublico.admin`, erro `nao_encontrado`, migration 006; notas nas specs 03, 05 e 07 |
| 1.12 | 2026-10-05 | CR-012: spec 01 v1.4 — `familia_2026` (layout da 2027 + gabarito de 90) para a prova da FUVEST 2026 e o simulado oficial de 2025, IT-035 a IT-037. Nenhum contrato da API muda |
| 1.11 | 2026-10-03 | CR-011: formato de 80 questões e simulados oficiais — código da prova nos ids e nas figuras, `GerarAno.prova`, `QuestaoPublica.prova/origem`, `ProvaCatalogo` com código, tipo, edição e rótulo, `pontos_prova` nas notas de corte, migration 005; specs 01, 02, 03, 04, 07 e 08 |
| 1.10 | 2026-10-02 | CR-010: spec 08 nova (notas de corte e carreira-alvo); contratos `GET /api/notas-corte`, `PUT`/`DELETE /api/conta/carreira-alvo` e `carreira_alvo` na sessão, erro `carreira_invalida`, migration 004; notas nas specs 01, 03, 04 e 07 |
| 1.9 | 2026-10-02 | CR-009: spec 03 v1.9 (rolagem ao topo a cada mudança de caminho, extras E4/E6/E7 do início, círculo de um algarismo, marcas do painel abaixo da legenda) e spec 04 v1.6 (círculo de um algarismo no resultado). Nenhum contrato da API muda |
| 1.8 | 2026-10-01 | CR-008: identidade "Papel & Caneta" — spec 03 v1.8 (tokens, fontes, marca, motivos, início com conta), spec 04 v1.5 (resultado e revisão) e spec 07 v1.4 (apresentação). Nenhum contrato da API muda |
| 1.7 | 2026-10-01 | CR-007: `GET /api/vitrine` pública (emenda à D2 do CR-006); spec 07 v1.3 (§9: vitrine e apresentação) e spec 03 v1.7 (menu do cabeçalho no celular, barra do topo da resolução opaca) |
| 1.6 | 2026-10-01 | CR-006: login obrigatório — coluna Acesso nos contratos, erro `site_indisponivel`, `SessaoResponse.acesso`; spec 07 v1.2 (§8), notas de acesso nas specs 02, 03, 04 e 05 |
| 1.5 | 2026-10-01 | CR-005: spec 07 nova (contas e histórico sincronizado); contratos com sessão e Origin, erros `login_indisponivel`/`nao_autenticado`/`origem_invalida`, `Cache-Control: no-store`, migration 003; specs 03 v1.5, 04 v1.3 e 06 v1.1 |
| 1.4 | 2026-09-30 | CR-004: spec 06 nova (assuntos e desempenho); spec 01 v1.1 (`assunto`, V11, taxonomia, `assuntos`), spec 02 v1.1 (assuntos no catálogo), spec 03 v1.4 (rota `/desempenho`), spec 04 v1.2 (correção por assunto, "Ver por assunto") |
| 1.3 | 2026-09-30 | CR-003: spec 04 v1.1 (ordem do resultado, `FolhaCorrigida` em grade/bolhas, revisão uma por vez) e spec 03 v1.3 (banner do início, "Provas na base", figura ajustada à tela) |
| 1.2 | 2026-09-30 | CR-002: spec 03 v1.2 — tokens de contraste (`optico-texto`, `borda-campo`, `acerto`) e título por rota |
| 1.1 | 2026-09-30 | CR-001: spec 03 v1.1 — resolução em modo foco, barra inferior fixa, folha em colunas (desktop) e em painel (celular), pausa que esconde a questão |
