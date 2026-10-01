# Change Request — CR-008: Identidade visual "Papel & Caneta"

**Versão:** 1.0  
**Data:** 2026-10-01  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

Aplica a identidade visual "Papel & Caneta" (direção A do canvas "Protótipo Simulado Fuvest"), conforme a tela "A · Especificação para o CR":

- **I1:** cores novas pelos tokens do `index.css` (papel creme, tinta azul-marinho, rosa da folha mais forte) e um token novo para o anel de foco.
- **I2:** fonte de títulos Fraunces, hospedada no próprio site.
- **I3:** marca e favicon com uma bolinha só ("resposta marcada").
- **I4:** botões, cartões, alternativas e número da questão.
- **I5:** marcas de sincronismo, círculo de caneta e bolinhas A–D, com moderação.
- **I6.1 a I6.3:** no início, a saudação, o cartão "Seu último simulado" e a Prova completa em destaque.

Comportamento e layout seguem os CR-001 a CR-007. Fora o I6, só a aparência muda.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (identidade visual + conteúdo novo no início) |
| Origem           | Evolução do produto: direção A escolhida no canvas (01/10/2026) |
| Urgência         | Próxima sprint |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- Tokens do CR-002: fundo cinza-claro `#f5f6f8`, tinta `#1d2430` e ação em azul de caneta esferográfica `#1e4fd8`. O anel de foco usa `caneta`.
- Fontes: Atkinson Hyperlegible Next na interface e Literata nas questões, ambas por `@fontsource-variable`. Títulos em Atkinson negrito.
- Marca: cinco bolinhas da folha, uma preenchida a grafite. O favicon tem duas bolinhas.
- O início com login é uma lista de quatro modos com o catálogo ao lado. Não há saudação nem resumo do último simulado.
- O número da questão é texto ("Questão 7 de 90").

### Problema ou Necessidade
O site tem uma aparência genérica. A direção A ("Papel & Caneta") dá a ele a identidade da folha de prova: papel creme, tinta azul-marinho e a bolinha rosa do impresso. O início também passa a mostrar o que importa para quem volta: o último simulado e o que estudar.

### Situação Desejada (TO-BE)
Os itens I1 a I6 da especificação, descritos em §4.1. A referência visual são as telas "A · Início", "A · Prova completa", "A · Início · celular", "A · Prova completa · celular" e "A · Resultado · celular". A especificação prevalece sobre o protótipo.

**Decisões do usuário (01/10/2026):**
- **D1 · Itens opcionais:** I6.1 (saudação), I6.2 ("Seu último simulado") e I6.3 (Prova completa em destaque) entram neste CR.
- **D2 · Extras do protótipo:** o que as telas mostram e a especificação não pede fica fora deste CR. Segue a especificação atual e entra no §4.3 ("fora de escopo").

