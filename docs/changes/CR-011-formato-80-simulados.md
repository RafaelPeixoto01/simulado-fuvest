# Change Request — CR-011: Formato de 80 questões (FUVEST 2027) e simulados oficiais da FUVEST

**Versão:** 1.0  
**Data:** 2026-10-02  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

A partir do vestibular FUVEST 2027, a 1ª fase passa a ter **80 questões**, não mais 90 (Resolução CoG nº 9008/2026, art. 11). A FUVEST também publicou dois **simulados oficiais** nesse formato, a 1ª edição (26/04/2026) e a 2ª edição (26/07/2026), cada um com 80 questões. Este CR adapta o site ao formato novo e o prepara para receber os simulados:

- A **Prova completa** passa a ter 80 questões.
- A **Prova de um ano** usa a quantidade de questões da própria prova: 90 de 2020 a 2026, 80 nos simulados.
- Os simulados oficiais entram como **provas próprias**, que podem ser feitas inteiras, e as questões deles entram **misturadas no banco geral** (Personalizado, Treino, Meu desempenho), com a origem visível em cada questão.
- A comparação com a nota de corte passa a ser **proporcional**, porque os simulados têm 80 questões e as listas de corte publicadas são em pontos de 90.

A curadoria das 160 questões dos dois simulados é conteúdo e fica fora deste CR (branch `conteudo/simulados-2027`, depois do merge). Neste CR, os dois simulados só são extraídos em rascunho, para validar o parser novo.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Mudança de Regra de Negócio + Mudança de Arquitetura (identidade da prova, migration) + Nova Feature (simulados oficiais) |
| Origem           | Evolução do produto (mudança do formato oficial da FUVEST) |
| Urgência         | Próxima sprint. A 1ª fase da FUVEST 2027 é em 01/11/2026 |
| Complexidade     | Alta |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- Todo o site supõe "uma prova por ano, com 90 questões":
  - a prova é identificada pelo ano (`provas.ano` é a chave primária);
  - as questões e os textos-base são `AAAA-NNN` e `AAAA-tbNN` (ADR-006), e as figuras ficam em `/figuras/AAAA/`;
  - a validação exige exatamente 90 questões (V01, `TOTAL_QUESTOES = 90`);
  - o parser de gabarito espera 90 respostas.
- A Prova completa tem 90 questões e 5 h, distribuídas pela média das provas (RN-003). O Personalizado dá 200 s por questão (5 h ÷ 90, RN-009).
- A comparação com o corte (RN-018) vale só nos simulados de 90 questões da Prova completa e da Prova de um ano, em pontos de 0 a 90. O mínimo da FUVEST é fixo em 27 (`MINIMO_FUVEST`).
- A base tem as provas de 2020 e 2022–2025, todas com 90 questões. As notas de corte publicadas são de 2020 e 2022–2026, todas em pontos de 90.

### Problema ou Necessidade
- **O formato mudou.** A Resolução CoG nº 9008/2026 (FUVEST 2027, DOE de 31/07/2026), art. 11, diz: "§ 1º – A prova de conhecimentos gerais será constituída de 80 questões [...]", e quem tem menos de 30% é eliminado (24 acertos, eram 27). O Guia de Provas 2027 confirma: um dia, até cinco horas, 80 questões e as mesmas 12 disciplinas.
  - O resto não muda: a convocação para a 2ª fase (4 × as vagas, agora com um piso de 10 por carreira e modalidade), a 2ª fase e a fórmula da nota final continuam como em 2026.
  - Com 90 questões, a Prova completa deixou de reproduzir a prova que o estudante vai fazer em 01/11/2026.
- **Simulados oficiais.** A FUVEST aplicou dois simulados no formato novo e publicou as provas e os gabaritos (`fuvest.br/simulado-fuvest-2027-provas-gabarito`).
  - Cada edição tem 4 versões (S1–S4) com as mesmas 80 questões em ordem rotacionada: o gabarito traz uma tabela de correspondência entre elas.
  - São 160 questões oficiais novas e as únicas no formato de 80.
  - Pelo modelo atual, os dois simulados não cabem: são ambos "2027" e colidiriam entre si e com a prova real de 2027.

**Resultado do teste dos dados (02/10/2026, só leitura):**
- **PDFs** (`https://www.fuvest.br/wp-content/uploads/`):
  - 1ª edição: `simulado2027-1edicao-prova-S1.pdf` (34 páginas) e `simulado2027-1edicao-gabarito-retificado.pdf`;
  - 2ª edição: `simulado2027-2edicao-prova-S1.pdf` (32 páginas) e `simulado2027-2edicao-gabarito-retificado.pdf`;
  - o texto sai com pdfplumber (não é digitalizado nem precisa de OCR).
- **Layout** das duas edições:
  - duas colunas, como o de 2025;
  - o número da questão vem em Baloo 2 ExtraBold 14 pt entre chaves (`{01}`), e o texto em Arial Light 9 pt;
  - foram encontrados 80 marcadores, de 1 a 80, sem falta nem repetição, em cada edição;
  - na 1ª edição, o espaço entre palavras sai como o glifo `(cid:172)`; na 2ª, como espaço normal;
  - há imagens embutidas (145 na 1ª edição, 43 na 2ª) e fios horizontais de menos de 10 pt de altura, que são enfeite.
- **Gabarito:**
  - cabeçalho `PROVA S1 PROVA S2 PROVA S3 PROVA S4` e linhas `n L n+40 L` por versão;
  - anulada marcada com `*`: a 1ª edição tem a 51 da S1 anulada, e a 2ª tem uma anulada por versão.

