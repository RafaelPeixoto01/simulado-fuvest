# Especificação Técnica — Catálogo e Geração de Simulados

**Versão:** 1.3
**Data:** 2026-10-03
**PRD Ref:** 01-PRD v4.0 (RF-008 a RF-012, US-001 a US-004, RN-002 a RN-005, RN-009, RN-013, RN-014)
**Arquitetura Ref:** 02-ARCHITECTURE v1.4 (ADR-004, ADR-006, ADR-009)
**CR Ref:** CR-004 (assuntos no catálogo; a geração não muda — `specs/06-assuntos-desempenho.md`), CR-006 (os três endpoints exigem sessão), CR-011 (formato de 80 questões, simulados oficiais e código da prova)

---

## 1. Resumo das Mudanças

Endpoints públicos que expõem o catálogo da base e geram simulados nos quatro modos, além da consulta de questões por ID (usada para retomar um simulado). A geração não guarda estado: devolve as questões **sem gabarito** e só incrementa o contador anônimo.

### Escopo desta Iteração
- `GET /api/catalogo`
- `POST /api/simulados` (modos `completa`, `personalizado`, `ano`, `treino`)
- `GET /api/questoes?ids=`
- Serviço de sorteio com semente (determinístico nos testes)
- Contador em `estatisticas_geracao`

---

## 2. Detalhamento Técnico

### 2.1 Arquivos

| Ação | Caminho | Descrição |
|------|---------|-----------|
| Criar | `backend/app/routers/catalogo.py` | `GET /api/catalogo` |
| Criar | `backend/app/routers/simulados.py` | `POST /api/simulados` (rate limit) |
| Criar | `backend/app/routers/questoes.py` | `GET /api/questoes` |
| Criar | `backend/app/services/catalogo.py` | Contagens e distribuição RN-003 |
| Criar | `backend/app/services/geracao.py` | Sorteio por modo, agrupamento RN-005, tempos RN-009 |
| Criar | `backend/app/services/estatisticas.py` | Upsert do contador |
| Criar | `backend/app/services/serializacao.py` | Questão/texto-base → formato público (figura → URL) |
| Modificar | `backend/app/schemas.py` | Schemas abaixo |
| Criar | `backend/tests/test_catalogo.py`, `test_geracao.py`, `test_api_simulados.py`, `test_api_questoes.py` | Testes |

### 2.2 Interfaces / Types

```python
class BlocoPublico(BaseModel):
    texto: str | None = None
    figura: str | None = None      # URL: "/figuras/2025/q002-1.webp", "/figuras/2027s1/q015-1.webp"

class AlternativaPublica(BaseModel):
    texto: str | None = None
    figura: str | None = None      # URL

class QuestaoPublica(BaseModel):   # NUNCA contém resposta nem anulada; nem assunto (RN-014)
    id: str                        # "2025-002", "2027s1-002" (CODIGO-NNN — CR-011)
    prova: str                     # código da prova: "2025", "2027s1" (CR-011)
    origem: str                    # "FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição" (RN-013, CR-011)
    ano: int                       # ano FUVEST de referência
    numero: int
    disciplina: Disciplina
    disciplinas_secundarias: list[Disciplina]
    texto_base_id: str | None
    enunciado: list[BlocoPublico]
    alternativas: dict[Letra, AlternativaPublica]

class TextoBasePublico(BaseModel):
    id: str                        # "2025-tb01"
    conteudo: list[BlocoPublico]

class ProvaCatalogo(BaseModel):
    codigo: str                    # "2025", "2027s1" (CR-011)
    ano: int                       # ano FUVEST de referência
    tipo: Literal["vestibular", "simulado"]
    edicao: int | None             # só no simulado oficial
    rotulo: str                    # "FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição"
    versao: str
    total_questoes: int
    url_prova: str
    url_gabarito: str

class AssuntoCatalogo(BaseModel):  # CR-004
    slug: str                      # "eletricidade"
    nome: str                      # "Eletricidade"
    total_questoes: int            # não anuladas

class DisciplinaCatalogo(BaseModel):
    slug: Disciplina
    nome: str                      # "Matemática"
    total_questoes: int            # não anuladas, por disciplina principal
    assuntos: list[AssuntoCatalogo]  # CR-004: ordem da taxonomia, inclusive com 0 questões; [] sem taxonomia

class CatalogoResponse(BaseModel):
    provas: list[ProvaCatalogo]            # ano decrescente; no mesmo ano, código decrescente (2027s2, 2027s1)
    disciplinas: list[DisciplinaCatalogo]  # ordem alfabética do nome
    total_questoes: int                    # não anuladas
    distribuicao_completa: dict[Disciplina, int]  # RN-003; soma 80 (CR-011); {} se não houver provas
    completa_disponivel: bool              # total_questoes >= 80

# Request — união discriminada por "modo"
class GerarCompleta(BaseModel):
    modo: Literal["completa"]
    semente: int | None = None

class GerarPersonalizado(BaseModel):
    modo: Literal["personalizado"]
    disciplinas: list[Disciplina]          # min 1, sem duplicatas
    ano_inicio: int | None = None
    ano_fim: int | None = None
    quantidade: int                        # 1..90 (não muda com o CR-011)
    cronometro: bool = True
    semente: int | None = None

class GerarAno(BaseModel):
    modo: Literal["ano"]
    prova: str                             # código ^\d{4}(s[1-9])?$ (CR-011). O pedido antigo
                                           # {"ano": 2025} (aba aberta no deploy) vira prova "2025"

class GerarTreino(BaseModel):
    modo: Literal["treino"]
    disciplinas: list[Disciplina] = []     # vazio = todas
    ano_inicio: int | None = None
    ano_fim: int | None = None
    excluir: list[str] = []                # ids já vistos na sessão (max 1000)
    semente: int | None = None

class SimuladoResponse(BaseModel):
    modo: str
    questoes: list[QuestaoPublica]
    textos_base: dict[str, TextoBasePublico]  # só os referenciados
    tempo_limite_s: int | None
    pausavel: bool
    disponiveis: int                       # questões que atendem aos filtros
    semente: int

class QuestoesResponse(BaseModel):
    questoes: list[QuestaoPublica]         # na ordem dos ids pedidos
    textos_base: dict[str, TextoBasePublico]
    nao_encontradas: list[str]
```

