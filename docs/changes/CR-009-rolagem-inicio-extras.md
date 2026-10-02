# Change Request — CR-009: Rolagem ao trocar de página e extras do início

**Versão:** 1.0  
**Data:** 2026-10-02  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

Corrige um bug e traz quatro ajustes visuais:

- **R1 (bug):** a página nova abre na rolagem da anterior. Passa a abrir no topo a cada mudança de caminho.
- **E4, E6 e E7:** três extras que ficaram fora do CR-008 (§4.3 de lá), conforme as telas "A · Início" e "A · Início · celular" do canvas "Protótipo Simulado Fuvest":
  - **E4:** no cartão da Prova completa, o sobretítulo, as etiquetas e a miniatura da folha óptica.
  - **E7:** lateral do início com 340 px.
  - **E6:** os outros modos como linhas compactas no celular.
- **A1:** mais respiro dos lados no círculo de caneta quando o número tem um algarismo.
- **A2:** no painel da folha (celular), as marcas de sincronismo começam abaixo da legenda.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Bug Fix (R1) + Nova Feature (extras visuais do início, ajustes dos motivos) |
| Origem           | Bug reportado pelo usuário (R1); evolução do produto: extras do protótipo (E4, E6, E7) e observações sobre o CR-008 (A1, A2) |
| Urgência         | Próxima sprint |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- **Rolagem:** o app usa `BrowserRouter` e nada rola a página quando a rota muda. A única rolagem é a da resolução ao trocar de questão (P1.1, CR-001). Quem rola a prova até o fim e finaliza vê o resultado começar cerca de 900 px abaixo do topo. Quem rola o início e abre a prova a vê 583 px abaixo do topo.
- **Prova completa (CR-008, I6.3):** um cartão maior com as marcas de sincronismo, a bolinha "A", o título, a descrição e o botão.
- **Outros modos:** três cartões com bolinha, título, descrição e botão secundário, em 3 colunas a partir de 640 px e empilhados abaixo disso.
- **Lateral do início:** coluna de 256 px (`16rem`) a partir de 1024 px.
- **Círculo de caneta:** folga fixa de 8 px nos números e 4 px de margem. Com um algarismo (por exemplo, "Você acertou 7 de 90"), o círculo fica estreito e quase encosta no número.
- **Painel da folha:** as marcas de sincronismo ocupam toda a altura do conteúdo, desde o resumo ("3 respondidas · …") e a legenda.

### Problema ou Necessidade
- A página nova deve abrir no topo. Abrir no meio esconde o título e o começo do conteúdo, e no resultado esconde a nota.
- Os extras do protótipo dão ao início a cara da folha de prova: o cartão da Prova completa diz o que o modo tem, a lateral mais larga dá espaço ao "Seu último simulado", e as linhas compactas encurtam o início no celular.
- O círculo de um algarismo e as marcas ao lado do resumo e da legenda destoam do protótipo.

### Situação Desejada (TO-BE)
Os itens de §4.1. Telas de referência: "A · Início" (1440 px) e "A · Início · celular" (390 px). Elas valem só nos itens pedidos. O resto do que mostram fica como está (§4.3).

**Consequências do pedido (Claude, 02/10/2026):**
- **R1:** o componente `RolarAoTopo` fica no `App` e vale para todas as rotas, inclusive a resolução, que está fora do `Layout`. A cada mudança de `pathname`, a página rola ao topo, inclusive ao voltar e avançar pelo navegador ("a cada mudança de caminho"). Não rola na primeira renderização nem quando muda só a busca (`?…`). Usa `useLayoutEffect`, que roda antes da pintura, para a página nova não aparecer um instante na posição antiga. A rolagem da resolução ao trocar de questão (P1.1) continua como está. O foco não muda (fora do pedido).
- **E4:** o pedido cita três partes do E4: a miniatura da folha óptica, o sobretítulo e as etiquetas. A descrição nova e a seta no botão ficam de fora (§4.3).
  - **Sobretítulo:** "A mais próxima da prova real", em caixa alta pelo CSS (o leitor de tela lê a frase, e não letra por letra). Fica na mesma linha da bolinha "A", que o CR-008 acrescentou e que continua.
  - **Etiquetas:** uma lista com "90 questões", "5 horas" e "‹n› disciplinas". O n vem da `distribuicao_completa` do catálogo (8 hoje). Sem distribuição, a etiqueta das disciplinas some.
  - **Miniatura da folha:** decorativa (`aria-hidden`). A partir de 640 px, fica numa coluna de 190 px à direita do texto, com o cabeçalho A–E e cinco linhas (01 a 05), cada uma com uma bolinha marcada a caneta. No celular não aparece, como na tela "A · Início · celular".