**Decisões do usuário (02/10/2026):**
- **D1 · Onde entram os simulados:** como provas próprias, feitas inteiras como a Prova de um ano, **e** misturados no banco geral (Personalizado, Treino, Meu desempenho), com a origem visível em cada questão.
- **D2 · Tamanho das provas:**
  - a Prova completa passa a ter 80 questões;
  - a Prova de um ano usa a quantidade de questões daquela prova: 90 de 2020 a 2026, 80 nos simulados (e na FUVEST 2027, quando ela entrar).
- **D3 · Comparação proporcional com o corte:**
  - a nota comparada é acertos ÷ questões do simulado × pontos da prova da lista de corte;
  - hoje a lista de corte é a de 2026, em pontos de 90, e o resultado mostra que a conversão é uma estimativa;
  - quando a lista de 2027 sair (convocação para a 2ª fase em 23/11/2026, em pontos de 80) e for publicada como conteúdo, ela vira a lista mais recente.

### Situação Desejada (TO-BE)
- **Código da prova.**
  - Uma prova passa a ser identificada por um código: `AAAA` no vestibular (igual ao ano, como hoje) e `AAAAsN` no simulado oficial (`2027s1`, `2027s2`).
  - O código é o diretório do pacote (`data/provas/2027s1/`), o prefixo dos ids (`2027s1-001`, `2027s1-tb01`) e o caminho das figuras (`/figuras/2027s1/q001-1.webp`).
  - Os ids que já existem não mudam: históricos, simulados em andamento e reportes continuam valendo.
- **Quantidade de questões por prova.**
  - O pacote declara `total_questoes` (80 ou 90; 90 quando ausente, como nas 5 provas atuais).
  - A V01 confere a numeração de 1 até esse total, e o parser de gabarito espera esse total.
- **Simulados oficiais no fluxo do curador.**
  - O pacote ganha `tipo: simulado` e `edicao`.
  - A CLI aceita `--prova 2027s1`, com `--ano` mantido como sinônimo.
  - Uma família de layout nova, `familia_2027`, extrai a prova e o gabarito dos simulados.
- **Prova completa** com 80 questões e 5 h, distribuídas pela média das proporções de cada disciplina nas provas publicadas (P2).
- **Prova de um ano.**
  - A página de escolha lista as provas da FUVEST e, numa seção própria, os simulados oficiais.
  - Cada prova é feita com o seu total de questões e 5 h.
- **Origem visível.** Cada questão mostra a sua origem, por exemplo "Matemática, Simulado FUVEST 2027 · 1ª edição (questão 12)", e o início lista o PDF oficial de cada prova e simulado.
- **Comparação com o corte.**
  - Vale para a Prova completa e para a Prova de um ano de qualquer tamanho.
  - Quando o total do simulado e os pontos da lista são iguais, compara direto. Quando são diferentes, converte e mostra os dois números, por exemplo: "Sua nota: 60 de 80 · equivale a 67,5 de 90 (estimativa)".
  - As notas de corte passam a saber os pontos da prova de cada ano (90 até 2026, 80 em 2027), e o mínimo da FUVEST passa a ser 30% desses pontos (27 ou 24).

**Propostas técnicas e de produto, aprovadas no Gate 0 (02/10/2026)** — decorrem de D1–D3; o usuário escolheu a opção recomendada em P2, P3 e P4 e aprovou P1 e P5:
- **P1 · Identidade.**
  - O código de simulado é `AAAAsN`: o ano FUVEST de referência e a edição, com `s` minúsculo.
  - As colunas `questoes.id` e `reportes.questao_id` vão de 8 para 12 caracteres.
  - A migration `005` recria as tabelas derivadas do repositório (`provas`, `textos_base`, `questoes`), que a sincronização do start repovoa (ADR-002). As tabelas de conta e os reportes não perdem nada.
- **P2 · Distribuição da Prova completa (RN-003).**
  - Média, entre todas as provas publicadas (vestibulares e simulados), da proporção de cada disciplina, multiplicada por 80 e arredondada pelo maior resto (como hoje).
  - Com 5 provas de 90 e 2 simulados de 80, o formato de 90 pesa mais, até haver mais provas de 80.
- **P3 · Personalizado com o ritmo novo (RN-009):** 225 s por questão (5 h ÷ 80 = 3 min 45 s), no lugar de 200 s. O limite de 1 a 90 questões não muda.
- **P4 · Onde os simulados aparecem.**
  - Na página da Prova de um ano, numa seção "Simulados oficiais da FUVEST".
  - No filtro de anos do Personalizado e do Treino, pelo ano de referência (2027).
  - Na vitrine pública, nas questões, mas não em `anos`, que continua só com os vestibulares: a apresentação segue dizendo "5 provas, 2020–25", e o total de questões inclui as dos simulados.
  - No início, o texto vira "N questões de 5 provas (2020 a 2025) e 2 simulados oficiais".
- **P5 · Exibição da conversão.**
  - A nota convertida tem 1 casa decimal, e "faltam" e "atingiu" usam a nota convertida.
  - O link "Ver as notas de corte de AAAA" só aparece na Prova de um ano de vestibular: simulado não tem lista própria de corte.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Identidade da prova | `ano` (int), chave de `provas`; ids `AAAA-NNN`, `AAAA-tbNN`; `/figuras/AAAA/` | **Código** `AAAA` ou `AAAAsN`, chave de `provas` (`provas.codigo`), com `ano` de referência, `tipo` e `edicao`; ids `CODIGO-NNN`, `CODIGO-tbNN`; `/figuras/CODIGO/`; regex dos ids `^\d{4}(s\d)?-\d{3}$`. ADR-006 emendado |
