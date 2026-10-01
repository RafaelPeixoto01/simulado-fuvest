# Change Request — CR-007: Apresentação, menu do celular e barra opaca

**Versão:** 1.0  
**Data:** 2026-10-01  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

Três achados da conferência do `master` depois dos CR-001 a CR-006 (tela "Observações novas · itens numerados" do canvas "Protótipo Simulado Fuvest"):

- **O1:** a apresentação, que desde o CR-006 é a primeira tela de todo visitante, passa a mostrar o produto. Ganha os números da base (vindos de um endpoint público novo, `GET /api/vitrine`), uma prévia da tela de resolução feita em HTML/CSS, os modos em cartões e um botão do Google maior.
- **O2:** no celular, os links do cabeçalho, hoje empilhados, dão lugar a um botão "Menu" com um painel.
- **O3:** a barra do topo da resolução fica opaca.

Para a O1.1, o CR **emenda a decisão D2 do CR-006**: além do health e das figuras, a vitrine (só os totais da base) também é pública.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (apresentação com a base e menu do celular) + ajuste de UI (barra opaca) |
| Origem           | Revisão de design: "Observações novas" de 01/10/2026 (itens O1 a O3) |
| Urgência         | Próxima sprint |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- **Apresentação** (`ApresentacaoPage.tsx`, CR-006): só texto, numa coluna de 672 px. Não mostra como é o simulado nem o tamanho da base: "270 questões de 3 provas" só aparece depois do login, porque o catálogo é protegido (D2 do CR-006). No desktop, cerca de 40% da largura à direita fica vazia. Os modos são uma lista de texto. O botão do Google tem 48 px, e o aviso começa com "Para usar o site, entre com a sua conta Google."
- **Cabeçalho no celular** (`Layout.tsx`): abaixo de 640 px, os links ficam um embaixo do outro (`flex-col`), para não estourar 320 px (CR-004). Com login, são três linhas (Desempenho, Histórico e o nome), o cabeçalho cresce e cada link tem só 28 px de altura (`itemNav`, `py-1`).
- **Barra do topo da resolução** (`ResolucaoPage.tsx`): `bg-fundo/95 backdrop-blur`. O texto rolado da questão aparece apagado atrás dela.

### Problema ou Necessidade
- A primeira tela não mostra o produto nem a base, e desperdiça metade do desktop.
- O cabeçalho do celular com conta é alto e tem alvos de toque pequenos.
- A barra semitransparente deixa o texto da questão aparecer por trás.

### Situação Desejada (TO-BE)
- **O1 (apresentação):** números da base abaixo do subtítulo (questões, provas e anos, vindos do servidor). Prévia da tela de resolução à direita no desktop e depois do botão no celular, com um cartão de resultado sobreposto no desktop. Modos em cartões com as bolinhas A–D. Botão do Google de 52 px, e o aviso começa com "É grátis."
- **O2 (menu do celular):** abaixo de 640 px, um botão "Menu" abre um painel com Início, Desempenho, Histórico e a conta. O cabeçalho fica com 56 px fixos. Sem conta, não há menu, só "Entrar". A partir de 640 px, nada muda.
- **O3 (barra opaca):** a barra do topo da resolução usa `bg-fundo` opaco, sem desfoque.

**Decisões do usuário (01/10/2026):**
- **D1 · Números sem login (O1.1):** endpoint público novo só com os totais, `GET /api/vitrine` → `{"total_questoes": 270, "anos": [2023, 2024, 2025]}`. Fica fora do `/api/health`, que continua só para monitoramento.
- **D2 · Extras do protótipo:** o que as telas do protótipo mostram e a tela de itens não pede não entra neste CR. Segue a especificação atual e fica anotado em §4.3 ("fora de escopo").

**Emenda à D2 do CR-006 (por causa da D1):**

> **D2 · Onde exigir (emendada pelo CR-007):** na interface e na API. O health, as figuras e a vitrine (`GET /api/vitrine`, só os totais da base: questões válidas e anos publicados) continuam públicos.

A consequência anotada no CR-006 ("a apresentação não mostra números da base") deixa de valer. O catálogo, a geração, as questões, a correção e os reportes continuam exigindo sessão. O CR-006 ganhou uma nota que aponta para esta emenda.

