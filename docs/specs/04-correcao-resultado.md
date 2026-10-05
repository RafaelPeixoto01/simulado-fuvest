# Especificação Técnica — Correção, Resultado e Histórico Local

**Versão:** 1.8
**Data:** 2026-10-03
**PRD Ref:** 01-PRD v4.0 (RF-017 a RF-020, US-006, US-007, US-011, RN-002, RN-008, RN-012, RN-014, RN-016)
**Arquitetura Ref:** 02-ARCHITECTURE v1.4 (ADR-004, ADR-005, ADR-009)
**CR Ref:** CR-003 (resultado: ordem, folha corrigida clicável e revisão uma questão por vez), CR-004 (desempenho por assunto; painel em `specs/06-assuntos-desempenho.md`), CR-005 (histórico com conta: envio ao finalizar, avisos, limpar na conta; detalhes em `specs/07-contas-sincronizacao.md`), CR-006 (correção exige sessão; resultado e histórico atrás do login), CR-008 (identidade: círculo nos acertos, números em Fraunces, número da questão na bolinha), CR-009 (círculo de um algarismo), CR-010 (bloco "Notas de corte" no resultado — `specs/08-notas-de-corte.md`), CR-011 (comparação com o corte em simulados de qualquer tamanho; ids `CODIGO-NNN`)

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
| Modificar (CR-003) | `frontend/src/components/resultado/FolhaCorrigida.tsx`, `RevisaoQuestoes.tsx`, `pages/ResultadoPage.tsx` | Folha clicável em dois formatos; revisão uma questão por vez |
| Criar (CR-003) | `frontend/src/components/resultado/revisao.ts` | Filtros da revisão e escolha da questão (funções puras) |
| Criar (CR-003) | `frontend/src/components/CabecalhoLetras.tsx`, `frontend/src/utils/folha.ts` | Cabeçalho A–E e colunas das folhas ópticas (resolução e resultado) |

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
    assunto: str | None            # CR-004: slug; null só se a questão não tiver assunto no banco

class DesempenhoAssunto(BaseModel):  # CR-004
    assunto: str                   # slug
    nome: str                      # da taxonomia (o slug se não estiver nela)
    total: int
    acertos: int
    percentual: float

