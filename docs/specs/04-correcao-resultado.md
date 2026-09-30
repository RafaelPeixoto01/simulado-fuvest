# Especificação Técnica — Correção, Resultado e Histórico Local

**Versão:** 1.0
**Data:** 2026-09-29
**PRD Ref:** 01-PRD v1.0 (RF-017 a RF-020, US-006, US-007, RN-002, RN-008, RN-012)
**Arquitetura Ref:** 02-ARCHITECTURE v1.0 (ADR-004, ADR-005)
**CR Ref:** —

---

## 1. Resumo das Mudanças

Endpoint de correção sem estado (usado ao finalizar um simulado e a cada resposta no Treino), tela de resultado com desempenho por disciplina e revisão questão a questão, e histórico dos simulados concluídos guardado no `localStorage`.

### Escopo desta Iteração
- `POST /api/correcoes`
- `ResultadoPage` (`/resultado/:id`) e `HistoricoPage` (`/historico`)
- `historicoStorage`

---

## 2. Detalhamento Técnico

### 2.1 Arquivos

| Ação | Caminho | Descrição |
|------|---------|-----------|
| Criar | `backend/app/services/correcao.py` | Regra de nota RN-002/RN-008 e agregação por disciplina |
| Criar | `backend/app/routers/correcoes.py` | `POST /api/correcoes` |
| Modificar | `backend/app/schemas.py` | Schemas abaixo |
| Criar | `backend/tests/test_correcao.py`, `test_api_correcoes.py` | Testes |
| Criar | `frontend/src/storage/historicoStorage.ts` | Chave `simulado-fuvest:v1:historico` |
| Criar | `frontend/src/pages/ResultadoPage.tsx`, `HistoricoPage.tsx` | Telas |
| Criar | `frontend/src/components/ResumoResultado.tsx`, `DesempenhoDisciplinas.tsx`, `RevisaoQuestoes.tsx` | Componentes |

### 2.2 Interfaces / Types

```python
class RespostaItem(BaseModel):
    questao_id: str                # ^\d{4}-\d{3}$
    resposta: Letra | None         # null = em branco

class CorrecaoRequest(BaseModel):
    respostas: list[RespostaItem]  # 1..90, sem questao_id repetido

class ItemCorrigido(BaseModel):
    questao_id: str
    resposta: Letra | None
    correta: Letra | None          # null só quando anulada
    anulada: bool
    acertou: bool
    disciplina: Disciplina

class DesempenhoDisciplina(BaseModel):
    disciplina: Disciplina
    total: int
    acertos: int
    percentual: float              # 1 casa decimal

class CorrecaoResponse(BaseModel):
    itens: list[ItemCorrigido]     # mesma ordem do request, sem as ignoradas
    total: int
    acertos: int
    percentual: float
    por_disciplina: list[DesempenhoDisciplina]  # do pior para o melhor percentual; empate -> slug
    ignoradas: list[str]           # ids que não existem mais na base
```

```typescript
interface HistoricoEntry {
  versao: 1;
  id: string;                       // = id do SimuladoEmAndamento
  modo: 'completa' | 'personalizado' | 'ano';
  descricao: string;
  iniciadoEm: number;
  finalizadoEm: number;
  tempoGastoMs: number;             // decorridoMs no momento da finalização
  tempoLimiteS: number | null;
  finalizadoPorTempo: boolean;
  questaoIds: string[];
  resultado: CorrecaoResponse;
}
```

### 2.3 Lógica de Negócio

**Corrigir (`services/correcao.py`):**
1. Buscar as questões dos ids pedidos (uma consulta).
2. Ids inexistentes → `ignoradas` (não entram em `itens` nem nos totais).
3. Para cada item: `anulada` → `acertou = true` (RN-002); senão `acertou = resposta == correta` (em branco → false, RN-008).
4. `total = len(itens)`, `acertos = soma`, `percentual = round(100 × acertos / total, 1)` (`total = 0` → 0.0).
5. `por_disciplina`: agrupar pela disciplina principal; ordenar por percentual crescente, empate pelo slug.

**Finalizar no frontend** (manual ou por tempo):
1. `corrigir({respostas: questaoIds.map(id => ({questao_id: id, resposta: respostas[id] ?? null}))})`.
2. Montar o `HistoricoEntry` (`tempoGastoMs` = `decorridoMs` limitado a `tempoLimiteS*1000`).
3. Gravar no histórico (mais recente primeiro; máximo 50; ao passar, remove o mais antigo).
4. `DESCARTAR` o simulado em andamento → navegar para `/resultado/{id}`.
5. Se o histórico não puder ser gravado (storage indisponível), o resultado é passado pelo state da navegação e a página avisa que ele não ficará salvo.