- **E6:** vale abaixo de 640 px. Cada modo vira uma linha com a bolinha à esquerda, o título e a descrição no meio e uma seta à direita. O cartão inteiro leva ao modo: a área do link cobre o cartão. O nome acessível continua sendo a ação ("Escolher o ano", "Montar simulado", "Treinar"), como no desktop. O `h2` continua lá para a navegação por títulos, e o anel de foco contorna o cartão. Os textos são os de hoje (o E5 fica de fora). A partir de 640 px, os cartões continuam como hoje.
- **E7:** a lateral passa a ter 340 px. A borda e o recuo de hoje continuam.
- **A1:** os números de um algarismo ganham uma folga maior, com mais margem no número para o círculo não cortar as palavras vizinhas. Os números de dois algarismos e as palavras ficam como estão. O valor final sai da validação (§8): 16 px de folga e 12 px de margem.
- **A2:** as marcas saem do `PainelFolha` e vão para a área da grade da `FolhaRespostas` (formato `grade`, usado só no painel). Começam abaixo da legenda e acompanham a altura visível da grade. São no máximo 14. Num simulado curto, em que a grade cabe inteira, são no máximo 2 por linha, para não se amontoarem.
- **Ajustes da validação e da revisão de código (Claude, 02/10/2026):**
  - **Voltar do navegador (R1):** o React Router renderiza a página dentro do `popstate`, e o `scrollTo(0)` rodava. Logo depois, o navegador restaurava a posição antiga (364 px no início), porque `history.scrollRestoration` estava em `auto`. O `RolarAoTopo` passa a pôr `manual` enquanto está montado, e a rolagem fica só com o app. Recarregar não muda: com `auto`, o recarregar já voltava ao topo, porque os dados chegam depois da carga (medido: 1200 → 0 no resultado e 527 → 0 no início).
  - **Lateral (E7):** 340 px a partir de 1280 px. Entre 1024 e 1279 px, ficam os 256 px de antes. Com 340 px em 1024, os três cartões dos modos ficavam com 188 px e "Montar simulado" quebrava em duas linhas. A partir de 1280, a coluna principal tem os 740 px da tela "A · Início".
  - **Círculo (A1):** a folga sai do conteúdo, e não de quem chama. Palavra (texto) tem folga de 12 px; número de um algarismo, 16 px com margem de 12 px; número de dois algarismos, 8 px. O `ResumoResultado` só passa o número.
  - **Número das folhas:** `numeroDaFolha` (`utils/folha.ts`) substitui as cópias de `dois` na `FolhaRespostas`, na `FolhaCorrigida` e na `MiniFolha`.
  - **Cabeçalho da miniatura:** repete a coluna do número (`w-5`) e o espaço das linhas, em vez de um recuo calculado à mão.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | R1 Rolagem ao trocar de página | A página nova herda a rolagem da anterior | `RolarAoTopo` no `App`: `window.scrollTo({top: 0})` a cada mudança de `pathname` (não na primeira renderização nem com mudança só da busca) e `history.scrollRestoration = 'manual'` enquanto montado |
| 2 | E4 Sobretítulo | — | "A mais próxima da prova real" (caixa alta pelo CSS, `optico-texto`, negrito, 12–12,5 px, espaçamento 0,1em), na linha da bolinha "A" |
| 3 | E4 Etiquetas | — | Lista de pílulas (borda `linha`, fundo `fundo`, cantos redondos): "90 questões", "5 horas", "‹n› disciplinas" (n pela `distribuicao_completa`) |
| 4 | E4 Miniatura da folha | — | `MiniFolha` (`aria-hidden`), coluna de 190 px à direita a partir de 640 px: cabeçalho A–E, linhas 01–05 com uma bolinha `caneta` marcada em cada; caixa `fundo` com borda `linha` e cantos de 10 px |
| 5 | E7 Lateral do início | 256 px | 340 px a partir de 1280 px (256 px entre 1024 e 1279) |
| 6 | E6 Modos no celular | Cartões empilhados com bolinha em cima e botão secundário | Abaixo de 640 px: linha com bolinha à esquerda, título (19 px) e descrição, seta à direita; o cartão inteiro é a área do link; o nome continua sendo a ação; anel de foco no cartão |
| 7 | A1 Círculo de um algarismo | Folga de 8 px, margem de 4 px | 16 px de folga e 12 px de margem; a folga sai do conteúdo (palavra, um ou dois algarismos) |
| 8 | A2 Marcas do painel da folha | Da altura do resumo até o fim da grade, 14 marcas | Só na altura visível da grade, abaixo da legenda; até 14, e no máximo 2 por linha quando a grade cabe inteira |