### 2.3 Lógica de Negócio

**Distribuição da prova completa (RN-003, CR-011)** — `services/catalogo.py`:
1. Para cada prova publicada (vestibulares e simulados oficiais), contar as questões por disciplina principal (todas, inclusive as anuladas, pois representam o formato real da prova) e dividir pelo total daquela prova (90 ou 80): a proporção de cada disciplina.
2. `media[d] = soma das proporções / número de provas × 80` (`TOTAL_PROVA_COMPLETA`, o formato da FUVEST 2027).
3. Maior resto: `alvo[d] = floor(media[d])`; distribuir as unidades que faltam para 80 pelos maiores restos fracionários (empate → slug em ordem alfabética). Frações exatas (`Fraction`), sem erro de arredondamento.

**Sorteio (`services/geracao.py`)** — `rng = random.Random(semente)`; semente ausente → `secrets.randbelow(2**31)`. Toda consulta ao banco é ordenada por `id` antes do sorteio (determinismo).

- **completa:**
  1. Se `total não anuladas < 80` → 409 `questoes_insuficientes`.
  2. Para cada disciplina, sortear `min(alvo[d], disponíveis[d])` questões não anuladas.
  3. Déficit (disciplina sem questões suficientes) → completar sorteando do restante das questões não anuladas ainda não escolhidas.
  4. Ordenar conforme RN-005 (abaixo). Tempo 18000 s, `pausavel=false`.
- **personalizado:**
  1. Validar `ano_inicio ≤ ano_fim` (422).
  2. Filtro: não anulada; `disciplina ∈ disciplinas` **ou** alguma secundária ∈ disciplinas; ano de referência da prova no intervalo (limites inclusivos, ausentes = sem limite; os simulados oficiais de 2027 entram em 2027 — CR-011, P4).
  3. Se `disponiveis < quantidade` → 409 `questoes_insuficientes` com `disponiveis`.
  4. Sortear `quantidade`; ordenar (RN-005). `cronometro=true` → `tempo_limite_s = quantidade × 225` e `pausavel=true`; senão `null`.
- **ano:** prova publicada com o código pedido (vestibular ou simulado oficial), senão 404. Todas as questões dela (90 de 2020 a 2026, 80 nos simulados e desde 2027 — D2 do CR-011) na ordem de `numero`, **inclusive as anuladas** (RN-002). Tempo 18000 s, `pausavel=false`. Não há sorteio (a semente é ecoada).
- **treino:** filtro igual ao personalizado (`disciplinas` vazio = todas), excluindo os ids de `excluir`. Devolve até 20 questões na ordem de RN-005; `disponiveis = 0` → lista vazia (não é erro). `tempo_limite_s=null`.