**ResultadoPage (`/resultado/:id`):**
- Lê a entrada do histórico (ou do state da navegação). Não encontrada → "Resultado não encontrado neste navegador" + link para `/historico`.
- `ResumoResultado`: nota `acertos/total`, percentual, tempo gasto, tempo médio por questão (`tempoGastoMs / total`), selo "Finalizado por tempo" quando for o caso, aviso de `ignoradas`.
- `DesempenhoDisciplinas`: barras horizontais por disciplina (da pior para a melhor), com `acertos/total` e o percentual em texto.
- `RevisaoQuestoes`: filtros Todas / Erradas / Em branco / por disciplina. Cada questão mostra o conteúdo (via `GET /api/questoes?ids=` com o cache do Query), a resposta do estudante, a correta e o selo "Anulada — ponto atribuído a todos". Questão que não existe mais na base → "Questão removida da base".
- Ações: "Novo simulado" (Home), "Ver histórico".

**HistoricoPage (`/historico`):**
- Aviso fixo: "O histórico fica só neste navegador. Trocar de dispositivo ou limpar os dados do navegador apaga os registros."
- Lista (mais recente primeiro): data/hora (pt-BR), descrição, nota e percentual; clique → `/resultado/:id`.
- "Limpar histórico" com confirmação. Vazio → "Nenhum simulado concluído ainda" + link para a Home.
- Treino **não** entra no histórico (PRD RF-012).

### 2.4 API Endpoints

**POST /api/correcoes**
```
Auth: não | Rate limit: 120/minuto por IP (o Treino chama 1× por questão)
Body: CorrecaoRequest
Response 200: CorrecaoResponse
Erros:
- 422: lista vazia ou > 90, questao_id fora do formato, id repetido, letra inválida
- 429: limite excedido
```

### 2.5 Validações

| Campo | Regra | Mensagem de Erro |
|-------|-------|------------------|
| respostas | 1–90 itens | "Envie de 1 a 90 respostas" |
| questao_id | `^\d{4}-\d{3}$`, sem repetição | "Id de questão inválido" / "Questão repetida" |
| resposta | `A`–`E` ou null | (422 padrão) |

---

## 3. Componentes de UI

### Componente: DesempenhoDisciplinas

| Prop | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| dados | `DesempenhoDisciplina[]` | Sim | — | Já ordenado pela API |

Barras em CSS (sem biblioteca de gráficos); valor sempre também em texto (acessibilidade); cor não é o único indicador.

### Componente: RevisaoQuestoes

| Prop | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| itens | `ItemCorrigido[]` | Sim | — | |
| questaoIds | `string[]` | Sim | — | Para buscar o conteúdo |

Reusa `QuestaoView` + `Alternativas` em modo `correcao`. Lista paginada de 10 em 10 para não renderizar 90 questões com figuras de uma vez.

---

## 4. Fluxos Críticos

Ver `specs/03-resolucao.md` §4 e o fluxo de simulado em `02-ARCHITECTURE.md` §2.

---

## 5. Casos de Borda

| # | Cenário | Comportamento Esperado |
|---|---------|------------------------|
| 1 | Todas em branco | Nota 0/n; todas aparecem no filtro "Em branco" |
| 2 | Prova de um ano com anulada respondida errado | Conta como acerto; selo "Anulada" |
| 3 | Questão removida da base antes da correção | Vai em `ignoradas`; total reduzido; aviso no resultado |
| 4 | Histórico com 50 entradas + nova | Remove a mais antiga |
| 5 | Abrir `/resultado/:id` em outro navegador | "Resultado não encontrado neste navegador" |
| 6 | Treino corrigindo 1 item | Mesmo endpoint; resposta com 1 item |

---

## 6. Plano de Testes

| ID | Cenário | Método/Rota | Esperado |
|----|---------|-------------|----------|
| BT-020 | Correção mista (certa, errada, branco, anulada) | `correcao` (unit) | Acertos e percentual corretos |
| BT-021 | Agregação e ordenação por disciplina | `correcao` (unit) | Pior → melhor; empate por slug |
| BT-022 | Id inexistente | POST /api/correcoes | 200 com `ignoradas` |
| BT-023 | Lista vazia / 91 itens / id repetido / formato inválido | POST /api/correcoes | 422 |
| BT-024 | Ordem dos itens igual à do request | POST /api/correcoes | Mesma ordem |
| UT-020 | Histórico: inserir, limite 50, limpar, storage indisponível | `historicoStorage` | Comportamento esperado |
| UT-021 | Tempo médio e formatação | `ResumoResultado` | Valores corretos |
| FT-010 | Finalizar → resultado → filtro "Erradas" → histórico | E2E (Playwright MCP) | Dados consistentes |

---

## 7. Checklist de Implementação

- [ ] Schemas + serviço de correção + router com rate limit
- [ ] `historicoStorage`
- [ ] Fluxo de finalização no frontend (manual + por tempo)
- [ ] ResultadoPage (resumo, disciplinas, revisão)
- [ ] HistoricoPage
- [ ] Testes BT-020 a BT-024, UT-020, UT-021 + validação FT-010