| 2 | Pacote (`prova.yaml`) | `ano`, `versao` (`V1`–`V4`, letra ou `unica`) | + `tipo` (`vestibular` padrão / `simulado`), `edicao` (1–9, obrigatória e só no simulado), `total_questoes` (80 ou 90, padrão 90); `versao` aceita `S1`–`S4`. O diretório tem de ser o código |
| 3 | Validação | V01: exatamente 90 | V01: exatamente `total_questoes`, numeradas de 1 ao total. `Questao.numero` continua 1–90 |
| 4 | Banco | `provas.ano` PK; `questoes.prova_ano`, `textos_base.prova_ano` FK; `questoes.id` varchar(8) | Migration `005`: `provas.codigo` varchar(8) PK + `ano`, `tipo`, `edicao`; `questoes.prova_codigo`, `textos_base.prova_codigo` FK; `questoes.id` e `reportes.questao_id` varchar(12). As três tabelas derivadas são recriadas (a sincronização repovoa); `reportes` só alarga a coluna |
| 5 | Ingestão | Registry ano → família; `--ano`; gabarito com 90 respostas | Registry código → família; `--prova CODIGO` (`--ano` como sinônimo; `cortes` continua por ano); família **`familia_2027`** (layout e gabarito dos simulados: marcador `{NN}`, `(cid:172)` como espaço, fios finos ignorados, gabarito `S1`–`S4` com `*` anulada e `n L n+40 L`); o gabarito confere o total da prova |
| 6 | Prova completa (RF-009, RN-003) | 90 questões, média das contagens | **80** questões (`TOTAL_PROVA_COMPLETA`), média das proporções × 80 (P2); disponível com ≥ 80 válidas; 5 h |
| 7 | Prova de um ano (RF-011) | `{modo: "ano", ano}`; 90 questões; página com "FUVEST AAAA" | `{modo: "ano", prova: CODIGO}`; todas as questões da prova (80 ou 90), anuladas incluídas, 5 h; a página separa "Provas da FUVEST" e "Simulados oficiais da FUVEST" (P4) |
| 8 | Personalizado (RN-009) | 200 s por questão | 225 s por questão (P3); filtro de anos pelo ano de referência das provas (P4) |
| 9 | Questão pública | `ano`, `numero` | + `prova` (código) e `origem` ("FUVEST 2025", "Simulado FUVEST 2027 · 1ª edição"); a resolução mostra a origem (RN-013) |
| 10 | Catálogo | `ProvaCatalogo{ano, versao, total_questoes, urls}` | + `codigo`, `tipo`, `edicao`, `rotulo`; ordem: ano decrescente, depois código decrescente |
| 11 | Notas de corte (RN-018) | Pontos sempre de 90; `MINIMO_FUVEST = 27`; corte ≤ máximo ≤ 90 | Arquivo ganha `pontos_prova` (80 ou 90, padrão 90); mínimo = 30% dos pontos (27 ou 24); `GET /api/notas-corte` e a carreira-alvo da sessão trazem `pontos_prova` |
| 12 | Comparação com o corte | Só simulados de 90 questões; acertos comparados direto | Prova completa e Prova de um ano de qualquer tamanho; nota = acertos ÷ total × `pontos_prova` da lista (1 casa decimal), com "(estimativa)" quando há conversão (D3, P5). Resultado, início e página de cortes ("de 0 a N", mínimo) |
| 13 | Textos | "90 questões" (início, apresentação, prévia), "3 min 20 s por questão" | "80 questões", "3 min 45 s por questão"; prévia da apresentação com 80; início com a contagem de provas e simulados (P4) |
| 14 | Vitrine | `anos` de todas as provas | `anos` só dos vestibulares; `total_questoes` inclui os simulados (P4). Nenhum campo novo |

### 4.2 O que NÃO muda