### 4.2 O que NÃO muda

- Comportamento, rotas, API, dados e regras (CR-001 a CR-008). Nenhum endpoint, tabela, variável ou dependência.
- A rolagem da resolução ao trocar de questão e o foco no título (P1.1). O foco ao trocar de página também não muda.
- Os textos de hoje (descrições dos modos, da Prova completa e dos botões) e as regras do botão da Prova completa (secundário com simulado em andamento, desabilitado com "Disponível quando…").
- Os modos a partir de 640 px, o "Seu último simulado", "Provas na base" e "Questões por disciplina".
- As marcas de sincronismo do cartão da Prova completa e do cartão da folha no desktop. O círculo de "reais" e o dos números de dois algarismos.

### 4.3 Fora de escopo (extras do protótipo)

Diferenças das telas de referência que o pedido não cita (regra do CR-007/CR-008: o que não foi pedido fica como está):

| # | Extra no protótipo | O que fica |
|---|--------------------|------------|
| E4 (resto) | Descrição "…com 5 horas de relógio correndo." e seta no botão "Começar prova completa" | Descrição e botão de hoje |
| E1–E3, E5, E8–E18 | Os demais extras do CR-008 §4.3 (cabeçalho de 68 px, pílula da conta, título de 50 px, textos dos modos, títulos da lateral em caixa alta, links das provas sem negrito, etc.) | Como hoje |
| — | Botão da Prova completa com 50 px de altura e largura total no celular | Botão de hoje |

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Não | — | Bug de UI e extras visuais sem funcionalidade nova: o RF-008 já cobre os modos e o destaque da Prova completa. Nenhum RF, US, RN ou item fora de escopo muda |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura (`RolarAoTopo`, `inicio/MiniFolha`), padrões do frontend (rolagem ao trocar de rota) | v1.9 |
| `/docs/03-SPEC.md` | Sim | Resumo, specs afetadas, changelog | v1.9 |
| `/docs/specs/03-resolucao.md` | Sim | Rotas (rolagem), §3 motivos (círculo, marcas do painel), "Início com conta" (E4, E6, E7), `FolhaRespostas`/`PainelFolha`, UT e FT | v1.9 |
| `/docs/specs/04-correcao-resultado.md` | Sim | `ResumoResultado` (círculo de um algarismo) | v1.6 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-009 |
| `/docs/05-DEPLOY-GUIDE.md` | Não | — | Sem variável, migration ou procedimento novo |
| `CLAUDE.md` | Sim | Change Requests, Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `frontend/src/components/RolarAoTopo.tsx` | R1 |
| Modificar | `frontend/src/App.tsx` | Renderiza o `RolarAoTopo` |
| Criar | `frontend/src/components/inicio/MiniFolha.tsx` | E4 (miniatura) |
| Modificar | `frontend/src/pages/HomePage.tsx` | E4 (sobretítulo, etiquetas, miniatura), E6 (linhas no celular), E7 (lateral) |
| Modificar | `frontend/src/components/CirculoCaneta.tsx`, `components/resultado/ResumoResultado.tsx` | A1 |
| Modificar | `frontend/src/components/resolucao/FolhaRespostas.tsx`, `PainelFolha.tsx` | A2 |
| Modificar | `frontend/src/utils/folha.ts`, `components/resultado/FolhaCorrigida.tsx` | `numeroDaFolha` no lugar das cópias de `dois` (revisão de código) |
| Criar/Modificar | `frontend/src/App.test.tsx` (UT-052), `pages/inicioConta.test.tsx` (UT-053), `pages/identidade.test.tsx` e `components/resolucao/FolhaRespostas.test.tsx` (UT-054) | Testes do CR-009 |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma mudança | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, Arquitetura v1.9, 03-SPEC v1.9, specs 03 e 04, Plano | — | Docs revisados e commitados |
| CR-T-02 | R1: `RolarAoTopo` no `App` | CR-T-01 | UT-052 verde; testes existentes verdes |
| CR-T-03 | E4, E6, E7: início (sobretítulo, etiquetas, `MiniFolha`, linhas no celular, lateral) | CR-T-02 | UT-053 verde |
| CR-T-04 | A1 e A2: círculo de um algarismo, marcas do painel abaixo da legenda | CR-T-03 | UT-054 verde |
| CR-T-05 | Validação runtime (FT-023), `/code-review` | CR-T-04 | Registrados na §8 |
| CR-T-06 | Docs finais, merge + push + CI verde | CR-T-05 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] R1: com a página rolada, ao abrir outra rota (pelo início, pela resolução ou pelo voltar e avançar do navegador), ela começa no topo; mudar só a busca não rola — UT-052; FT-023 (início rolado 364 px → histórico, prova e "Personalizado" em 0; voltar e avançar em 0; prova rolada 427 px → finalizar → resultado em 0)
- [x] E4: sobretítulo, etiquetas ("90 questões", "5 horas", "‹n› disciplinas") e miniatura da folha (`aria-hidden`, a partir de 640 px) no cartão da Prova completa — UT-053; FT-023
- [x] E7: lateral de 340 px a partir de 1280 px (256 px entre 1024 e 1279, ajuste da validação) — FT-023 (`740px 340px` em 1280 e 1440; `681px 256px` em 1024)
- [x] E6: abaixo de 640 px, os modos B–D em linhas com a seta, o cartão inteiro clicável e o nome da ação; a partir de 640 px, como hoje — UT-053; FT-023 (toque no título de "Personalizado" abre `/novo/personalizado`; anel #A61E4D de 3 px em volta do cartão)
- [x] A1: círculo de um algarismo com folga maior, sem cortar "acertou" e "de"; dois algarismos e "reais" como antes — UT-054; FT-023
- [x] A2: marcas do painel só na altura da grade, abaixo da legenda — UT-054; FT-023
- [x] Sem rolagem horizontal em 320 e 390 px; console limpo — FT-023
- [x] Testes existentes continuam passando (regressão) — backend sem mudança; frontend 249 → 257
- [x] Novos testes cobrem a mudança — UT-052 (3 testes), UT-053 (3) e UT-054 (4); UT-049 ajustado (a miniatura também tem um "A", e as etiquetas são uma lista)
- [x] Fluxo afetado exercitado em runtime antes do merge (FT-023) — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] ~~Revisão de segurança~~: N/A — só UI, sem endpoint, autenticação, dados de usuário novos ou dependência nova
- [x] Documentos afetados foram atualizados — Arquitetura v1.9, 03-SPEC v1.9, specs 03 v1.9 e 04 v1.6, Plano, CLAUDE.md, INDEX.md; PRD e Deploy Guide sem mudança (justificativa no §5)
- [x] CI verde na branch e em `master` — branch verde (run 37025862224); `master` verde no merge `a3de864` (run 37026078631). Produção depois do deploy, sem login: bundle novo no ar, `/api/health` 200, `history.scrollRestoration` em `manual`, apresentação rolada → Privacidade em 0 → voltar em 0, console sem erro nem aviso