**Consequências das decisões (Claude):**
- A vitrine é pública **em qualquer modo de acesso** (`conta`, `livre` e `indisponivel`), como o `/api/health`. Ela só tem totais, que não abrem o conteúdo. No modo `indisponivel` a apresentação nem aparece, porque o início mostra o aviso.
- `total_questoes` conta as questões **válidas** (não anuladas), o mesmo número que o catálogo e o início com login mostram ("270 questões de 3 provas"). O número de provas é a quantidade de `anos`, porque cada prova é um ano.
- A apresentação não espera a vitrine. Os números só aparecem quando ela responde com pelo menos uma prova. Se a vitrine falhar ou a base estiver vazia, a página aparece sem eles e nunca mostra "0".
- O `BotaoGoogle` é o mesmo da página Conta (sem login). Os 52 px valem lá também.
- A prévia usa o texto da questão 13 de 2025 tirado do pacote (`data/provas/2025/prova.yaml`): o protótipo resumia as alternativas. As alternativas aparecem cortadas com reticências pelo CSS. O cartão de resultado tem números ilustrativos, como no protótipo.
- No modo `livre` (só desenvolvimento e testes, sem login), o menu do celular mostra Início, Desempenho e Histórico, sem a linha da conta. Com o site `indisponivel` e alguém conectado, o menu mostra Início e a conta, como os links de hoje.

**Ajustes da validação e da revisão de código (Claude, 01/10/2026):**
- Em 320 px, "Simulado Fuvest" quebrava em duas linhas ao lado do botão "Menu". Abaixo de 640 px, a marca fica com 46 px, como nos três protótipos do celular, e o espaço entre a marca e o botão cai para 8 px. Com isso, o cabeçalho cabe numa linha com 56 px.
- Em 1024 px, o cartão de resultado cobria a alternativa B marcada. A coluna da prévia tem 616 px de altura entre 1024 e 1279 px e 584 px a partir daí, e o cartão fica sempre abaixo da alternativa marcada.
- Em 390 px, o período "2023–25" quebrava em duas linhas. Os três números usam `repeat(3, 1fr)` (o mínimo de cada cartão é o conteúdo) e o período não quebra.
- Com o menu aberto, a rolagem da página fica travada: o cabeçalho não é fixo, e rolar levaria o painel embora e deixaria só o fundo escuro. O menu também fecha quando o foco sai dele (Tab depois do último item), para o conteúdo coberto não receber o foco.
- Enquanto a sessão carrega, o celular mostra só a marca. Antes, o botão "Menu" aparecia e virava "Entrar" logo depois.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | API | Sem endpoint público de conteúdo | `GET /api/vitrine` → `VitrineResponse {total_questoes, anos}`, pública, sem rate limit (como o health) |
| 2 | D2 do CR-006 | Públicos: health e figuras | Públicos: health, figuras e vitrine (emenda) |
| 3 | O1.1 Números da base | Nenhum na apresentação | Abaixo do subtítulo: `<dl>` com "questões reais", "provas completas" e "anos na base" (no celular, "provas" e "anos"; o período abreviado, "2023–25"). Vêm da vitrine; somem se ela falhar ou vier vazia |
| 4 | O1.2 Prévia do produto | Nenhuma | `PreviaProduto`: miniatura da resolução (questão 13 de 2025, B marcada, cronômetro "04:52:10", "Folha 12/90", barra Anterior/Revisar/Próxima) em HTML/CSS com os tokens. À direita no desktop (≥ 1024 px), com um cartão "Resultado · 58 de 90 acertos" por disciplina sobreposto; no celular, depois do botão e do aviso, sem o cartão. Visual `aria-hidden`, com uma descrição em texto para leitores de tela |
| 5 | O1.3 Modos | Lista de texto | Cartões com as bolinhas A–D da folha: 4 colunas no desktop (≥ 1024 px), lista abaixo disso |
| 6 | O1.4 Botão e aviso | Botão de 48 px; "Para usar o site, entre com a sua conta Google. Guardamos…" | Botão de 52 px (também na Conta); "É grátis. Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos." + Privacidade |
| 7 | O2.1 Botão "Menu" | Links empilhados abaixo de 640 px | Abaixo de 640 px, botão "Menu" (ícone + texto, 44 px, `aria-expanded`, `aria-controls`); o ícone vira um X com o menu aberto. Abre um painel logo abaixo do cabeçalho, sobre o conteúdo escurecido |
| 8 | O2.2 Painel | — | Início, Desempenho e Histórico em linhas de 52 px com ícone, a página atual destacada (`aria-current="page"`) e, separada, a conta (inicial, primeiro nome e "Conta e sair") |
| 9 | O2.3 Fechar e altura | Cabeçalho cresce com os links | Fecha com Esc (o foco volta ao botão), com toque fora, ao escolher um item e ao mudar de rota. Cabeçalho com 56 px fixos no celular |
| 10 | O2.4 Sem conta e desktop | — | Sem conta, não há menu: só "Entrar". A partir de 640 px, links em linha, como hoje |
| 11 | O3.1 Barra da resolução | `bg-fundo/95 backdrop-blur` | `bg-fundo` opaco, no celular e no desktop |
| 12 | Smoke test do Docker (CI) | — | Confere que `/api/vitrine` responde 200 em produção sem login (pública) |