- Os ids das questões e dos textos-base que já existem (`2025-037`, `2025-tb03`), as URLs das figuras dessas provas, os históricos guardados (servidor e navegador), os simulados em andamento e os reportes.
- Os pacotes publicados de 2020 e 2022–2025 e os arquivos de notas de corte de 2020 e 2022–2026: os campos novos têm padrão (`tipo: vestibular`, `total_questoes: 90`, `pontos_prova: 90`) e nenhum arquivo de conteúdo precisa ser editado.
- A Prova de um ano dos vestibulares de 2020–2025: 90 questões, 5 h, anuladas como acerto (RN-002).
- Treino (lote de 20, sem cronômetro), correção (RN-008), RN-004, RN-005, RN-014, RN-015, o limite de 1 a 90 no Personalizado e na correção, o modelo do histórico (`modo` continua `completa`/`personalizado`/`ano`).
- Contas, sessão, carreira-alvo (o par ano/código), login obrigatório, vitrine sem campos novos, rate limits.
- Nenhuma dependência nova.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, Visão Geral (1ª fase de 80 questões desde 2027; simulados oficiais), Objetivos, RF-001, RF-002, RF-009, RF-011, RF-029, RN-001, RN-003, RN-007, RN-009, RN-013, RN-018, US-001, US-003, US-021 (nova: simulados oficiais), Dependências, Premissas (S1–S4 conferido), Glossário (1ª fase, Simulado oficial, Código da prova, Nota de corte) | v6.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Arquitetura geral, estrutura (`data/provas/CODIGO/`, `familia_2027`), Modelagem (`provas.codigo`, `prova_codigo`, ids), ADR-006 emendado, ADR-015 (código da prova e total por prova; migration que recria as tabelas derivadas) | v1.11 |
| `/docs/03-SPEC.md` | Sim | Índice, contratos (`GerarAno.prova`, `QuestaoPublica.prova/origem`, `ProvaCatalogo`, `pontos_prova`), migration 005, formato dos ids | v1.11 |
| `/docs/specs/01-ingestao.md` | Sim | Schema do pacote, código da prova, V01, CLI (`--prova`), família 2027, sincronização | Atualizar |
| `/docs/specs/02-catalogo-e-geracao.md` | Sim | Schemas, RN-003 (proporções × 80), modos completa/ano/personalizado, tempos, ids, figuras | Atualizar |
| `/docs/specs/03-resolucao.md` | Sim | Origem na questão, página da Prova de um ano, textos do início, Personalizado | Atualizar |
| `/docs/specs/04-correcao-resultado.md` | Sim | Bloco "Notas de corte" (comparação proporcional) | Atualizar |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | Formato do `questao_id` no histórico, vitrine (`anos` só vestibulares), textos da apresentação | Atualizar |
| `/docs/specs/08-notas-de-corte.md` | Sim | `pontos_prova`, mínimo de 30%, C03, comparação proporcional, textos da página | Atualizar |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-011 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Migration 005 (recria as tabelas derivadas; janela curta no deploy), rollback, operação do curador (simulado oficial, `--prova`), cortes de um ano com `pontos_prova` | Atualizar |
| `CLAUDE.md` | Sim | Comandos (`--prova`), Change Requests, Lembretes (código da prova, simulados como conteúdo), Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Modificar | `backend/app/pacote/schema.py` | `tipo`, `edicao`, `total_questoes`, `versao` com `S1`–`S4`; `codigo` (propriedade); `CODIGO_PROVA` (regex) |
| Modificar | `backend/app/pacote/validacao.py` | V01 pelo `total_questoes`; `TOTAL_PROVA_COMPLETA = 80` |
| Modificar | `backend/app/pacote/sincronizar.py` | Seleção e gravação por código (diretório = código), ids `CODIGO-NNN`, `total_questoes` e `rotulo`/`tipo`/`edicao` na prova |
| Modificar | `backend/app/pacote/notas_corte.py` | `pontos_prova` (padrão 90), mínimo 30% (C03), máximo ≤ pontos |
| Modificar | `backend/app/models.py` + criar `backend/alembic/versions/005_codigo_prova.py` | `provas.codigo` PK, `ano`, `tipo`, `edicao`; `prova_codigo`; ids de 12 caracteres |
| Modificar | `backend/app/schemas.py` | `IdQuestao`, `CodigoProva`, `GerarAno.prova`, `QuestaoPublica.prova/origem`, `ProvaCatalogo`, `NotasCorteResponse.pontos_prova`, `CarreiraAlvo.pontos_prova` |
| Modificar | `backend/app/services/catalogo.py`, `geracao.py`, `serializacao.py`, `notas_corte.py` | Distribuição × 80, completa com 80, modo ano por código, filtro de ano pela prova, origem, figuras por código, vitrine com `anos` dos vestibulares, `pontos_prova` |
| Modificar | `backend/app/routers/figuras.py`, `questoes.py` | Regex do código e dos ids |
| Modificar | `backend/ingestao/familias.py`, `layouts/__init__.py`, `gabarito/__init__.py`, `cli.py`, `baixar.py` | Registry por código; `--prova`; cache por código; gabarito confere o total |
| Criar | `backend/ingestao/layouts/familia_2027.py`, `backend/ingestao/gabarito/familia_2027.py` | Família dos simulados 2027 |
| Criar | `backend/tests/fixtures/pdfs/simulado2027-*.pdf` | Páginas recortadas dos PDFs oficiais (gabarito + 2 páginas da prova) |
| Modificar | `backend/tests/fixtures/gerar_pacotes.py` + testes existentes afetados | Simulado sintético `2099s1` (80 questões) para testes e site local |
| Criar | `backend/tests/test_codigo_prova.py`, `test_ingestao_familia_2027.py` (+ casos novos nos testes existentes) | Testes IT-028 a IT-034, BT-087 a BT-096 |
| Modificar | `frontend/src/types.ts`, `services/api.ts`, `test/apiFalsa.ts` | Tipos e contratos novos |
| Modificar | `frontend/src/components/questao/QuestaoView.tsx` | Origem da questão |
| Modificar | `frontend/src/pages/EscolherAnoPage.tsx`, `HomePage.tsx`, `ApresentacaoPage.tsx`, `ConfigurarPersonalizadoPage.tsx`, `TreinoPage.tsx`, `NotasCortePage.tsx`, `components/apresentacao/PreviaProduto.tsx` | Seção de simulados, textos de 80, contagem de provas e simulados, ritmo de 225 s, anos distintos, "de 0 a N" |
| Modificar | `frontend/src/utils/notasCorte.ts`, `components/notasCorte/ComparacaoCorte.tsx`, `components/inicio/UltimoSimulado.tsx`, `pages/ResultadoPage.tsx` | Comparação proporcional (D3, P5) |
| Modificar | Testes do frontend afetados + novos | UT-062 a UT-068 |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| Recriar | `provas`, `textos_base`, `questoes` com a chave pelo código (dados derivados do repositório; repovoados pela sincronização do start) | Sim (`005_codigo_prova`) |
| Alargar | `reportes.questao_id` de varchar(8) para varchar(12) (dados preservados) | Sim (`005_codigo_prova`) |