**Consequências das decisões (Claude):**
- **Títulos (I2):** `h1` e `h2` usam Fraunces 650 por uma regra de base no `index.css`, e não classe a classe. Valem para todo o site, inclusive os diálogos e a pausa (que são `h2`). Títulos de cartão em `h3`, como os modos da apresentação, levam a classe `font-titulo`. Os números de destaque também: acertos e totais no resultado, no painel "Meu desempenho", na apresentação e no "Seu último simulado".
- **Botão secundário (I4):** a borda `borda-campo` vale também para os botões neutros da barra da resolução e para o "cancelar" dos diálogos, pelo mesmo motivo (`linha` some no creme). A forma desses botões (CR-001) não muda.
- **Cartões (I4):** `papel`, borda `linha`, cantos de 16 px e sem sombra. Vale para os cartões do início e da apresentação, o aviso de simulado em andamento e os diálogos. As miniaturas da prévia da apresentação (CR-007) continuam com sombra, porque são uma imagem do site, e não um cartão.
- **Folha (I4):** a especificação diz "sem mudança de forma, só as cores novas", então o cartão da folha no desktop mantém a borda rosa (`optico`), agora no tom novo.
- **Bolinhas A–D (I5):** o cartão da Prova completa também ganha a bolinha "A" (a especificação diz A–D nos cartões dos modos), embora o protótipo a omita.
- **Saudação (I6.1):** só com uma conta que tenha nome. Sem nome no Google, não há saudação (e nunca "Olá, Conta.").
- **"Seu último simulado" (I6.2):** é o simulado mais recente do histórico (`finalizadoEm`). As "mais fracas" são as duas disciplinas de menor aproveitamento, com empate pelo nome, na mesma ordem do resultado. Sem histórico, o cartão não aparece. O formato é o mesmo no celular e no desktop.
- **Prévia da apresentação (CR-007):** a miniatura da resolução acompanha a resolução nova (número na bolinha e cronômetro em Fraunces). As cores vêm pelos tokens.
- **Teste de contraste:** o rosa decorativo passa a ter 4,62:1 no branco. A trava "`optico` abaixo de 4,5:1" do CR-002 não vale mais e vira "`optico` ≥ 3:1" (anel gráfico, WCAG 1.4.11). A regra de usar `optico` só em anéis e na marca continua.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | I1 Tokens | Paleta do CR-002 | Nomes iguais, valores novos (tabela da especificação): `fundo` #FBF7EF, `tinta` e `caneta` #14213D, `caneta-escura` #0B1428, `caneta-clara` #F3EFE4, `tinta-suave` #55607A, `linha` #E6DFD0, `optico` #D6336C, `optico-texto` #A61E4D, `optico-claro` #FCE8EF, `grafite` #14213D, `borda-campo` #8C8577, `acerto`/`claro` #1F7A4D/#E7F3EC, `erro`/`claro` #B42318/#FCE9E7, `alerta`/`claro` #8A5A00/#FFF1D6; `papel` #ffffff sem mudança |
| 2 | I1 Foco | Anel `caneta` | Token novo `foco` #A61E4D no `:focus-visible` e nos focos próprios (filtros da revisão) |
| 3 | I1 Contraste | `tokens.test.ts` do CR-002 | Pares novos, incluindo `foco` sobre `fundo` e `papel` e `tinta-suave` na seleção |
| 4 | I2 Fonte de títulos | Atkinson negrito | `--font-titulo` Fraunces (variável) 650, por `@fontsource-variable/fraunces` no `main.tsx`: marca, `h1`, `h2`, títulos de cartão, número da questão, cronômetro e números de destaque. Atkinson e Literata ficam |
| 5 | I3 Marca | Cinco bolinhas | `Marca.tsx`: uma bolinha, anel `optico` e miolo `tinta`; nome em `font-titulo` no cabeçalho. `public/favicon.svg`: a mesma bolinha sobre `fundo`, cantos de 7 px |
| 6 | I4 Botões | Primário com texto `papel`; secundário com borda `linha` | Primário: `caneta`, texto `fundo`, 6 px, hover `caneta-escura`. Secundário: `papel` com borda `borda-campo` |
| 7 | I4 Cartões | Cantos de 8 a 12 px, alguns com sombra | `papel`, borda `linha`, 16 px, sem sombra |
| 8 | I4 Alternativas | Já com anel e letra rosa | Iguais, nas cores novas: marcada com bolinha `caneta`, borda `caneta`, fundo `caneta-clara` |
| 9 | I4 Número da questão | "Questão 7 de 90" em texto | Na resolução e na revisão: o número numa bolinha de anel `optico` em `font-titulo`, seguido de "de 90"; o leitor de tela continua ouvindo "Questão 7 de 90" |
| 10 | I4 Folhas | — | Sem mudança de forma, só as cores novas |
| 11 | I5 Marcas de sincronismo | — | Barrinhas `tinta` (12–14 × 4–5 px) na borda esquerda, `aria-hidden`: só no cartão da Prova completa no início e na borda da folha (cartão no desktop, painel no celular) |
| 12 | I5 Círculo de caneta | — | Traço à mão em `optico`, `aria-hidden`, no máximo um por tela: "reais" na apresentação e no início, o número de acertos no resultado |
| 13 | I5 Bolinhas A–D | Na apresentação (CR-007) | Também nos cartões dos modos do início |
| 14 | I6.1 Saudação | — | "Olá, ‹primeiro nome›." acima do título do início, com conta |
| 15 | I6.2 Último simulado | — | Cartão "Seu último simulado" no topo da lateral do início (no celular, depois dos modos): descrição e data, acertos ("58 de 90"), aproveitamento, "Para estudar" com as duas disciplinas mais fracas (barra e percentual), "Ver o resultado" e "Meu desempenho" |
| 16 | I6.3 Prova completa em destaque | Lista de quatro modos | Prova completa num cartão maior (com as marcas de sincronismo e a bolinha A) e Prova de um ano, Personalizado e Treino em três cartões menores (B, C, D); as ações e as regras de hoje (botão secundário com simulado em andamento, "Disponível quando…") ficam |