class DesempenhoDisciplina(BaseModel):
    disciplina: Disciplina
    total: int
    acertos: int
    percentual: float              # 1 casa decimal
    assuntos: list[DesempenhoAssunto]  # CR-004: do pior para o melhor; empate -> slug; itens sem assunto ficam fora

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
  resultado: CorrecaoResponse;     // CR-004: `assunto`/`assuntos` opcionais no tipo (resultados antigos não têm); continua versao 1
}
```

### 2.3 Lógica de Negócio

**Corrigir (`services/correcao.py`):**
1. Buscar as questões dos ids pedidos (uma consulta).
2. Ids inexistentes → `ignoradas` (não entram em `itens` nem nos totais).
3. Para cada item: `anulada` → `acertou = true` (RN-002); senão `acertou = resposta == correta` (em branco → false, RN-008).
4. `total = len(itens)`, `acertos = soma`, `percentual = round(100 × acertos / total, 1)` (`total = 0` → 0.0).
5. `por_disciplina`: agrupar pela disciplina principal; ordenar por percentual crescente, empate pelo slug.
6. `assuntos` de cada disciplina (CR-004): agrupar os itens da disciplina pelo assunto, com o nome da taxonomia, na mesma ordenação (detalhe em `specs/06` §2.3).

**Finalizar no frontend** (manual ou por tempo):
1. `corrigir({respostas: questaoIds.map(id => ({questao_id: id, resposta: respostas[id] ?? null}))})`.
2. Montar o `HistoricoEntry` (`tempoGastoMs` = `decorridoMs` limitado a `tempoLimiteS*1000`).
3. Gravar no histórico (mais recente primeiro; máximo 50; ao passar, remove o mais antigo). Depois, `invalidateQueries(['historico'])`: com conta, a entrada é enviada ao servidor na sincronização seguinte (`specs/07` §2.4, CR-005).
4. `DESCARTAR` o simulado em andamento → navegar para `/resultado/{id}`.
5. Se o histórico não puder ser gravado (storage indisponível), o resultado é passado pelo state da navegação e a página avisa que ele não ficará salvo.

**ResultadoPage (`/resultado/:id`):**
- Lê a entrada do state da navegação ou de `useHistorico` (CR-005). Não encontrada enquanto o histórico sincroniza → `Carregando`; depois → "Resultado não encontrado neste navegador" + link para `/historico` (sem conta e com login disponível, sugere entrar com o Google — `specs/07` §3).
- `ResumoResultado`: nota `acertos/total`, percentual, tempo gasto, tempo médio por questão (`tempoGastoMs / total`), selo "Finalizado por tempo" quando for o caso, aviso de `ignoradas`. CR-008: o número de acertos no `h1` ganha o círculo de caneta (`CirculoCaneta`, `aria-hidden`; o nome do título não muda) e os três números ficam em `font-titulo`. CR-009: com um algarismo (0 a 9 acertos), o círculo ganha mais folga e margem; com dois, fica como antes. O `CirculoCaneta` decide pelo número (`specs/03` §3).
- Ações: "Novo simulado" (Home), "Ver histórico".
- **Ordem (CR-003, P1.7):** resumo → (CR-010) `ComparacaoCorte`, só na Prova completa e na Prova de um ano, de qualquer tamanho desde o CR-011, com a nota convertida para a escala da lista quando os tamanhos diferem (`specs/08` §3) → `DesempenhoDisciplinas` → `FolhaCorrigida` (só no celular) → `RevisaoQuestoes`. No desktop (≥ 1024 px), a `FolhaCorrigida` fica num cartão fixo na barra lateral. O conteúdo tem chave pelo `id` do resultado: trocar de resultado zera a revisão.
- `DesempenhoDisciplinas`: barras horizontais por disciplina (da pior para a melhor), com `acertos/total` e o percentual em texto; em cada disciplina, "Ver por assunto" recolhido (CR-004).
- **Estado da revisão (D6):** `{indice, filtro, disciplina}` fica na página e é compartilhado pela folha e pela revisão (`revisao.ts`). Tocar numa questão da folha abre aquela questão; se ela não passa nos filtros atuais, eles voltam para "Todas". Trocar os filtros mantém a questão se ela continua visível, senão abre a primeira da lista. Navegar (folha, Anterior/Próxima) rola até a revisão (`scrollIntoView`) e foca o título da questão; trocar de filtro não, para o foco continuar no filtro.

**HistoricoPage (`/historico`):**
- Fonte: `useHistorico` (CR-005): o `localStorage` sem conta ou o espelho da conta.
- Aviso sem conta: "O histórico fica só neste navegador. Trocar de dispositivo ou limpar os dados do navegador apaga os registros." (+ convite para entrar com o Google, se o login estiver disponível). Com conta: o histórico está na conta e aparece em todos os dispositivos (`specs/07` §3).
- Lista (mais recente primeiro): data/hora (pt-BR), descrição, nota e percentual; clique → `/resultado/:id`.
- "Limpar histórico" com confirmação; com conta, apaga na conta, em todos os dispositivos, e a confirmação diz isso (CR-005). Vazio → "Nenhum simulado concluído ainda" + link para a Home.
- Treino **não** entra no histórico (PRD RF-012).
- Link "Ver meu desempenho" (`/desempenho`, `specs/06`) acima da lista quando ela não está vazia (CR-004).

### 2.4 API Endpoints

**POST /api/correcoes**
```
Auth: sessão (CR-006, `specs/07` §8; 401 sem sessão, 503 em produção sem login configurado) | Rate limit: 120/minuto por IP (o Treino chama 1× por questão)
Body: CorrecaoRequest
Response 200: CorrecaoResponse
Erros:
- 422: lista vazia ou > 90, questao_id fora do formato `CODIGO-NNN` (`2025-037`, `2027s1-037` — CR-011), id repetido, letra inválida
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

Barras em CSS (sem biblioteca de gráficos); valor sempre também em texto (acessibilidade); cor não é o único indicador. CR-004: disciplina com `assuntos` ganha um `<details>` recolhido "Ver por assunto" com uma linha por assunto (nome e "a de t (p%)"); resultado antigo, sem `assuntos`, fica como antes (`specs/06` §3).

### Componente: RevisaoQuestoes (CR-003, D6)

| Prop | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| itens | `ItemCorrigido[]` | Sim | — | |
| questaoIds | `string[]` | Sim | — | Para buscar o conteúdo |
| estado | `EstadoRevisao` | Sim | — | Questão aberta e filtros (controlado pela página) |
| onFiltros | `(filtro, disciplina) => void` | Sim | — | |
| onIr | `(indice) => void` | Sim | — | Anterior/Próxima dentro da lista filtrada |
| pedidoDeFoco | `number` | Sim | — | Incrementado a cada navegação: rola até a seção e foca o título |