**Migration (005):**
```sql
DROP TABLE questoes; DROP TABLE textos_base; DROP TABLE provas;  -- derivadas (ADR-002)
CREATE TABLE provas (
  codigo VARCHAR(8) PRIMARY KEY,          -- "2025", "2027s1"
  ano INTEGER NOT NULL,                   -- ano FUVEST de referência
  tipo VARCHAR(10) NOT NULL,              -- "vestibular" | "simulado"
  edicao SMALLINT NULL,                   -- só no simulado
  versao VARCHAR(10) NOT NULL, url_prova TEXT NOT NULL, url_gabarito TEXT NOT NULL,
  total_questoes INTEGER NOT NULL, sincronizado_em TIMESTAMPTZ NOT NULL);
CREATE TABLE textos_base (id VARCHAR(12) PRIMARY KEY,
  prova_codigo VARCHAR(8) NOT NULL REFERENCES provas(codigo) ON DELETE CASCADE, conteudo JSON NOT NULL);
CREATE TABLE questoes (id VARCHAR(12) PRIMARY KEY,
  prova_codigo VARCHAR(8) NOT NULL REFERENCES provas(codigo) ON DELETE CASCADE,
  numero INTEGER NOT NULL, ... ,            -- demais colunas iguais às de hoje (com assunto)
  UNIQUE (prova_codigo, numero));
ALTER TABLE reportes ALTER COLUMN questao_id TYPE VARCHAR(12);   -- batch_alter_table no SQLite
```
Índices iguais aos de hoje, pelo código (`ix_questoes_prova_codigo`, `ix_textos_base_prova_codigo`, disciplina, assunto). O `downgrade` recria as três tabelas no formato de antes, também vazias: o código anterior repovoa no start e ignora os pacotes de simulado (diretório que não é um ano). Localmente, depois do `upgrade`, roda-se `importar` de novo.

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação inicial: este CR. **Gate 0: o usuário revisa D1–D3 e as propostas P1–P5 antes de qualquer código** | — | CR aprovado |
| CR-T-02 | Pacote e banco: schema (`tipo`, `edicao`, `total_questoes`, `S1`–`S4`, código), V01 pelo total, migration 005 e models, sincronização por código, simulado sintético `2099s1` | CR-T-01 | IT-028 a IT-031 e BT-087 verdes; migration testada (upgrade/downgrade, SQLite e Postgres no CI) |
| CR-T-03 | Ingestão: registry por código, `--prova`, `familia_2027` (layout + gabarito) com fixtures recortadas; extrair os rascunhos de `2027s1` e `2027s2` sem publicar | CR-T-02 | IT-032 a IT-034 verdes; os dois rascunhos extraídos com 80 questões e gabarito casado |
| CR-T-04 | API: catálogo (rótulo, tipo, distribuição × 80), geração (completa 80, ano por código, filtro de ano), ids e figuras por código, origem na questão, vitrine | CR-T-02 | BT-088 a BT-094 verdes; regressão verde |
| CR-T-05 | Notas de corte: `pontos_prova`, mínimo de 30%, `pontos_prova` na API e na carreira-alvo da sessão | CR-T-02 | BT-095 e BT-096 verdes |
| CR-T-06 | Frontend: tipos, origem, página da Prova de um ano com simulados, textos de 80, ritmo de 225 s, filtros de ano, comparação proporcional (resultado, início, página de cortes) | CR-T-04, CR-T-05 | UT-062 a UT-068 verdes; FT-025 exercitado |
| CR-T-07 | Revisão OWASP, validação runtime (HTTP real + Playwright com o provedor falso e um rascunho de simulado importado com `--incluir-rascunhos`), `/code-review`, docs finais, merge + push + CI verde | CR-T-02 a CR-T-06 | Todos os critérios da §8 marcados |

**Depois do CR (conteúdo, sem CR):** curadoria dos dois simulados na branch `conteudo/simulados-2027` (pendências, figuras, disciplina e assunto de cada questão), revisão do usuário, publicação.

**Testes previstos:**
- IT-028 pacote de simulado válido (tipo, edição, 80 questões, `S1`) e inválidos (edição sem tipo, simulado sem edição, `total_questoes` 85, diretório diferente do código).
- IT-029 V01 com 80.
- IT-030 sincronização de um vestibular e um simulado (ids `2099s1-001`, figuras).
- IT-031 pacotes atuais sem os campos novos continuam válidos (padrões).
- IT-032 gabarito `familia_2027` (fixture: 80 respostas da S1, anulada com `*`).
- IT-033 layout `familia_2027` (fixture: questão simples, com figura e com `(cid:172)`).
- IT-034 CLI com `--prova 2027s1` e `--ano` como sinônimo.
- BT-087 migration 005 (upgrade/downgrade sem perder contas, sessões, históricos e reportes).
- BT-088 catálogo com simulado (código, rótulo, ordem).
- BT-089 distribuição soma 80 (proporções).
- BT-090 completa com 80.
- BT-091 modo ano por código (80 e 90; 404).
- BT-092 ids novos em questões, correção, reportes, treino e histórico; formatos inválidos → 422.
- BT-093 figura `/figuras/2099s1/...` (200) e código inválido (404).
- BT-094 vitrine com `anos` só dos vestibulares.
- BT-095 notas de corte com `pontos_prova: 80` (mínimo 24, máximo ≤ 80; corte 25 válido em 80 e inválido em 90).
- BT-096 `pontos_prova` na API e na sessão.
- UT-062 pontos comparáveis (mesma escala, 80→90, 90→80, personalizado nulo).
- UT-063 bloco do resultado com conversão e "(estimativa)".
- UT-064 linha do início com conversão.
- UT-065 página da Prova de um ano com a seção de simulados.
- UT-066 origem da questão.
- UT-067 textos de 80 e ritmo de 225 s.
- UT-068 página de cortes com "de 0 a N" e mínimo da lista.
- FT-025 simulado oficial de ponta a ponta no navegador.