### 4.2 O que NÃO muda

- Comportamento, rotas, API, dados e regras (CR-001 a CR-007). Nenhum endpoint, tabela ou variável.
- Layout das telas (larguras, colunas, barras fixas, menu do celular) e os textos de hoje, fora o conteúdo novo do I6.
- Atkinson Hyperlegible Next na interface e Literata no texto das questões.
- A forma das folhas de respostas (desktop e celular) e da folha corrigida.
- Modo escuro, telas da direção B e os itens P3 da revisão de 30/09 (fora da especificação).

### 4.3 Fora de escopo (extras do protótipo)

Diferenças das telas de referência que a especificação não pede (D2). Fica o que a spec atual define e pode virar outro CR:

| # | Tela | Extra no protótipo | O que fica |
|---|------|--------------------|------------|
| E1 | A · Início | Cabeçalho de 68 px no desktop | Altura de hoje (cresce só o que a marca nova pedir) |
| E2 | A · Início | Conta no cabeçalho numa "pílula" com a inicial num círculo; links com mais respiro | Links como hoje (CR-005/CR-007) |
| E3 | A · Início, celular | Título do início em 50 px (33 px no celular) com espaçamento negativo | Tamanhos de hoje (`text-3xl`/`text-4xl`), agora em Fraunces |
| E4 | A · Início, celular | No cartão da Prova completa: sobretítulo "A MAIS PRÓXIMA DA PROVA REAL", etiquetas "90 questões · 5 horas · 8 disciplinas", miniatura da folha óptica, descrição "…com 5 horas de relógio correndo." e seta no botão | Cartão maior com o texto e o botão de hoje (I6.3) |
| E5 | A · Início, celular | Textos dos outros modos ("A prova original…", "Disciplinas, anos e quantidade.") | Textos de hoje |
| E6 | A · Início · celular | Cartões dos modos inteiros como link, com seta | Botão dentro do cartão, como hoje |
| E7 | A · Início | Lateral de 340 px | 256 px, como hoje |
| E8 | A · Início, celular | Títulos da lateral em caixa alta pequena ("SEU ÚLTIMO SIMULADO", "PROVAS NA BASE"…) | `h2` em Fraunces (I2) |
| E9 | A · Início | Links das provas sem negrito | Links de hoje |
| E10 | A · Prova completa | Barra do topo de 68 px com a marca e "Prova completa / 90 questões · 5 horas · 2023 a 2025" | A descrição do simulado de hoje |
| E11 | A · Prova completa | "Ocultar tempo"/"Mostrar tempo" e "Marcar para revisar"/"Marcada para revisar" | "Ocultar"/"Mostrar" e "Revisar"/"Marcada" |
| E12 | A · Prova completa, celulares | Fonte das citações alinhada à direita, em letra menor | Como hoje (é o D4 da revisão de 30/09) |
| E13 | A · Prova completa | Cartão da folha com borda `linha` | Borda rosa nas cores novas (folha sem mudança de forma) |
| E14 | A · Prova completa, celular | Botões da barra com cantos de 6 px (desktop) e 10 px (celular) | Forma do CR-001 |
| E15 | A · Início · celular | Botão "Menu" com cantos de 6 px | Forma do CR-007 |
| E16 | A · Prova completa · celular | Diálogo de finalizar com os botões empilhados, o principal em cima | Ordem e disposição de hoje |
| E17 | A · Resultado · celular | "Por questão" no lugar de "Tempo médio por questão", números em 3 colunas e o cabeçalho anterior ao CR-007 | Textos, disposição e cabeçalho de hoje |
| E18 | A · Resultado · celular | Revisão com "Questão N de 90" sem bolinha | Com a bolinha (I4 pede resolução e revisão) |

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | RF-008 (saudação, último simulado, Prova completa em destaque), US-017, RNF-003 (contraste com a paleta nova), glossário, histórico | v4.2 |
| `/docs/02-ARCHITECTURE.md` | Sim | Stack (fontes), estrutura (`components/inicio/`, `CirculoCaneta`, `MarcasSincronismo`), padrões do frontend (tokens e títulos), ADR-013 (identidade por tokens e fontes no próprio site), dependências | v1.8 |
| `/docs/03-SPEC.md` | Sim | Resumo, specs afetadas, changelog | v1.8 |
| `/docs/specs/03-resolucao.md` | Sim | Tokens (tabela nova), início (I6), número da questão, cronômetro, folha (marcas), UT e FT | v1.8 |
| `/docs/specs/04-correcao-resultado.md` | Sim | Resultado (círculo, números em Fraunces), revisão (número na bolinha) | v1.5 |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | Apresentação (§9.2: círculo em "reais", títulos e números em Fraunces, cartões, prévia) | v1.4 |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-008 |
| `/docs/05-DEPLOY-GUIDE.md` | Não | — | Sem variável, migration ou procedimento novo; a fonte vai no build |
| `CLAUDE.md` | Sim | Stack (Fraunces), Change Requests, Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `frontend/package.json`, `package-lock.json` | `@fontsource-variable/fraunces` |
| Modificar | `frontend/src/main.tsx` | Importar a Fraunces |
| Modificar | `frontend/src/index.css` | Tokens novos, `--color-foco`, `--font-titulo`, títulos `h1`/`h2` e foco |
| Modificar | `frontend/src/tokens.test.ts` | Pares de contraste novos (UT-047) |
| Modificar | `frontend/public/favicon.svg` | Bolinha única |
| Modificar | `frontend/src/components/Marca.tsx`, `Layout.tsx` | Marca nova e nome em `font-titulo` |
| Modificar | `frontend/src/components/estilos.ts` | Primário, secundário, botões neutros da barra, `CARTAO` |
| Criar | `frontend/src/components/CirculoCaneta.tsx`, `MarcasSincronismo.tsx` | Motivos do I5 |
| Modificar | `frontend/src/components/questao/QuestaoView.tsx` | `TituloQuestao` (número na bolinha) |
| Modificar | `frontend/src/components/resolucao/Cronometro.tsx`, `PainelFolha.tsx`, `TelaPausa.tsx`; `pages/ResolucaoPage.tsx` | Fonte do cronômetro, marcas da folha, botão primário |
| Modificar | `frontend/src/components/ConfirmDialog.tsx` | Botões e cartão |
| Modificar | `frontend/src/pages/HomePage.tsx` | I6.1, I6.3, I5 e cartões |
| Criar | `frontend/src/components/inicio/UltimoSimulado.tsx` | I6.2 |
| Modificar | `frontend/src/utils/desempenho.ts` | `ultimoSimulado` e `disciplinasMaisFracas` |
| Modificar | `frontend/src/pages/ApresentacaoPage.tsx`, `components/apresentacao/PreviaProduto.tsx` | Círculo em "reais", títulos e números, cartões, miniatura |
| Modificar | `frontend/src/components/resultado/ResumoResultado.tsx`, `RevisaoQuestoes.tsx`; `pages/DesempenhoPage.tsx` | Círculo nos acertos, números em Fraunces, foco dos filtros |
| Criar/Modificar | `frontend/src/pages/inicio.test.tsx`, `pages/identidade.test.tsx`, `utils/desempenho.test.ts` | UT-048 a UT-051 |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma mudança | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação: este CR, PRD v4.2, Arquitetura v1.8 (ADR-013), 03-SPEC v1.8, specs 03, 04 e 07, Plano | — | Docs revisados e commitados |
| CR-T-02 | I1 e I2: tokens, foco, Fraunces e títulos; `tokens.test.ts` | CR-T-01 | UT-047 verde; testes existentes verdes |
| CR-T-03 | I3 e I4: marca, favicon, botões, cartões, número da questão, cronômetro | CR-T-02 | UT-048 verde |
| CR-T-04 | I5 e I6: marcas, círculo, início (saudação, último simulado, Prova completa em destaque), apresentação e resultado | CR-T-03 | UT-049 a UT-051 verdes |
| CR-T-05 | Validação runtime (FT-022), revisão de segurança (dependência nova), `/code-review` | CR-T-04 | Registrados na §8 |
| CR-T-06 | Docs finais, merge + push + CI verde | CR-T-05 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [ ] I1: tokens com os valores da especificação; anel de foco `foco` visível em volta do botão azul-marinho; contrastes da especificação conferidos pelo `tokens.test.ts`
- [ ] I2: Fraunces 650 na marca, nos `h1`/`h2`, nos títulos de cartão, no número da questão, no cronômetro e nos números de destaque; nunca em texto corrido, botões ou rótulos; carregada do próprio site (CSP inalterada)
- [ ] I3: marca de uma bolinha no cabeçalho (desktop e celular) e favicon novo
- [ ] I4: botões primário e secundário, cartões, alternativas e número da questão na bolinha (resolução e revisão), com o nome acessível "Questão N de M"
- [ ] I5: marcas de sincronismo só no cartão da Prova completa e na folha (desktop e celular); círculo de caneta só em "reais" (apresentação e início) e nos acertos (resultado); bolinhas A–D nos modos
- [ ] I6.1: "Olá, ‹primeiro nome›." com conta com nome; nada sem conta ou sem nome
- [ ] I6.2: "Seu último simulado" com o mais recente, acertos, aproveitamento e as duas disciplinas mais fracas, com os dois links; ausente sem histórico
- [ ] I6.3: Prova completa em destaque e os outros três modos em cartões menores, com as ações e as regras de hoje
- [ ] Sem rolagem horizontal em 320 e 390 px; console limpo
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança — UT-047 a UT-051
- [ ] Fluxo afetado exercitado em runtime antes do merge (FT-022) — registrar abaixo
- [ ] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — registrar abaixo
- [ ] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: dependência nova — registrar abaixo
- [ ] Documentos afetados foram atualizados
- [ ] CI verde na branch e em `master`

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Com `caneta` = `tinta`, um link perde a distinção do texto | Média | Médio | Links continuam sublinhados (`LINK`); o item ativo do cabeçalho também; nenhum estado depende só da cor |
| 2 | Algum par de cores novo fica abaixo do AA | Baixa | Alto | `tokens.test.ts` com os pares da especificação; FT-022 confere as telas principais |
| 3 | A fonte nova pesa no carregamento | Média | Baixo | Só o eixo de peso da Fraunces, em subconjuntos latinos com `font-display: swap` (padrão do fontsource) |
| 4 | Título em Fraunces muda a largura e quebra o layout em 320 px | Média | Médio | FT-022 em 320 e 390 px; tamanhos de hoje mantidos |
| 5 | O "Seu último simulado" mostra dado de outra conta | Baixa | Médio | Vem do `useHistorico`, que já separa o histórico por conta (ADR-011) |
| 6 | Dependência nova com vulnerabilidade | Baixa | Baixo | Pacote só de CSS e fontes (OFL-1.1); `npm audit` registrado |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-008` → `git revert -m 1 <merge do CR-008>` → merge em `master` → push. Volta a paleta do CR-002, a marca de cinco bolinhas e o início em lista.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-008-identidade-papel-caneta`.

### 10.2 Rollback de Migration

- **Migration afetada:** N/A — nenhuma migration
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade é destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** só aparência e leitura do histórico que já existe.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] Início, resolução e resultado com a aparência anterior
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-01 | Rafael Peixoto (com Claude) | CR criado com os itens I1 a I5, a D1 (I6.1 a I6.3 incluídos) e a D2 (extras do protótipo fora de escopo) |