**Ordenação RN-005:** agrupar as questões escolhidas por `texto_base_id` (cada grupo em ordem de `(código da prova, numero)`); cada questão sem texto-base é um grupo unitário; embaralhar os grupos com o `rng` e concatenar.

**Tempos (RN-009):** `TEMPO_PROVA_S = 18000`; `TEMPO_POR_QUESTAO_S = 225` (18000 / 80, o formato da FUVEST 2027 — P3 do CR-011; era 200 = 18000 / 90).

**Contador:** após gerar com sucesso, `estatisticas_geracao[(hoje UTC, modo)] += 1`. No `treino`, só conta quando `excluir` está vazio (início de sessão). Falha no contador **não** falha a geração (log e segue).

**Serialização:** figuras viram URL `/figuras/{código}/{arquivo}`; `origem` vem do rótulo da prova (carregada junto com a questão: `contains_eager`/`joinedload`, sem consulta por prova); `textos_base` inclui só os ids referenciados pelas questões da resposta.

### 2.4 API Endpoints

**GET /api/catalogo**
```
Auth: sessão (CR-006, `specs/07` §8; 401 sem sessão, 503 em produção sem login configurado)
Response 200: CatalogoResponse
```

**POST /api/simulados**
```
Auth: sessão (CR-006, `specs/07` §8; 401 sem sessão, 503 em produção sem login configurado) | Rate limit: 30/minuto por IP
Body: GerarCompleta | GerarPersonalizado | GerarAno | GerarTreino (discriminado por "modo")
Response 200: SimuladoResponse
Erros:
- 404: {"detail": {"codigo": "prova_nao_encontrada", "mensagem": "..."}}             (modo ano)
- 409: {"detail": {"codigo": "questoes_insuficientes", "mensagem": "...", "disponiveis": n}}
- 422: validação (modo desconhecido, quantidade fora de 1–90, disciplina inválida, ano_inicio > ano_fim, código de prova fora do formato)
- 429: limite excedido
```

**GET /api/questoes?ids=2025-001,2025-002**
```
Auth: sessão (CR-006, `specs/07` §8; 401 sem sessão, 503 em produção sem login configurado)
Query: ids — 1 a 90 ids separados por vírgula, cada um no formato ^\d{4}(s[1-9])?-\d{3}$ (CR-011)
Response 200: QuestoesResponse (ids inexistentes em nao_encontradas; ids repetidos devolvidos uma vez)
Erros:
- 422: ids ausente, vazio, > 90 ou fora do formato
```

### 2.5 Validações

| Campo | Regra | Mensagem de Erro |
|-------|-------|------------------|
| modo | um dos 4 valores | (422 padrão) |
| disciplinas | slugs válidos; personalizado: ≥ 1; sem duplicatas | "Disciplina inválida" / "Escolha ao menos uma disciplina" |
| quantidade | 1–90 | "Quantidade deve estar entre 1 e 90" |
| ano_inicio/ano_fim | 1977–2100; início ≤ fim | "Intervalo de anos inválido" |
| excluir | ≤ 1000 ids no formato | "Lista de exclusão inválida" |
| ids (GET) | 1–90, formato `CODIGO-NNN` (`2025-037`, `2027s1-037`) | "Informe de 1 a 90 ids válidos" |
| prova (modo ano) | `^\d{4}(s[1-9])?$` (CR-011) | (422 padrão) |

---

## 3. Componentes de UI

Especificados em `specs/03-resolucao.md` (Home, configuração dos modos).

---

## 4. Fluxos Críticos

Ver o diagrama "Fluxo de um simulado" em `02-ARCHITECTURE.md` §2.

---

## 5. Casos de Borda