### 4.2 O que NÃO muda

- Todas as outras rotas da API continuam exigindo sessão (ADR-012). O login, a sessão, o `RequerConta` e o aviso "Entre com a sua conta Google para continuar." quando há `?voltar=` ficam como estão.
- O título, o subtítulo e o título "Quatro jeitos de treinar" da apresentação mantêm o texto e o tamanho atuais (ver §4.3).
- A partir de 640 px, o cabeçalho (altura, links e ordem) e o rodapé não mudam.
- A resolução continua em modo foco, sem o cabeçalho do site, por isso sem o menu. A barra inferior, a folha e o cronômetro não mudam.
- O início com login (`HomePage`) não muda.
- Nenhuma tabela, migration, variável de ambiente ou dependência nova.

### 4.3 Fora de escopo (extras do protótipo)

Diferenças das telas "Apresentação · desktop", "Apresentação · celular" e "Menu do cabeçalho · celular" que não estão nos itens O1 a O3. Seguem a especificação atual (`specs/07` §8.2 e `specs/03` §2.4) e podem virar outro CR:

| # | Tela | Extra no protótipo | O que fica |
|---|------|--------------------|------------|
| E1 | Apresentação · desktop | Cabeçalho com 56 px também no desktop | A partir de 640 px, a altura de hoje (O2.4: "nada muda") |
| E2 | Apresentação · desktop | Título em 46 px e subtítulo em 19 px | `text-4xl` (36 px) e `text-lg` (18 px), como hoje |
| E3 | Apresentação · desktop e celular | Subtítulo "Simulados com as provas oficiais de anos anteriores…" | Texto atual: "Simulados com questões das provas oficiais de anos anteriores…" |
| E4 | Apresentação · desktop e celular | Título "Quatro jeitos de treinar" em 22 px (20 px no celular) | `text-lg`, como hoje |
| E5 | Apresentação · desktop e celular | Botão do Google com texto em 17 px negrito e sombra | Só a altura (52 px) e o respiro lateral mudam (O1.4); texto e borda como hoje |
| E6 | Apresentação · celular | Botão do Google com a largura toda | Largura do conteúdo, como hoje |
| E7 | Apresentação · celular | "Entrar" do cabeçalho com área de toque de 44 px | Estilo atual dos links (`itemNav`) |

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, RF-008 (apresentação com números e prévia), RN-017 (vitrine pública), RNF-004, US-015, glossário (vitrine), histórico | v4.1 |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura (`routers/vitrine.py`, `components/apresentacao/`, `MenuCelular`), padrões da API (públicos), ADR-012 (emenda: vitrine pública; alternativa "catálogo público" revista) | v1.7 |
| `/docs/03-SPEC.md` | Sim | Contratos (`GET /api/vitrine`), lista de públicos, changelog | v1.7 |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | §8.1 públicos; §8.2 apresentação; §9 nova (vitrine e apresentação, BT-076 a BT-078, UT-043, UT-044, FT-021) | v1.3 |
| `/docs/specs/03-resolucao.md` | Sim | Rotas/cabeçalho (menu do celular), barra do topo opaca, UT-045, UT-046 | v1.7 |
| `/docs/changes/CR-006-login-obrigatorio.md` | Sim | D2 e changelog | Nota da emenda |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-007 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Verificação pós-deploy, smoke test | v1.4 |
| `CLAUDE.md` | Sim | Change Requests, Última Tarefa, lembrete do login obrigatório (públicos) | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `backend/app/routers/vitrine.py` | `GET /api/vitrine`, sem `exigir_acesso` |
| Modificar | `backend/app/schemas.py` | `VitrineResponse` |
| Modificar | `backend/app/services/catalogo.py` | `obter_vitrine` |
| Modificar | `backend/app/main.py` | Registrar o router |
| Criar | `backend/tests/test_vitrine.py` | BT-076 a BT-078 |
| Modificar | `.github/workflows/ci.yml` | Smoke test: `/api/vitrine` → 200 em produção sem login |
| Modificar | `frontend/src/types.ts`, `services/api.ts` | `Vitrine`, `api.vitrine` |
| Criar | `frontend/src/hooks/useVitrine.ts` | Query da vitrine |
| Modificar | `frontend/src/pages/ApresentacaoPage.tsx` | Números, prévia, modos em cartões, aviso |
| Criar | `frontend/src/components/apresentacao/PreviaProduto.tsx` | Miniatura da resolução e cartão de resultado |
| Modificar | `frontend/src/components/BotaoGoogle.tsx` | 52 px |
| Modificar | `frontend/src/components/Layout.tsx` | 56 px no celular; links em linha a partir de 640 px; `MenuCelular` abaixo disso |
| Criar | `frontend/src/components/MenuCelular.tsx` | Botão "Menu" e painel |
| Modificar | `frontend/src/pages/ResolucaoPage.tsx` | Barra do topo opaca |
| Criar | `frontend/src/pages/apresentacao.test.tsx` | UT-043, UT-044 |
| Criar | `frontend/src/components/menuCelular.test.tsx` | UT-045 |
| Modificar | `frontend/src/pages/resolucao.test.tsx` | UT-046 |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma mudança (a vitrine só lê `provas` e `questoes`) | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, emenda no CR-006, PRD v4.1, Arquitetura v1.7, 03-SPEC v1.7, specs 07 v1.3 e 03 v1.7, Plano, Deploy Guide v1.4 | — | Docs revisados e commitados |
| CR-T-02 | Backend: `GET /api/vitrine` + smoke test do CI | CR-T-01 | BT-076 a BT-078 verdes; testes existentes verdes |
| CR-T-03 | Frontend O1: vitrine, apresentação, prévia, modos em cartões, botão e aviso | CR-T-02 | UT-043 e UT-044 verdes; testes existentes verdes |
| CR-T-04 | Frontend O2 e O3: menu do celular e barra opaca | CR-T-01 | UT-045 e UT-046 verdes; testes existentes verdes |
| CR-T-05 | Validação runtime (FT-021), revisão OWASP, `/code-review` | CR-T-03, CR-T-04 | Registrados na §8 |
| CR-T-06 | Docs finais, merge + push + CI verde | CR-T-05 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] `GET /api/vitrine` responde, sem sessão e em qualquer modo de acesso, só `{total_questoes, anos}` (questões válidas e anos em ordem crescente), sem cookie; base vazia → `{0, []}` — BT-076 a BT-078; HTTP real abaixo
- [x] O1.1: a apresentação mostra os números da vitrine abaixo do subtítulo (270 · 3 · 2023–2025 com a base de produção); sem vitrine, ou com a base vazia, mostra a página sem os números — UT-043; FT-021
- [x] O1.2: prévia da resolução à direita no desktop, com o cartão de resultado sobreposto, e depois do botão no celular; `aria-hidden`, com descrição em texto — UT-044; FT-021
- [x] O1.3: modos em cartões com as bolinhas A–D, 4 colunas no desktop e lista no celular — UT-044; FT-021
- [x] O1.4: botão do Google com 52 px; aviso começando por "É grátis." — UT-043; FT-021 (52 px medidos)
- [x] O2.1–O2.3: abaixo de 640 px, com conta, botão "Menu" de 44 px (`aria-expanded`, `aria-controls`) que abre o painel com Início, Desempenho, Histórico (52 px, ícone, `aria-current`) e a conta; fecha com Esc (foco no botão), toque fora, item e troca de rota; cabeçalho com 56 px — UT-045; FT-021
- [x] O2.4: sem conta, só "Entrar"; a partir de 640 px, links em linha como hoje — UT-045; FT-021 (640 px: links em linha, cabeçalho com os mesmos 53 px)
- [x] O3.1: barra do topo da resolução opaca, sem desfoque — UT-046; FT-021
- [x] Sem rolagem horizontal em 320 e 390 px; nada se sobrepõe na apresentação em 1024 e 1440 px — FT-021 (o cartão de resultado fica 15 a 58 px abaixo da alternativa marcada entre 1024 e 1440 px)
- [x] Testes existentes continuam passando (regressão) — backend 327, frontend 225
- [x] Novos testes cobrem a mudança — BT-076 a BT-078 (4 testes), UT-043 a UT-046 (19 testes)
- [x] Fluxo afetado exercitado em runtime antes do merge (FT-021) — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: endpoint público novo — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — PRD v4.1, Arquitetura v1.7, 03-SPEC v1.7, specs 07 v1.3 e 03 v1.7, CR-006 (nota da emenda), Plano, Deploy Guide v1.4, CLAUDE.md, INDEX.md
- [ ] CI verde na branch e em `master`