**Validação runtime (02/10/2026, build servido pelo FastAPI na porta 8001, SQLite local com 2023–2025, provedor Google falso — o resto é o código de produção):**
- **Rolagem:** no início rolado até o fim (364 px), o link "histórico" abre o histórico em 0. O voltar devolve o início em 0 e o avançar, o histórico em 0. O primeiro teste do voltar deu 364 px e levou ao ajuste do `scrollRestoration`. "Continuar simulado" abre a prova em 0. Com a prova rolada até o fim (427 px), "Finalizar simulado" → "Finalizar e ver o resultado" abre o resultado em 0.
- **Início, 1440 px:** sobretítulo "A MAIS PRÓXIMA DA PROVA REAL" na linha da bolinha A, etiquetas "90 questões · 5 horas · 8 disciplinas", miniatura da folha de 190 px à direita (letras centradas sobre as bolinhas) e lateral de 340 px com "Seu último simulado". **1024 px:** lateral de 256 px e botões dos modos numa linha. Antes do ajuste, com 340 px, "Montar simulado" quebrava.
- **Início, 390 px:** sem a miniatura; modos B–D em linhas de 106 px com a seta. O toque no título de "Personalizado" abre o modo. O foco pelo teclado no "Treinar" mostra o anel de 3 px #A61E4D, com afastamento de 2 px e cantos de 16 px, em volta do cartão inteiro, e nenhum anel no link. **320 px:** o sobretítulo quebra em duas linhas ao lado da bolinha e não há rolagem horizontal (`scrollWidth` = `clientWidth`).
- **Círculo:** "Você acertou 1 de 90" tem o círculo de 49 × 53 px em 1440, com cerca de 6 px até "acertou" e até "de", e de 46 × 44 px em 390, com cerca de 4,5 px. "58 de 90" tem 60 × 53 px e margem de 4 px, como antes.
- **Painel da folha, 390 px (Prova completa):** um grupo de 14 marcas, de 215 a 747 px. A legenda termina em 199 px, e a grade visível vai de 215 a 747. O painel não tem marcas próprias.
- **Console:** nenhum erro nem aviso. O único 404 foi de um asset do build anterior, com o `index.html` em cache durante um rebuild, e não se repetiu.
- **Fora do escopo:** em 640 px, "Montar simulado" quebra em duas linhas (cartões de 187 px, sem lateral). Já era assim no `master`.

