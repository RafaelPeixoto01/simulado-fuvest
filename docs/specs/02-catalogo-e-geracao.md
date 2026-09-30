# Especificação Técnica — Catálogo e Geração de Simulados

**Versão:** 1.0
**Data:** 2026-09-29
**PRD Ref:** 01-PRD v1.0 (RF-008 a RF-012, US-001 a US-004, RN-002 a RN-005, RN-009, RN-013)
**Arquitetura Ref:** 02-ARCHITECTURE v1.0 (ADR-004, ADR-006)
**CR Ref:** —

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
    figura: str | None = None      # URL: "/figuras/2025/q002-1.webp"

class AlternativaPublica(BaseModel):
    texto: str | None = None
    figura: str | None = None      # URL

class QuestaoPublica(BaseModel):   # NUNCA contém resposta nem anulada
    id: str                        # "2025-002"
    ano: int
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
    ano: int
    versao: str
    total_questoes: int
    url_prova: str
    url_gabarito: str

class DisciplinaCatalogo(BaseModel):
    slug: Disciplina
    nome: str                      # "Matemática"
    total_questoes: int            # não anuladas, por disciplina principal

class CatalogoResponse(BaseModel):
    provas: list[ProvaCatalogo]            # ano decrescente
    disciplinas: list[DisciplinaCatalogo]  # ordem alfabética do nome
    total_questoes: int                    # não anuladas
    distribuicao_completa: dict[Disciplina, int]  # RN-003; soma 90; {} se não houver provas
    completa_disponivel: bool              # total_questoes >= 90

# Request — união discriminada por "modo"
class GerarCompleta(BaseModel):
    modo: Literal["completa"]
    semente: int | None = None

class GerarPersonalizado(BaseModel):
    modo: Literal["personalizado"]
    disciplinas: list[Disciplina]          # min 1, sem duplicatas
    ano_inicio: int | None = None
    ano_fim: int | None = None
    quantidade: int                        # 1..90
    cronometro: bool = True
    semente: int | None = None

class GerarAno(BaseModel):
    modo: Literal["ano"]
    ano: int

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

**Distribuição da prova completa (RN-003)** — `services/catalogo.py`:
1. Para cada prova publicada, contar as questões por disciplina principal (todas as 90, inclusive as anuladas, pois representam o formato real da prova).
2. `media[d] = soma das contagens / número de provas`.
3. Maior resto: `alvo[d] = floor(media[d])`; distribuir as unidades que faltam para 90 pelos maiores restos fracionários (empate → slug em ordem alfabética).

**Sorteio (`services/geracao.py`)** — `rng = random.Random(semente)`; semente ausente → `secrets.randbelow(2**31)`. Toda consulta ao banco é ordenada por `id` antes do sorteio (determinismo).

- **completa:**
  1. Se `total não anuladas < 90` → 409 `questoes_insuficientes`.
  2. Para cada disciplina, sortear `min(alvo[d], disponíveis[d])` questões não anuladas.
  3. Déficit (disciplina sem questões suficientes) → completar sorteando do restante das questões não anuladas ainda não escolhidas.
  4. Ordenar conforme RN-005 (abaixo). Tempo 18000 s, `pausavel=false`.
- **personalizado:**
  1. Validar `ano_inicio ≤ ano_fim` (422).
  2. Filtro: não anulada; `disciplina ∈ disciplinas` **ou** alguma secundária ∈ disciplinas; ano no intervalo (limites inclusivos, ausentes = sem limite).
  3. Se `disponiveis < quantidade` → 409 `questoes_insuficientes` com `disponiveis`.
  4. Sortear `quantidade`; ordenar (RN-005). `cronometro=true` → `tempo_limite_s = quantidade × 200` e `pausavel=true`; senão `null`.
- **ano:** prova publicada do ano, senão 404. Todas as 90 na ordem de `numero`, **inclusive as anuladas** (RN-002). Tempo 18000 s, `pausavel=false`. Não há sorteio (a semente é ecoada).
- **treino:** filtro igual ao personalizado (`disciplinas` vazio = todas), excluindo os ids de `excluir`. Devolve até 20 questões na ordem de RN-005; `disponiveis = 0` → lista vazia (não é erro). `tempo_limite_s=null`.

**Ordenação RN-005:** agrupar as questões escolhidas por `texto_base_id` (cada grupo em ordem de `(ano, numero)`); cada questão sem texto-base é um grupo unitário; embaralhar os grupos com o `rng` e concatenar.

**Tempos (RN-009):** `TEMPO_PROVA_S = 18000`; `TEMPO_POR_QUESTAO_S = 200` (18000 / 90).

**Contador:** após gerar com sucesso, `estatisticas_geracao[(hoje UTC, modo)] += 1`. No `treino`, só conta quando `excluir` está vazio (início de sessão). Falha no contador **não** falha a geração (log e segue).