**Validação runtime (01/10/2026, build servido pelo FastAPI na porta 8001, SQLite local com 2023–2025, provedor Google falso — o resto é o código de produção):**
- HTTP (curl), modo `conta`, sem cookie: `GET /api/vitrine` → 200 `{"total_questoes":270,"anos":[2023,2024,2025]}`, sem `Set-Cookie`, com os headers de segurança; `POST /api/vitrine` → 405; parâmetro na URL é ignorado (200). `GET /api/catalogo` continua 401 e `/api/sessao` → `acesso: "conta"`.
- Playwright, apresentação sem login: em 1440 px, duas colunas ("270 · 3 · 2023–2025" com "questões reais", "provas completas" e "anos na base"; botão do Google com 52 px; aviso "É grátis."; prévia à direita com o cartão "58 de 90 acertos" sobreposto) e os 4 modos em cartões A–D em 4 colunas. Em 1024, 1180, 1280 e 1440 px, o cartão de resultado fica abaixo da alternativa B, sem rolagem horizontal. Em 390 e 320 px: cartões "270 · 3 · 2023–25" com "provas" e "anos", prévia depois do aviso, sem o cartão de resultado, modos em lista, sem rolagem horizontal.
- Playwright, menu (com login pelo provedor falso): em 390 px, o cabeçalho tem 56 px e só o botão "Menu" (44 px). O painel mostra Início (`aria-current`), Desempenho e Histórico com 52 px e "R · Rafael · Conta e sair" com 56 px. Esc fecha e devolve o foco ao botão; o toque no fundo escuro fecha sem sair de `/`; "Histórico" navega, fecha e devolve o foco; o voltar do navegador com o menu aberto fecha. Depois da revisão, com o menu aberto, a página não rola, e Tab depois da conta fecha o menu. Em 320 px, a marca e o botão cabem numa linha. Em 640 px, sem menu e com os links em linha (53 px, como antes).
- Playwright, resolução (Prova de 2025, 1440 px, página rolada até o meio da questão 1): barra do topo com fundo `rgb(245, 246, 248)` e `backdrop-filter: none`; o texto rolado não aparece por trás dela.
- Console: nenhum erro nem aviso.

