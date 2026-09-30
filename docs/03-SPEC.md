# Especificação Técnica — Simulado Fuvest (Índice)

**Versão:** 1.1
**Data:** 2026-09-30
**PRD Ref:** 01-PRD v1.0
**Arquitetura Ref:** 02-ARCHITECTURE v1.0
**CR Ref:** CR-001

> Este arquivo é o **índice**. O detalhe de cada feature fica em `/docs/specs/`. Para trabalhar numa feature, abra só a spec dela.

---

## 1. Resumo

MVP do Simulado Fuvest: ingestão de provas da 1ª fase a partir dos PDFs oficiais, catálogo e geração de simulados em 4 modos, resolução com cronômetro e persistência local, correção com desempenho por disciplina, histórico local e reporte de erros.

### Specs por feature

| # | Spec | RFs | Resumo |
|---|------|-----|--------|
| 01 | [Ingestão de Provas](specs/01-ingestao.md) | RF-001–RF-006 | CLI do curador, pacote `prova.yaml`, validação V01–V10, sincronização repo → banco, família de layout 2025 |
| 02 | [Catálogo e Geração](specs/02-catalogo-e-geracao.md) | RF-008–RF-012 | `GET /api/catalogo`, `POST /api/simulados` (4 modos), `GET /api/questoes` |
| 03 | [Início, Configuração e Resolução](specs/03-resolucao.md) | RF-008–RF-016 | SPA: rotas, Home, configuração, resolução (modo foco, barra inferior, folha, pausa — CR-001), cronômetro, Treino, storage |
| 04 | [Correção, Resultado e Histórico](specs/04-correcao-resultado.md) | RF-017–RF-020 | `POST /api/correcoes`, resultado por disciplina, revisão, histórico local |
| 05 | [Reporte de Erro](specs/05-reportes.md) | RF-007, RF-021 | `POST /api/reportes`, modal, CLI de reportes |

---

## 2. Contratos da API (Visão Geral)

Nenhum endpoint exige autenticação (não há dados de usuário no servidor — ADR-004).

| Método | Path | Rate limit | Body | Resposta | Spec |
|--------|------|------------|------|----------|------|
| `GET` | `/api/health` | — | — | `{"status":"ok","provas":n}` | §3 abaixo |
| `GET` | `/api/catalogo` | — | — | `CatalogoResponse` | 02 |
| `POST` | `/api/simulados` | 30/min/IP | `Gerar*` (por `modo`) | `SimuladoResponse` | 02 |
| `GET` | `/api/questoes?ids=` | — | — | `QuestoesResponse` | 02 |
| `POST` | `/api/correcoes` | 120/min/IP | `CorrecaoRequest` | `CorrecaoResponse` | 04 |
| `POST` | `/api/reportes` | 10/hora/IP | `ReporteCreate` | `{id}` (201) | 05 |
| `GET` | `/figuras/{ano}/{arquivo}` | — | — | `image/webp` | §3 abaixo |
| `GET` | `/*` (demais) | — | — | `index.html` (SPA) | §3 abaixo |

**Formato de erro de domínio:** `{"detail": {"codigo": "<snake_case>", "mensagem": "<pt-BR>", ...extras}}`. Erros de validação usam o 422 padrão do FastAPI. Os códigos são `prova_nao_encontrada`, `questoes_insuficientes` e `questao_nao_encontrada`.

---

## 3. Aspectos Transversais

### 3.1 Aplicação (`app/main.py`)
- Routers sob `/api`; `GET /api/health` conta as provas sincronizadas.
- `ENVIRONMENT=production` desliga `/docs`, `/redoc` e `/openapi.json`, e não registra CORS. Em desenvolvimento, CORS só para `ALLOWED_ORIGINS`.
- Rate limit com slowapi (`app/rate_limit.py`), chave = IP do cliente (uvicorn com `--proxy-headers`). 429 com `{"detail": "Muitas requisições. Tente novamente em instantes."}`.

### 3.2 Figuras
- `GET /figuras/{ano}/{arquivo}`: `ano` com 4 dígitos; `arquivo` casando `^[a-z0-9-]+\.webp$`. Qualquer outro valor → 404, **antes** de tocar o disco, o que impede path traversal.
- Serve `DATA_DIR/{ano}/figuras/{arquivo}` com `Content-Type: image/webp` e `Cache-Control: public, max-age=86400`.
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

### 3.5 Migration inicial
`001_schema_inicial` cria `provas`, `textos_base`, `questoes`, `reportes` e `estatisticas_geracao` conforme `02-ARCHITECTURE.md` §4. Testada com `upgrade head` + `downgrade base`.

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

---

## 5. Changelog

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-09-29 | Criação: specs 01–05 do MVP |
| 1.1 | 2026-09-30 | CR-001: spec 03 v1.1 — resolução em modo foco, barra inferior fixa, folha em colunas (desktop) e em painel (celular), pausa que esconde a questão |