**Revisão de código (`/code-review high`, diff `master...HEAD`) — 8 achados: 5 corrigidos, 3 justificados (`cb7c868`):**
1. **Justificado (com docs corrigidos):** com `scrollRestoration = 'manual'`, recarregar começa no topo, o que contrariava o texto do CR e da spec. Medido com `auto`, o recarregar já voltava ao topo (os dados chegam depois da carga). O comportamento não muda, e os textos foram corrigidos.
2. **Justificado:** com `manual`, voltar entre entradas do mesmo caminho (só a busca muda) não restaura a posição. O app não cria entradas assim: o `?voltar=` usa `replace` e muda o caminho, e o `/conta?erro=` vem de um redirecionamento do servidor (carga de página inteira).
3. **Corrigido:** o CR e a spec diziam "340 px a partir de 1024 px" depois do ajuste da validação.
4. **Corrigido:** a folga do círculo era escolhida por quem chama (`acertos < 10`). Agora o `CirculoCaneta` decide pelo conteúdo.
5. **Corrigido (texto):** "2 por linha" valia só com a grade inteira à vista. Com a grade rolando, as marcas ficam paradas na altura visível, como as do impresso, até 14. Comentário, spec e teste agora dizem isso.
6. **Corrigido:** quarta cópia do `dois`. Virou `numeroDaFolha` em `utils/folha.ts`.
7. **Corrigido:** o cabeçalho da miniatura usava um recuo calculado à mão (`pl-[1.625rem]`). Agora repete a coluna do número. O `CabecalhoLetras` não serve aqui porque tem as medidas da folha real (número de 18 px, bolinhas de 13 px).
8. **Justificado:** "90 questões" e "5 horas" nas etiquetas repetem a descrição. São texto do produto (RF-009), como as descrições do início e da apresentação, e não há constante desses valores no frontend.

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Voltar pelo navegador deixa de devolver a posição em que a pessoa estava | Média | Baixo | É o pedido ("a cada mudança de caminho"); hoje a restauração do navegador já falha com o conteúdo que carrega depois |
| 2 | O link que cobre o cartão no celular rouba o toque de outro elemento do cartão | Baixa | Médio | O cartão só tem o link; bolinha e textos são estáticos |
| 3 | O círculo mais largo corta as palavras vizinhas | Média | Baixo | Margem maior junto com a folga; FT-023 com 0 e com 2 algarismos em 1440 e 390 px |
| 4 | A miniatura aperta o texto do cartão entre 640 e 1024 px | Média | Baixo | Coluna fixa de 190 px; FT-023 em 1024 px; as etiquetas quebram linha |
| 5 | Marcas amontoadas no painel com poucas questões | Baixa | Baixo | 2 marcas por linha da grade |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-009` → `git revert -m 1 <merge do CR-009>` → merge em `master` → push.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-009-rolagem-inicio-extras`.

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — nenhuma migration
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade é destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** só aparência e rolagem.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] Início com o cartão da Prova completa do CR-008
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-02 | Rafael Peixoto (com Claude) | CR criado com R1, E4 (miniatura, sobretítulo e etiquetas), E6, E7, A1 e A2 |
| 2026-10-02 | Rafael Peixoto (com Claude) | Implementação (CR-T-01 a CR-T-05); validação runtime (FT-023) com os ajustes do voltar do navegador e da lateral; revisão de código (8 achados) |
| 2026-10-02 | Rafael Peixoto (com Claude) | Merge `a3de864`, CI de `master` verde; produção conferida sem login — validação ✅, status Concluído |