| # | Cenário | Comportamento Esperado |
|---|---------|------------------------|
| 1 | Base vazia | Catálogo com listas vazias, `distribuicao_completa={}`, `completa_disponivel=false`; completa → 409 |
| 2 | Base com 79 questões válidas | `completa_disponivel=false`; completa → 409 com `disponiveis=79` |
| 3 | Disciplina com menos questões que o alvo da completa | Déficit coberto por outras disciplinas; total sempre 80 |
| 4 | Questão interdisciplinar (principal Geografia, secundária História) | Aparece no personalizado de História; conta como Geografia no catálogo e na distribuição |
| 5 | Personalizado pede 30, existem 12 | 409 com `disponiveis=12` |
| 6 | Treino com todas as questões do filtro já em `excluir` | 200 com lista vazia e `disponiveis=0` |
| 7 | Mesma semente, mesmos filtros e mesma base | Mesmo simulado (mesma ordem) |
| 8 | Duas questões do mesmo texto-base sorteadas | Aparecem consecutivas, em ordem de número |
| 9 | `GET /api/questoes` com id removido da base | Vai em `nao_encontradas`; as demais retornam |
| 10 | Campo extra no body | Ignorado |
| 11 | Simulado oficial e vestibular do mesmo ano (CR-011) | Códigos distintos (`2027s1`, `2027`); o filtro de anos do Personalizado/Treino inclui os dois |
| 12 | Pedido antigo `{"modo": "ano", "ano": 2025}` | Tratado como `prova: "2025"` |

---

## 6. Plano de Testes

| ID | Cenário | Método/Rota | Esperado |
|----|---------|-------------|----------|
| BT-001 | Catálogo com fixture de 2 provas | GET /api/catalogo | 200; contagens corretas; distribuição soma 80 (CR-011) |
| BT-002 | Distribuição com restos empatados | `catalogo.distribuicao` (unit) | Maior resto + desempate alfabético |
| BT-025 | Catálogo com assuntos (CR-004) | GET /api/catalogo | Ver `specs/06` §6 |
| BT-003 | Completa com base suficiente | POST /api/simulados | 200; 80 questões únicas, sem anuladas, sem `resposta` no JSON (CR-011) |
| BT-004 | Completa com base insuficiente | POST /api/simulados | 409 `questoes_insuficientes` |
| BT-005 | Personalizado com filtros | POST /api/simulados | Todas respeitam disciplina/intervalo; tempo = quantidade × 225 (CR-011) |
| BT-006 | Personalizado sem cronômetro | POST /api/simulados | `tempo_limite_s=null` |
| BT-007 | Personalizado insuficiente | POST /api/simulados | 409 com `disponiveis` |
| BT-008 | Modo ano existente / inexistente | POST /api/simulados | 200 com as questões da prova em ordem (inclui anuladas) / 404 |
| BT-009 | Treino com `excluir` | POST /api/simulados | Nenhum id excluído retorna; máximo 20 |
| BT-010 | Semente fixa | `geracao` (unit) | Resultado idêntico em duas execuções |
| BT-011 | Agrupamento por texto-base | `geracao` (unit) | Questões do mesmo texto consecutivas |
| BT-012 | Validações 422 (quantidade 0, disciplina inválida, intervalo invertido) | POST /api/simulados | 422 |
| BT-013 | Rate limit | 31 POSTs em 1 min | 429 no 31º |
| BT-014 | Questões por ids (inclui inexistente e repetido) | GET /api/questoes | Ordem preservada; `nao_encontradas` correto |
| BT-015 | ids inválidos / > 90 | GET /api/questoes | 422 |
| BT-016 | Contador incrementa por modo; treino só sem `excluir` | `estatisticas` | Contagens corretas |
| BT-017 | Nenhuma resposta de geração/consulta contém `resposta` ou `anulada` | varre o JSON das rotas | Ausentes |
| BT-088 | Catálogo com simulado oficial (CR-011) | GET /api/catalogo | Código, tipo, edição e rótulo; ordem por ano e código; distribuição soma 80 |
| BT-089 | Distribuição com provas de 90 e de 80 (CR-011) | `catalogo.distribuicao_completa` (unit) | Média das proporções × 80 |
| BT-090 | Completa com 80 (CR-011) | `geracao` | 80 únicas, sem anuladas, na distribuição; mistura vestibulares e simulado |
| BT-091 | Modo ano pelo código (CR-011) | `geracao` / POST /api/simulados | Simulado com 80, vestibular com 90; código inválido → 422; inexistente → 404; pedido antigo com `ano` aceito |
| BT-092 | Ids `CODIGO-NNN` (CR-011) | questões, correção, reportes, treino, histórico | Aceitos; outros formatos → 422 |

---

## 7. Checklist de Implementação

- [ ] Schemas
- [ ] Serviço de catálogo + distribuição
- [ ] Serviço de geração (4 modos, RN-005, tempos)
- [ ] Serialização pública (figura → URL)
- [ ] Routers + rate limit
- [ ] Contador de geração
- [ ] Testes BT-001 a BT-017