---

## 8. Critérios de Aceite

- [x] Um pacote de simulado oficial (`tipo: simulado`, `edicao`, 80 questões, versão `S1`) é validado, sincronizado e servido com ids `2027sN-NNN`; os pacotes publicados de 2020 e 2022–2025 continuam válidos sem edição — IT-028, IT-030, IT-031; `validar --todas` verde com os pacotes reais sem nenhuma edição; `importar` sincronizou 2020 e 2022–2025 no `local.db` depois da `005`
- [x] Os ids existentes (`AAAA-NNN`) continuam valendo em questões, correção, reportes, treino e histórico; ids `AAAA` + `sN` também; outros formatos → 422 — BT-092 e a regressão inteira (os testes antigos usam `2098-NNN`/`2099-NNN`); HTTP real abaixo
- [x] `python -m ingestao extrair --prova 2027s1` (e `2027s2`) gera o rascunho com 80 questões e o gabarito casado (anulada com `*`); `--ano` continua aceito — rodado com os PDFs reais (`baixar` + `extrair` num diretório temporário): 80 questões nas duas edições, nenhuma sem resposta, anuladas 51 (1ª) e 20 (2ª), 42 e 41 figuras, sem pendência V01; IT-032 a IT-034
- [x] A Prova completa tem 80 questões, na distribuição proporcional das provas publicadas, com 5 h — BT-089, BT-090; HTTP real e Playwright ("Questão 1 de 80", "Folha 0/80", 04:59:59)
- [x] A Prova de um ano lista as provas da FUVEST e, em seção própria, os simulados oficiais; cada uma é feita com o seu total (90 ou 80), anuladas incluídas, com 5 h — BT-091, UT-065; Playwright (1280 e 360 px)
- [x] Questões dos simulados aparecem no Personalizado e no Treino (filtro de anos pelo ano de referência) e no Meu desempenho; cada questão mostra a origem — teste do filtro de anos (`test_geracao`), BT-092 (treino), UT-066; a Prova completa de runtime sorteou 27 questões do `2099s1`. O Meu desempenho soma o histórico por disciplina e assunto, sem olhar a prova (não muda)
- [x] O Personalizado usa 225 s por questão (P3) — BT-005, UT-067; HTTP real (4 questões → 900 s) e Playwright ("1 h 15 min … 3 min 45 s por questão")
- [x] O resultado e o início comparam com o corte proporcionalmente: mesma escala → direto; escalas diferentes → nota convertida com 1 casa e "(estimativa)"; a página de cortes mostra "de 0 a N" e o mínimo do ano — UT-062 a UT-064, UT-068; Playwright ("Sua nota: 11 de 80 · equivale a 12,4 de 90 (estimativa)", "faltam 68,6")
- [x] Um arquivo de cortes com `pontos_prova: 80` é aceito (mínimo 24, máximo ≤ 80) e os atuais continuam válidos — BT-095 e o teste de coerência com o ano (revisão de código, achado 1); `validar --todas` verde com os seis arquivos publicados
- [x] Migration `005` testada: `upgrade head` + `downgrade -1` (SQLite local e Postgres no CI), sem perder contas, sessões, históricos e reportes — SQLite: `local.db` 004 → 005 → 004 → 005 (alembic) e BT-087 (004 → 005 → 004 com conta, histórico e reporte preservados); Postgres no CI da branch (run 37357127787, job "Backend ... migrations no Postgres": upgrade, downgrade e upgrade)
- [x] Testes existentes continuam passando (regressão) — backend 459 testes, frontend 297
- [x] Novos testes cobrem a mudança (IT-028 a IT-034, BT-087 a BT-096, UT-062 a UT-068) — e os testes da revisão de código (consulta da prova, `pontos_prova` por ano, `ano` antigo, `(cid:172)` no texto, início só com simulados)
- [x] Fluxo afetado exercitado em runtime antes do merge — HTTP real e Playwright (FT-025), registrados abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — 9 achados: 8 corrigidos, 1 justificado (abaixo)
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: contratos de endpoints alterados (formatos de id e de código, rota de figuras com caminho novo) — abaixo
- [x] Documentos afetados foram atualizados — PRD v6.0, Arquitetura v1.11 (ADR-015, ADR-006 emendado), 03-SPEC v1.11, specs 01 (v1.3), 02 (v1.3), 03 (v1.11), 04 (v1.8), 07 (v1.6) e 08 (v1.1), Plano, Deploy Guide v1.6, CLAUDE.md, INDEX.md
- [x] CI verde na branch e em `master`; em produção, a migration aplicada, as 5 provas sincronizadas e a Prova completa com 80 questões — branch verde (run 37357127787), `master` verde no merge `cc1f1c9` (run 37357559605). Em produção (05/10): log da Railway com `Running upgrade 004 -> 005` e `Sincronizadas: 2020, 2022, 2023, 2024, 2025`; `/api/health` com 5 provas; vitrine com 449 questões e os 5 anos; catálogo e geração sem cookie → 401; figura de 2025 → 200 e `/figuras/2025S1/...` → 404. No container (Deploy Guide §8.3, só leitura): distribuição somando 80, Prova completa com 80 questões e 18000 s, Prova de um ano de 2025 com 90, Personalizado de 4 com 900 s, notas de corte de 2020 e 2022–2026 em 90 pontos e as contas preservadas (só contagens)