**Revisão de código (`/code-review high`, diff `master...HEAD`) — 9 achados: 6 corrigidos, 3 justificados (`0e45afe`):**
1. Corrigido: o fundo escuro é fixo e o cabeçalho não. Rolar com o menu aberto levava o painel embora e deixava só o fundo. Com o menu aberto, a rolagem da página fica travada, como no painel da folha (UT-045).
2. Corrigido: enquanto a sessão carregava, o celular mostrava "Menu" (que depois virava "Entrar"). Agora mostra só a marca até a sessão chegar (UT-045).
3. Corrigido: Tab depois do último item levava o foco ao conteúdo coberto pelo fundo. O menu fecha quando o foco sai dele (UT-045).
4. Corrigido em parte: a vitrine não tem rate limit nem cache, e o React Query a buscava de novo a cada volta à aba. Agora usa `staleTime: Infinity`, porque os totais só mudam com um deploy. **Justificado** sem rate limit: são duas consultas leves (contagem e anos), como o `/api/health`, que também não tem limite. Um limite por IP também barraria escolas inteiras atrás do mesmo IP na página de entrada.
5. **Justificado:** `obter_vitrine` conta as questões válidas com a própria consulta, e não com a do catálogo. O catálogo conta agrupando por disciplina e assunto, e reaproveitar essa contagem exigiria montar a lista inteira. O BT-076 confere que os dois totais são iguais.
6. Corrigido: o Esc repetia o fechamento dos itens; agora os dois usam a mesma função. **Justificado:** o ouvinte de clique continua no documento, e não só no fundo, porque o fundo não cobre o cabeçalho (a marca também deve fechar o menu).
7. **Justificado:** o menu tem a própria lista de links, separada da do desktop. A apresentação é diferente (ícones, Início, linha da conta), e a visibilidade segue a mesma regra (`comConteudo`). Sem conta, os dois mostram só "Entrar". UT-045 cobre os modos.
8. **Incorreto:** `comMenu` não é sempre igual a `comConteudo`. Com o site `indisponivel` e alguém conectado, `comConteudo` é falso e há usuário (UT-042 do CR-006). O comentário no `Layout` passou a citar o caso.
9. Corrigido: `Math.min`/`Math.max` nos anos, que já vêm em ordem crescente pelo contrato; agora o primeiro e o último.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum; nenhuma variável nova |
| Validação de entrada | A vitrine não recebe entrada (só `GET`, sem parâmetros; outros métodos → 405) |
| Tokens / armazenamento | Inalterado; a vitrine não lê nem cria cookie (BT-077) |
| Autorização | Pública por decisão (D1, emenda à D2 do CR-006). O router não tem `exigir_acesso`, e o contrato fica fechado em dois agregados (`VitrineResponse`): nenhum id, texto, gabarito ou dado pessoal. As demais rotas de conteúdo continuam com `exigir_acesso` |
| Ownership | Sem dado de usuário |
| SQL | ORM (`select`, `func.count`), sem SQL montado |
| CORS / headers | Inalterados; headers de segurança presentes na resposta da vitrine |
| Rate limit / abuso | Sem limite, como o `/api/health` (achado 4 da revisão) |
| Dependências | Nenhuma nova |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | O endpoint público vira porta para o conteúdo protegido | Baixa | Médio | Resposta fechada em dois campos agregados (`VitrineResponse`), sem ids, textos ou dado pessoal; BT-077 confere o formato exato |
| 2 | Abuso do endpoint público (muitas requisições) | Baixa | Baixo | Duas consultas leves (contagem e anos), como o `/api/health`, que também não tem limite |
| 3 | A prévia fica diferente da resolução real quando o visual mudar | Média | Baixo | Feita com os tokens do site (cores e fontes acompanham); a estrutura é revista quando a resolução mudar |
| 4 | Os números aparecem depois do resto e empurram o botão para baixo | Média | Baixo | A vitrine é pequena e rápida; sem ela, a página fica completa sem os números |
| 5 | O menu do celular prende ou perde o foco | Baixa | Médio | Esc devolve o foco ao botão; UT-045 e FT-021 conferem teclado e toque |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-007` → `git revert -m 1 <merge do CR-007>` → merge em `master` → push. A apresentação volta a ser só texto, o cabeçalho do celular volta aos links empilhados e a vitrine sai do ar.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-007-apresentacao-menu-barra`.

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — nenhuma migration
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade é destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** nenhuma escrita nova; a vitrine só lê.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `/api/vitrine` responde 404 e a apresentação abre sem os números
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-01 | Rafael Peixoto (com Claude) | CR criado com os itens O1 a O3, a D1 (vitrine), a D2 (extras do protótipo fora de escopo) e a emenda à D2 do CR-006 |
| 2026-10-01 | Rafael Peixoto (com Claude) | Implementação (CR-T-01 a CR-T-05): vitrine, apresentação, menu do celular e barra opaca; validação runtime (FT-021) com 3 ajustes de layout (cabeçalho em 320 px, cartão de resultado em 1024 px, período em 390 px); revisão de código (9 achados) e de segurança |