**Serialização:** figuras viram URL `/figuras/{ano}/{arquivo}`; `textos_base` inclui só os ids referenciados pelas questões da resposta.

### 2.4 API Endpoints

**GET /api/catalogo**
```
Auth: não
Response 200: CatalogoResponse
```

**POST /api/simulados**
```
Auth: não | Rate limit: 30/minuto por IP
Body: GerarCompleta | GerarPersonalizado | GerarAno | GerarTreino (discriminado por "modo")
Response 200: SimuladoResponse
Erros:
- 404: {"detail": {"codigo": "prova_nao_encontrada", "mensagem": "..."}}             (modo ano)
- 409: {"detail": {"codigo": "questoes_insuficientes", "mensagem": "...", "disponiveis": n}}
- 422: validação (modo desconhecido, quantidade fora de 1–90, disciplina inválida, ano_inicio > ano_fim)
- 429: limite excedido
```

**GET /api/questoes?ids=2025-001,2025-002**
```
Auth: não
Query: ids — 1 a 90 ids separados por vírgula, cada um no formato ^\d{4}-\d{3}$
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
| ids (GET) | 1–90, formato `AAAA-NNN` | "Informe de 1 a 90 ids válidos" |

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
| 2 | Só 1 prova com 2 anuladas (88 válidas) | `completa_disponivel=false`; completa → 409 com `disponiveis=88` |
| 3 | Disciplina com menos questões que o alvo da completa | Déficit coberto por outras disciplinas; total sempre 90 |
| 4 | Questão interdisciplinar (principal Geografia, secundária História) | Aparece no personalizado de História; conta como Geografia no catálogo e na distribuição |
| 5 | Personalizado pede 30, existem 12 | 409 com `disponiveis=12` |
| 6 | Treino com todas as questões do filtro já em `excluir` | 200 com lista vazia e `disponiveis=0` |
| 7 | Mesma semente, mesmos filtros e mesma base | Mesmo simulado (mesma ordem) |
| 8 | Duas questões do mesmo texto-base sorteadas | Aparecem consecutivas, em ordem de número |
| 9 | `GET /api/questoes` com id removido da base | Vai em `nao_encontradas`; as demais retornam |
| 10 | Campo extra no body | Ignorado |

---

## 6. Plano de Testes

| ID | Cenário | Método/Rota | Esperado |
|----|---------|-------------|----------|
| BT-001 | Catálogo com fixture de 2 provas | GET /api/catalogo | 200; contagens corretas; distribuição soma 90 |
| BT-002 | Distribuição com restos empatados | `catalogo.distribuicao` (unit) | Maior resto + desempate alfabético |
| BT-003 | Completa com base suficiente | POST /api/simulados | 200; 90 questões únicas, sem anuladas, sem `resposta` no JSON |
| BT-004 | Completa com base insuficiente | POST /api/simulados | 409 `questoes_insuficientes` |
| BT-005 | Personalizado com filtros | POST /api/simulados | Todas respeitam disciplina/intervalo; tempo = quantidade × 200 |
| BT-006 | Personalizado sem cronômetro | POST /api/simulados | `tempo_limite_s=null` |
| BT-007 | Personalizado insuficiente | POST /api/simulados | 409 com `disponiveis` |
| BT-008 | Modo ano existente / inexistente | POST /api/simulados | 200 com 90 questões em ordem (inclui anuladas) / 404 |
| BT-009 | Treino com `excluir` | POST /api/simulados | Nenhum id excluído retorna; máximo 20 |
| BT-010 | Semente fixa | `geracao` (unit) | Resultado idêntico em duas execuções |
| BT-011 | Agrupamento por texto-base | `geracao` (unit) | Questões do mesmo texto consecutivas |
| BT-012 | Validações 422 (quantidade 0, disciplina inválida, intervalo invertido) | POST /api/simulados | 422 |
| BT-013 | Rate limit | 31 POSTs em 1 min | 429 no 31º |
| BT-014 | Questões por ids (inclui inexistente e repetido) | GET /api/questoes | Ordem preservada; `nao_encontradas` correto |
| BT-015 | ids inválidos / > 90 | GET /api/questoes | 422 |
| BT-016 | Contador incrementa por modo; treino só sem `excluir` | `estatisticas` | Contagens corretas |
| BT-017 | Nenhuma resposta de geração/consulta contém `resposta` ou `anulada` | varre o JSON das rotas | Ausentes |

---

## 7. Checklist de Implementação

- [ ] Schemas
- [ ] Serviço de catálogo + distribuição
- [ ] Serviço de geração (4 modos, RN-005, tempos)
- [ ] Serialização pública (figura → URL)
- [ ] Routers + rate limit
- [ ] Contador de geração
- [ ] Testes BT-001 a BT-017