**Validação runtime (03/10/2026, build servido pelo FastAPI na porta 8001 com o provedor Google falso; SQLite novo com a base sintética — vestibulares 2098 e 2099 e o simulado `2099s1` de 80 questões — e as notas de corte sintéticas de 90 pontos):**
- HTTP: sem sessão, `GET /api/catalogo` → 401. Logado: catálogo com `2099s1` (simulado, edição 1, "Simulado FUVEST 2099 · 1ª edição", 80), `2099` e `2098` (90), 255 questões, distribuição somando 80; vitrine `{"total_questoes": 255, "anos": [2098, 2099]}`; Prova completa com 80 questões (24 de 2099, 29 de 2098, 27 do simulado) e 18000 s; `{"modo": "ano", "prova": "2099s1"}` → 80 questões, `2099s1-001`, origem do simulado, figura `/figuras/2099s1/q015-1.webp`; `{"ano": 2099}` → 422 antes da revisão de código (depois dela, aceito como `prova: "2099"`, BT-091); `"2099S1"` → 422; `"2050s1"` → 404; Personalizado de 4 → 900 s; `/figuras/2099s1/...` → 200 e `/figuras/2099S1/...` → 404; `/api/questoes?ids=2099s1-001,2099-001,2099s2-001` → as duas primeiras e `nao_encontradas: ["2099s2-001"]`; `ids=2099S1-001` → 422; notas de corte `ano 2099, pontos_prova 90`.
- Playwright (FT-025), 1280 px: login falso → `/notas-de-corte` → "Definir como alvo" (Medicina) → início com "255 questões de 2 provas (2098 a 2099) e 1 simulado oficial.", Prova completa "80 questões" e o PDF do simulado em "Provas na base" → `/novo/ano` com "Provas da FUVEST" e "Simulados oficiais da FUVEST" → "Fazer o Simulado FUVEST 2099 · 1ª edição" (o diálogo de descarte apareceu por um simulado antigo de outra validação no `localStorage`) → "Questão 1 de 80", "Física, Simulado FUVEST 2099 · 1ª edição (questão 1)", "Folha 0/80" → 40 respostas → finalizar → "Você acertou 11 de 80 questões" e o bloco "Notas de corte" com "Sua nota: 11 de 80 · equivale a 12,4 de 90 (estimativa)", "faltam 68,6/60,6/49,6" e sem o link de lista do ano → início com "Corte 2099 · Medicina…: AC 81 (faltam 68,6) · EP 73 (faltam 60,6) · PPI 62 (faltam 49,6)" e a nota convertida → Personalizado com "Tempo: 1 h 15 min, o mesmo ritmo da prova (3 min 45 s por questão)" e anos 2098 e 2099 sem repetição → Prova completa com "Questão 1 de 80" e 04:59:59. A 360 px, `/novo/ano` com documento de 345 px (sem rolagem horizontal). Console sem erros nem avisos na sessão inteira.