Uma questão por vez. Filtros Todas / Erradas / Em branco (rádios) e Disciplina (`select`). Reusa `QuestaoView` + `Alternativas` em modo `correcao`, com o título em `h3` (o número na bolinha, CR-008) e, no cabeçalho, o selo ("Você acertou: X", "Você marcou X · correta Y", "Em branco · correta Y", "Anulada: ponto para todos") e a posição no filtro ("i de M questões/erradas/em branco"). Anterior/Próxima com 48 px. Filtro vazio → "Nenhuma questão com esse filtro". Questão sem conteúdo na base: sem item corrigido → "removida da base e não entrou na nota"; com item → "O conteúdo desta questão não está mais disponível na base; a correção acima continua valendo".

### Componente: FolhaCorrigida (CR-003, D5)

| Prop | Tipo | Obrigatório | Default | Descrição |
|------|------|-------------|---------|-----------|
| questaoIds, itens | | Sim | — | |
| atual | `number` | Sim | — | Questão aberta na revisão |
| onIr | `(indice) => void` | Sim | — | Abre a questão na revisão |
| formato | `'grade' \| 'bolhas'` | Sim | — | Celular / desktop |

Título "Folha corrigida", instrução ("Toque/Clique numa questão para revisá-la.") e selos: ✓ acertos (incluem as anuladas, como a nota), ✗ erros, – em branco e, se houver, "N anulada(s) (conta como acerto)".
- **`grade`** (celular): 6 colunas de botões de 50 px com o número e a marca (✓ letra, ✗ letra marcada, "–" em branco, "anul."), cores de acerto, erro e alerta; em branco com borda tracejada; a questão aberta com contorno azul.
- **`bolhas`** (desktop): colunas como na folha da resolução (3 acima de 40 questões), cabeçalho A–E (`CabecalhoLetras`), bolinhas sem letra (P2.2): marcada preenchida em verde (acertou) ou vermelho (errou), âmbar se anulada; correta contornada em verde quando o estudante errou ou deixou em branco; ponto laranja = anulada; removida com opacidade reduzida. Linhas clicáveis; legenda.

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
| 5 | Abrir `/resultado/:id` em outro navegador | Sem conta: "Resultado não encontrado neste navegador". Com conta: aparece depois da sincronização (CR-005) |
| 6 | Treino corrigindo 1 item | Mesmo endpoint; resposta com 1 item |
| 7 | Questão escolhida na folha fora do filtro atual | Filtros voltam para "Todas" e a questão abre (CR-003) |
| 8 | Filtro sem nenhuma questão | "Nenhuma questão com esse filtro"; a questão aberta não muda (CR-003) |
| 9 | Trocar de `/resultado/A` para `/resultado/B` sem desmontar a rota | A revisão volta à questão 1, sem filtros (CR-003) |

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
| UT-051 | Círculo de caneta nos acertos, `aria-hidden`, com o `h1` "Você acertou N de M questões" inteiro | `ResumoResultado` | Nome acessível igual (CR-008; também na apresentação e no início) |
| FT-010 | Finalizar → resultado → filtro "Erradas" → histórico | E2E (Playwright MCP) | Dados consistentes |
| UT-022 | `revisao.ts`: situação, filtros, abrir pela folha, trocar filtros | unit | Estados esperados (CR-003) |
| UT-023 | `FolhaCorrigida`: cores das bolinhas, selos, anuladas, sem letras | componente | Classes e textos corretos (CR-003) |
| FT-011 | Celular: ordem das seções, tocar na folha abre a questão com foco; desktop: bolinhas clicáveis | E2E (CR-003) | Rolagem e foco no título |
| BT-026, UT-024 | Correção por assunto; "Ver por assunto" no resultado | ver `specs/06` §6 | CR-004 |

---

## 7. Checklist de Implementação

- [ ] Schemas + serviço de correção + router com rate limit
- [ ] `historicoStorage`
- [ ] Fluxo de finalização no frontend (manual + por tempo)
- [ ] ResultadoPage (resumo, disciplinas, revisão)
- [ ] HistoricoPage
- [ ] Testes BT-020 a BT-024, UT-020, UT-021 + validação FT-010