**Revisão de código (`/code-review high`, diff da branch) — 9 achados, 8 corrigidos e 1 justificado (`b68787b`):**
1. Corrigido: `pontos_prova` com padrão 90 e sem conferência com o ano deixaria um `2027.yaml` escrito à mão sem a chave ser lido como de 90. Agora, de 2027 em diante o arquivo tem de declarar `pontos_prova`, e até 2026 só vale 90 (C04; teste novo).
2. Corrigido: `GerarAno` sem o campo antigo derrubaria a Prova de um ano numa aba aberta durante o deploy. O pedido `{"ano": 2025}` vira `prova: "2025"` (teste novo).
3. Corrigido: a origem lia a prova por carga preguiçosa (uma consulta por prova). `contains_eager` na geração e `joinedload` no modo ano e em `/api/questoes` (teste novo que falha sem a correção).
4. Corrigido: só com simulados publicados, o início diria "0 provas"; agora "N questões de K simulados oficiais" (teste novo).
5. Corrigido: o ritmo "3 min 45 s" estava escrito à mão; agora sai de `SEGUNDOS_POR_QUESTAO`.
6. Corrigido: `utils/formato.ts` ao lado de `format.ts` confundia; renomeado para `utils/formatoProva.ts`.
7. Justificado: o formato vigente (80 questões, 5 h, 225 s) fica como constante no backend e no frontend. Ele muda uma vez a cada muitos anos, por resolução da FUVEST; as duas pontas têm testes com o valor e citam a resolução, e levá-lo para a API (vitrine ou catálogo) seria campo novo na vitrine pública, decisão de produto (CLAUDE.md). O `?? 90` da página de cortes só vale sem nenhum ano publicado.
8. Corrigido: o `(cid:172)` deixava de gerar alerta, mas o `limpar_texto` o apagava; palavras separadas só por ele sairiam grudadas. O `limpar_texto` recebe os glifos de espaço da variante (teste novo).
9. Corrigido: a distribuição recalculava o total de cada prova por disciplina; agora calcula uma vez. A proteção contra prova sem questões fica, porque a função é pública e testada com contagens avulsas.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum segredo novo; nenhuma variável de ambiente nova |
| Validação de entrada | Código da prova `^\d{4}(s[1-9])?$` (Pydantic em `GerarAno`, regex na rota de figuras e na CLI); ids `^\d{4}(s[1-9])?-\d{3}$` em questões, correção, reportes, treino e histórico; o `ano` do pedido antigo só é aceito como inteiro e passa pela mesma regex |
| Caminho de arquivo | `/figuras/{prova}/{arquivo}`: código e nome do arquivo validados **antes** de tocar o disco, e só provas sincronizadas são servidas (path traversal testado — BT-042, BT-093); a CLI monta `data/provas/CODIGO` e `data/_cache/CODIGO` só com o código validado |
| SQL | Só ORM; a migration usa operações do Alembic |
| Tokens / ownership / CSRF | Nada muda: os endpoints alterados seguem com `exigir_acesso` e, nos POST, `verificar_origem`; o histórico continua filtrado pelo usuário da sessão |
| Exposição de dados | Campos novos (`prova`, `origem`, `codigo`, `tipo`, `edicao`, `rotulo`, `pontos_prova`) são conteúdo público da FUVEST, atrás do login como o resto; a vitrine pública não ganha campo (P4) |
| Dependências | Nenhuma nova: `pip audit` e `npm audit` não se aplicam |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | Janela no deploy: a migration roda antes do código novo assumir, e o deploy antigo, ainda no ar, consulta `provas.ano` que não existe mais (erro 500 no conteúdo por até ~1 min) | Alta | Baixo | Deploy em horário de pouco uso; as rotas de conta e o histórico não dependem dessas tabelas; o navegador guarda o simulado em andamento e reenvia o histórico pendente. Registrado no Deploy Guide |
| 2 | A sincronização falha depois da migration e o site fica sem provas | Baixa | Alto | O CI roda as migrations no Postgres e o `validar --todas`; falha da sincronização para o start (a Railway mantém o deploy anterior) e o rollback é o `git revert` + `downgrade` (Deploy Guide) |
| 3 | A nota convertida (80 → 90) é lida como exata | Média | Médio | "(estimativa)" e os dois números ("60 de 80 · equivale a 67,5 de 90"); texto fixo de referência para ir à 2ª fase; a lista de 2027 (80 pontos) substitui a conversão a partir de 23/11/2026 |
| 4 | A Prova completa de 80 sorteada com a distribuição das provas de 90 difere da distribuição real de 2027 | Média | Baixo | Proporções (P2) e os simulados entram na média; a distribuição se ajusta sozinha a cada prova de 80 publicada |
| 5 | O ano de referência (2027) no filtro do Personalizado confunde (não há prova FUVEST 2027 ainda) | Média | Baixo | Rótulo "2027" no filtro inclui os simulados; a origem de cada questão aparece na resolução |
| 6 | O layout da prova real de 2027 (01/11) diferir do dos simulados | Média | Médio | A família `familia_2027` fica registrada só para os simulados; a prova real entra no registry depois de testada, como foi com 2020–2024 (T-028) |
| 7 | Rollback depois de publicar os simulados: o código anterior não lê `2027sN` | Baixa | Baixo | O código anterior ignora esses diretórios (log) e recusa no histórico as entradas com ids novos (ficam pendentes no navegador). Documentado no plano de rollback |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-011` → `git revert -m 1 <merge do CR-011>` → merge em `master` → push, **com o `downgrade` para a `004` antes** (o código anterior não lê o schema novo).
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard, também depois do `downgrade`.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-011-formato-80-simulados` (e, se já publicado, o merge de `conteudo/simulados-2027`).

### 10.2 Rollback de Migration

- **Migration afetada:** `005_codigo_prova.py`
- **Comando de downgrade:** `alembic downgrade 004`
- **Downgrade testado?** [x] Sim / [ ] Nao — SQLite local (alembic 005 → 004 → 005), BT-087 e Postgres no CI (run 37357127787)
- **Downgrade é destrutivo?** [ ] Sim / [x] Nao — recria vazias as tabelas derivadas (a sincronização do código anterior as repovoa) e volta `reportes.questao_id` para 8 caracteres (falha se houver reporte de questão de simulado; nesse caso, apagar esses reportes antes, depois de exportá-los)

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao (exceto reportes de questões de simulado, se houver)
- **Detalhamento:** provas, textos-base e questões são reconstruídos do repositório. Contas, sessões, históricos e carreiras-alvo não são tocados. Entradas de histórico com ids de simulado continuam guardadas no servidor; o código anterior as devolve mas recusa novas.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao (recomendado) — a migration só recria dados derivados do repositório e alarga `reportes.questao_id` (sem perda); as tabelas de conta não são tocadas. A §6 do Deploy Guide obriga backup em migration destrutiva de dados de usuário, o que não é o caso; backup é obrigatório antes de um `downgrade` em produção
- **Procedimento de backup:** Deploy Guide §6

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `alembic current` mostra `004`
- [ ] Prova completa com 90 questões e Prova de um ano de 2025 funcionando
- [ ] Usuários existentes conseguem fazer login e veem o histórico

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-02 | Rafael Peixoto (com Claude) | CR criado com as decisões D1–D3, o resultado do teste dos dados e as propostas P1–P5 para o Gate 0 |
| 2026-10-02 | Rafael Peixoto (com Claude) | Gate 0: CR aprovado pelo usuário; P2 (média das proporções de todas as provas), P3 (225 s) e P4 (simulados à parte nos números) confirmadas na opção recomendada |
| 2026-10-03 | Rafael Peixoto (com Claude) | Implementação (CR-T-02 a CR-T-06), validação runtime (HTTP real e Playwright, FT-025), revisão de código (9 achados: 8 corrigidos, 1 justificado) e de segurança, documentos atualizados. Rascunhos reais de `2027s1` e `2027s2` extraídos fora do repositório (a curadoria é conteúdo). Pendente: CI na branch e em `master` e a conferência em produção |
| 2026-10-05 | Rafael Peixoto (com Claude) | CI verde na branch e em `master` (merge `cc1f1c9`); migration 005 aplicada em produção e as 5 provas sincronizadas; conferência em produção — validação ✅, status Concluído. Próximo: curadoria dos simulados oficiais (`conteudo/simulados-2027`) |
