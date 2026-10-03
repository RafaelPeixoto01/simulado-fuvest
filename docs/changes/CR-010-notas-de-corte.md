# Change Request — CR-010: Notas de corte por carreira e carreira-alvo (Fase 4 do roadmap)

**Versão:** 1.0  
**Data:** 2026-10-02  
**Status:** Concluído  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Primeiro item da Fase 4 do roadmap do PRD ("Referência de notas de corte por carreira"). O site passa a ter as **notas de corte da 1ª fase** publicadas pela FUVEST (a menor nota entre os convocados para a 2ª fase, por carreira e modalidade) de cada ano da base, numa página própria para consulta. O estudante pode escolher uma **carreira-alvo**, guardada na conta, e o resultado da Prova completa e da Prova de um ano e o início passam a comparar a nota do simulado com o corte dessa carreira. Os outros itens da Fase 4 (área administrativa web e extração assistida por IA) ficam fora deste CR.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (conteúdo novo versionado, endpoints novos, coluna nova em `usuarios`) |
| Origem           | Evolução do produto (Roadmap Futuro do PRD, Fase 4) |
| Urgência         | Próxima sprint |
| Complexidade     | Alta |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)
- O resultado mostra acertos, aproveitamento e desempenho por disciplina e por assunto, mas nada diz se a nota seria suficiente para a carreira que o estudante quer.
- O PRD lista "Nota de corte, simulação de aprovação ou classificação por carreira" como fora de escopo (§8) e "Referência de notas de corte por carreira" na Fase 4 do roadmap.
- A conta guarda só identificador do Google, nome, e-mail e os simulados concluídos (RNF-005).

### Problema ou Necessidade
"61 de 90 é bom?" é a primeira dúvida de quem faz um simulado. A resposta depende da carreira: a FUVEST publica todo ano, por carreira e modalidade, a nota mínima para ser chamado à 2ª fase. Hoje o estudante teria que abrir o PDF de cada ano e procurar a carreira à mão.

### Situação Desejada (TO-BE)
- **Conteúdo:** `data/provas/notas_corte/AAAA.yaml` para 2020 e 2022–2025, extraído do PDF "Notas de Corte" do acervo por um comando novo do curador (`python -m ingestao cortes`), com os nomes das carreiras revisados (campus completado pelo Guia de Carreiras e Cursos) e validado no CI. Sem tabela no banco, como a taxonomia de assuntos (ADR-009).
- **Página `/notas-de-corte`:** escolha do ano (o mais recente por padrão), busca pelo nome e tabela com vagas e o corte de cada modalidade (ampla concorrência, escola pública, escola pública PPI).
- **Carreira-alvo:** escolhida na página, entre as carreiras do ano mais recente, e guardada na conta (só a carreira, nunca a modalidade).
- **Comparação:** no resultado da Prova completa e da Prova de um ano (90 questões) e no cartão "Seu último simulado" do início, os três cortes da carreira-alvo com a diferença para a nota do simulado, sempre como referência para ir à 2ª fase.

**Resultado do teste dos dados (02/10/2026, só leitura):**
- Os 5 anos têm o PDF "Notas de Corte" no acervo, com texto (não digitalizado): `fuvest_2020_nota_de_corte.pdf`, `fuvest_2022_notas_de_corte.pdf`, `fuvest2023_notas_de_corte.pdf`, `fuvest_2024_notas_de_corte.pdf`, `fuvest_2025_notas_de_corte.pdf` (em `https://www.fuvest.br/wp-content/uploads/`).
- Um extrator por posição de palavra (pdfplumber) leu 106 carreiras em 2020, 107 em 2022, 107 em 2023, 85 em 2024 e 75 em 2025, cada uma com as três modalidades, conferidas por amostragem com o texto do PDF (ex.: Medicina 2024, código 460, ampla concorrência: corte 79, máximo 88).
- O layout é um só, com uma variação: em 2020 os pontos mínimo e máximo ficam na mesma linha da modalidade; de 2022 em diante o mínimo fica cerca de 4 pt acima da linha. De 2024 em diante a linha da carreira traz os totais. O PDF de 2025 tem uma segunda tabela no fim (por código, sem modalidades), que fica de fora. As carreiras de treineiro (código terminado em 99) também ficam de fora.
- **Os nomes e códigos das carreiras mudam entre anos:** os códigos foram renumerados em 2024 e em 2025; de 2024 em diante o nome perde o campus (em 2024, 23 nomes repetidos, como três "Medicina"; em 2025, 12); em 2025 a FUVEST juntou carreiras (Medicina passou a ser uma só, com 244 vagas = 128 + 43 + 73 das três de 2024); de 1 a 5 nomes por ano vêm cortados com "...". O Guia de Carreiras e Cursos de cada ano lista os cursos e o campus de cada código (ex.: 2025, 116 Psicologia = Ribeirão Preto; 117 = São Paulo; 111 Medicina = São Paulo, Ribeirão Preto e Bauru).
- **27 pontos é o mínimo da FUVEST:** a Resolução CoG nº 8668 (FUVEST 2025), art. 11 §3º, elimina quem tem menos de 30% da 1ª fase (27 de 90). Muitos cortes de escola pública e PPI são exatamente 27: todos os que atingiram o mínimo foram chamados.

**Decisões do usuário (02/10/2026):**
- **D1 · Escopo da Fase 4:** só as notas de corte (com a carreira-alvo) neste CR. A área administrativa web e a extração assistida por IA ficam no roadmap.
- **D2 · Carreira-alvo da lista mais recente:** o estudante escolhe entre as carreiras do ano mais recente, e a comparação usa sempre o corte desse ano, inclusive na Prova de um ano de outro ano. A Prova de um ano oferece um link para a tabela inteira do seu ano. Não há equivalência de carreiras entre anos.
- **D3 · Página própria:** "Notas de corte" no menu, com ano, busca, tabela e o botão de carreira-alvo.
- **D4 · Sempre as três modalidades:** a modalidade não é perguntada nem guardada (a autodeclaração PPI é dado pessoal sensível, LGPD art. 11). O resultado e o início mostram os três cortes.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Conteúdo | Só pacotes de prova e `assuntos.yaml` | + `data/provas/notas_corte/AAAA.yaml` (2020, 2022–2025), com `status`, `pendencias`, fonte e carreiras (código, nome, vagas, convocados, corte e máximo por modalidade) |
| 2 | Carga e validação | — | `app/pacote/notas_corte.py`: schema Pydantic, carga estrita (CLI/CI) e tolerante com cache por mtime (API); regras C01–C05 (spec 08 §2.7) |
| 3 | CLI do curador | — | `python -m ingestao cortes --ano AAAA --url URL [--forcar]`: baixa o PDF e grava o rascunho com as pendências (nome cortado, nome repetido no ano); `validar --todas` passa a validar também os cortes |
| 4 | API | — | `GET /api/notas-corte?ano=AAAA` (Acesso): anos publicados, ano mais recente e as carreiras do ano pedido |
| 5 | Conta | `usuarios` sem preferência | Colunas `carreira_alvo_ano` e `carreira_alvo_codigo` (migration `004_carreira_alvo`); `PUT`/`DELETE /api/conta/carreira-alvo` (Acesso, sessão, Origin) |
| 6 | Sessão | `UsuarioPublico` com id, e-mail e nome | + `carreira_alvo` resolvida (ano, código, nome e os três cortes), ou `null` |
| 7 | Página nova | — | `/notas-de-corte` (dentro do `RequerConta`), link "Notas de corte" no cabeçalho e no menu do celular |
| 8 | Resultado | Resumo, disciplinas, folha e revisão | + bloco "Notas de corte" na Prova completa e na Prova de um ano com 90 questões: os três cortes da carreira-alvo e a diferença; sem carreira-alvo, convite para escolher; na Prova de um ano, link para os cortes daquele ano |
| 9 | Início | Cartão "Seu último simulado" | + linha com os três cortes da carreira-alvo, se o último simulado tiver 90 questões |
| 10 | Textos de privacidade | "Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos" | Acrescentam a carreira-alvo (apresentação, Conta e Privacidade) |

### 4.2 O que NÃO muda

- Geração, resolução, correção e a regra da nota (RN-002, RN-008): a comparação usa os acertos que o resultado já tem.
- Personalizado e Treino: sem comparação com o corte (não têm 90 questões, ou não têm resultado).
- `HistoricoEntry` e `/api/historico`: a comparação é calculada na hora de mostrar, com a carreira-alvo atual, e não é gravada no resultado.
- Pacotes de prova, V01–V11, sincronização repo → banco (ADR-002): os cortes não entram no banco nem na sincronização.
- Vitrine e apresentação públicas: as notas de corte exigem sessão como o resto do conteúdo (RN-017); a vitrine continua só com os totais da base.
- Login, sessão, cookies, exclusão da conta (a linha de `usuarios` já é apagada inteira) e o limite de 50 simulados.
- Nenhuma dependência nova (pdfplumber e PyYAML já estão no projeto).

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | Cabeçalho, Visão Geral, Persona 1, módulos (RF-027 curador, RF-028 página, RF-029 carreira-alvo), RNF-005, US-018 a US-020, RN-018 e RN-019, Fora de Escopo, Dependências, Glossário, Roadmap | v5.0 |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura de pastas, Modelagem (`usuarios.carreira_alvo_*`, seção Notas de corte), padrões da API, ADR-014 (notas de corte como conteúdo versionado, sem tabela) | v1.10 |
| `/docs/03-SPEC.md` | Sim | Índice (spec 08), contratos (`/api/notas-corte`, `/api/conta/carreira-alvo`), erro `carreira_invalida`, migration 004, changelog | v1.10 |
| `/docs/specs/08-notas-de-corte.md` | Sim (novo) | Conteúdo, extrator, validação, API, carreira-alvo, telas, casos de borda, testes | Criar v1.0 |
| `/docs/specs/01-ingestao.md` | Sim | Comando `cortes`; `validar --todas` com os cortes | Nota apontando para a spec 08 |
| `/docs/specs/03-resolucao.md` | Sim | Rotas (`/notas-de-corte`), cabeçalho e menu do celular, cartão "Seu último simulado" | Atualizar |
| `/docs/specs/04-correcao-resultado.md` | Sim | Ordem do resultado: bloco "Notas de corte" | Atualizar |
| `/docs/specs/07-contas-sincronizacao.md` | Sim | `UsuarioPublico.carreira_alvo`, modelo `usuarios`, textos da Conta e da Privacidade, apresentação | Atualizar |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-010 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | Migration 004, publicar as notas de corte de um ano novo (operação do curador), rollback | Atualizar |
| `CLAUDE.md` | Sim | Change Requests, Comandos Essenciais (`ingestao cortes`), Lembretes (conteúdo inclui os cortes), Última Tarefa | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `backend/app/pacote/notas_corte.py` | Schema (`Modalidade`, `CarreiraCorte`, `NotasCorteAno`), `carregar_notas_corte` (estrita), `notas_corte_em_uso` (tolerante, cache por mtime), `MINIMO_FUVEST = 27` |
| Criar | `backend/ingestao/notas_corte.py` | Extrator por posição de palavra (2020–2025), geração do rascunho com pendências e download com cache por URL |
| Modificar | `backend/ingestao/cli.py`, `backend/ingestao/baixar.py` | Comando `cortes`; `validar` com os cortes; `obter_pdf` compartilhado |
| Criar | `data/provas/notas_corte/2020.yaml`, `2022.yaml`, `2023.yaml`, `2024.yaml`, `2025.yaml` | Conteúdo (nomes revisados pelo usuário — Gate 1) |
| Modificar | `backend/app/models.py` + criar `backend/alembic/versions/004_carreira_alvo.py` | Colunas da carreira-alvo |
| Modificar | `backend/app/schemas.py` | `NotasCorteResponse`, `CarreiraCorteResposta`, `CarreiraAlvoRequest`, `CarreiraAlvo`; `UsuarioPublico.carreira_alvo` |
| Criar | `backend/app/routers/notas_corte.py`, `backend/app/services/notas_corte.py` | `GET /api/notas-corte`; resolução e gravação da carreira-alvo |
| Modificar | `backend/app/routers/conta.py`, `backend/app/dependencias.py`, `backend/app/main.py` | `PUT`/`DELETE /api/conta/carreira-alvo`; `obter_notas_corte`; sessão com a carreira-alvo; registro do router |
| Criar | `backend/tests/test_notas_corte_pacote.py`, `test_notas_corte_extrator.py`, `test_cli_cortes.py`, `test_api_notas_corte.py`, `test_carreira_alvo.py` | Testes |
| Modificar | `backend/tests/test_migrations.py`, `backend/tests/fixtures/gerar_pacotes.py` | Migration 004; cortes sintéticos para o desenvolvimento |
| Modificar | `frontend/src/types.ts`, `services/api.ts`, `test/apiFalsa.ts` | Tipos e chamadas |
| Criar | `frontend/src/hooks/useNotasCorte.ts` | `useNotasCorte` (consulta) e `useCarreiraAlvo` (mutações) |
| Criar | `frontend/src/utils/notasCorte.ts` (+ teste) | Pontos comparáveis do simulado, diferença, busca sem acento |
| Criar | `frontend/src/pages/NotasCortePage.tsx` (+ teste) | Página |
| Criar | `frontend/src/components/notasCorte/ComparacaoCorte.tsx` | `ComparacaoCorte` (resultado), `LinhaCortes` (início), `CortesEmLinha`; `BOTAO_PEQUENO` em `estilos.ts` |
| Modificar | `frontend/src/App.tsx`, `components/Layout.tsx`, `components/MenuCelular.tsx`, `pages/ResultadoPage.tsx`, `components/inicio/UltimoSimulado.tsx`, `pages/ContaPage.tsx`, `pages/PrivacidadePage.tsx`, `pages/ApresentacaoPage.tsx` (+ testes) | Rota, links, comparação e textos |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| Adicionar colunas | `usuarios.carreira_alvo_ano smallint NULL`, `usuarios.carreira_alvo_codigo smallint NULL` | Sim (`004_carreira_alvo`) |

**Migration:**
```sql
ALTER TABLE usuarios ADD COLUMN carreira_alvo_ano SMALLINT;
ALTER TABLE usuarios ADD COLUMN carreira_alvo_codigo SMALLINT;
```
Com `op.batch_alter_table` (SQLite). As duas colunas são gravadas e apagadas juntas pelo serviço. As notas de corte em si não vão para o banco (ADR-014).

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Documentação inicial: este CR e a spec 08. **Gate 0: o usuário revisa antes de qualquer código** | — | CR e spec 08 aprovados |
| CR-T-02 | Schema, carga e validação dos cortes (`app/pacote/notas_corte.py`); `validar --todas` com os cortes; cortes sintéticos nos dados de desenvolvimento | CR-T-01 | IT-021 a IT-024 verdes |
| CR-T-03 | Extrator + comando `cortes` | CR-T-02 | IT-025 a IT-027 verdes; os 5 PDFs extraídos sem erro |
| CR-T-04 | **(curador)** Extrair 2020 e 2022–2025, completar os nomes (campus e nomes cortados) pelo Guia de Carreiras e Cursos de cada ano, zerar as pendências e publicar. **Gate 1: o usuário revisa os nomes** | CR-T-03 | `validar --todas` verde; nomes aprovados pelo usuário |
| CR-T-05 | API `GET /api/notas-corte` | CR-T-02 | BT-079 a BT-081 verdes |
| CR-T-06 | Migration 004, carreira-alvo (`PUT`/`DELETE`) e `carreira_alvo` na sessão | CR-T-05 | BT-082 a BT-086 verdes; upgrade/downgrade testados |
| CR-T-07 | Página `/notas-de-corte`, links do cabeçalho e do menu do celular | CR-T-06 | UT-055 a UT-058 verdes |
| CR-T-08 | Comparação no resultado e no início; textos da apresentação, Conta e Privacidade | CR-T-07 | UT-059 a UT-061 verdes; FT-024 exercitado |
| CR-T-09 | Revisão OWASP, validação runtime (Playwright com o provedor falso), `/code-review`, docs finais (PRD, Arquitetura, specs, Plano, Deploy Guide, CLAUDE.md, INDEX), merge + push + CI verde | CR-T-01 a CR-T-08 | Todos os critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] As notas de corte de 2020, 2022, 2023, 2024 e 2025 estão em `data/provas/notas_corte/`, publicadas, sem pendências, com nomes únicos em cada ano (campus completado) e conferidas por amostragem com o PDF; `validar --todas` passa — extraídas (106, 107, 107, 85 e 75 carreiras), nomes completados (174 ajustes: campus de todas as 160 carreiras de 2024–2025, atribuído pela soma das vagas dos cursos, que fecha em todas; 18 nomes cortados lidos nos manuais e no guia), `validar --todas` sem problema. **Gate 1 aprovado pelo usuário em 02/10**, sem ajustes (2020 mantém o estilo do PDF daquele ano, "Nome − Cidade"); os cinco arquivos publicados
- [x] Arquivo de cortes inválido (fora do schema, corte abaixo de 27 ou acima do máximo, nome repetido, publicado com pendência) é recusado por `validar` e pelo CI — IT-021, IT-022, IT-024
- [x] `python -m ingestao cortes --ano AAAA --url URL` gera o rascunho com as pendências e não sobrescreve um arquivo existente sem `--forcar` — IT-027; rodado de verdade para os 5 anos (os testes com os PDFs reais passam quando eles estão no cache)
- [x] `GET /api/notas-corte` devolve os anos publicados e as carreiras do ano pedido (o mais recente sem `ano`); exige sessão no modo `conta` (401) e fica indisponível em `indisponivel` (503) — BT-079 a BT-081 (BT-080 em `test_acesso.py`); HTTP real abaixo
- [x] O estudante define e remove a carreira-alvo na página; só carreiras do ano mais recente são aceitas (422 `carreira_invalida`); a escolha aparece em outro dispositivo (vem na sessão) — BT-082 a BT-086, UT-058; HTTP real e Playwright abaixo
- [x] A modalidade de concorrência não é perguntada nem guardada; o resultado e o início mostram sempre os três cortes — `CarreiraAlvoRequest` recusa campo extra (BT-083, `modalidade`); UT-059, UT-060
- [x] O resultado da Prova completa e da Prova de um ano com 90 questões mostra os três cortes da carreira-alvo com "faltam N" ou "atingiu"; sem carreira-alvo, o convite; na Prova de um ano, o link para os cortes daquele ano; Personalizado não mostra o bloco — UT-059; Playwright abaixo
- [x] O cartão "Seu último simulado" mostra a linha dos cortes quando o último simulado tem 90 questões e há carreira-alvo — UT-060; Playwright abaixo
- [x] A página explica o que é o corte, o mínimo de 27 pontos e que é referência para ir à 2ª fase, não previsão de aprovação; funciona a 360 px sem rolagem horizontal — UT-057; Playwright (documento com 345 px a 360 px)
- [x] Apresentação, Conta e Privacidade dizem que a conta guarda também a carreira-alvo; excluir a conta a apaga — UT-061, BT-086
- [x] Migration `004` testada: `upgrade head` + `downgrade -1` (SQLite local e Postgres no CI) — local `003 → 004 → 003 → 004` em 02/10 (alembic) e BT-047 (`004 → 003` sem perder as contas); CI da branch verde no Postgres (run 37064793416, job "Backend ... migrations no Postgres")
- [x] Testes existentes continuam passando (regressão) — backend 410 testes, frontend 286
- [x] Novos testes cobrem a mudança — IT-021 a IT-027, BT-079 a BT-086, BT-047 (004), UT-055 a UT-061 e 9 da revisão de código
- [x] Fluxo afetado exercitado em runtime antes do merge — ver "Validação runtime" abaixo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada, com findings corrigidos ou justificados — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md) executada: três endpoints novos e uma coluna nova com dado de usuário — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — PRD v5.0, Arquitetura v1.10 (ADR-014), 03-SPEC v1.10, specs 01/03/04/07 e 08 nova, Plano, Deploy Guide v1.5, CLAUDE.md, INDEX.md
- [x] CI verde na branch e em `master`; em produção, `/notas-de-corte` com os 5 anos e a carreira-alvo funcionando com o login real — branch verde (run 37064793416), `master` verde no merge `eddcff8` (run 37065452570). Em produção (02/10): migration `003 -> 004` no log da Railway, `GET /api/notas-corte` e `PUT /api/conta/carreira-alvo` sem cookie → 401, `/notas-de-corte` → 200; o usuário conferiu com o login real a página, a carreira-alvo, o bloco do resultado e a linha do início ("CR-010 está tudo ok")

**Validação runtime (02/10/2026, build servido pelo FastAPI na porta 8001 com o provedor Google falso, SQLite novo com as provas 2022–2025 e uma cópia de `data/provas` com os cortes marcados como publicados — o repositório continuou em rascunho):**
- HTTP: sem sessão, `GET /api/notas-corte` e `PUT /api/conta/carreira-alvo` → 401. Logado: `GET /api/notas-corte` → anos `[2025, 2024, 2023, 2022, 2020]`, 75 carreiras, Medicina (código 111) com cortes 79/71/60 e 244 vagas; `?ano=2021` → 2025; `?ano=abc` → 422. `PUT {2025, 111}` → 200 com `Cache-Control: no-store`; `PUT {2024, 460}` → 422 `carreira_invalida`; `Origin` de outro site → 403; `GET /api/sessao` com a carreira-alvo resolvida; `DELETE` duas vezes → 204, 204, e `carreira_alvo: null`.
- Playwright (FT-024), 1280 px: login falso → `/notas-de-corte` com as 75 carreiras de 2025, "Como ler" e a fonte → busca "medicina" (2 carreiras) → "Definir como alvo" → cartão "Sua carreira-alvo" e a mensagem de confirmação; a 360 px, documento com 345 px e as carreiras em blocos. Prova de um ano 2022 finalizada em branco → resultado "Você acertou 1 de 90" (a anulada) com o bloco "Notas de corte": corte FUVEST 2025, "faltam 78/70/59" e os links "Ver todas as notas de corte" e "Ver as notas de corte de 2022" → o link abre 2022 (107 carreiras, sem os botões de carreira-alvo, com o cartão da carreira-alvo de 2025) → início com "Corte 2025 · Medicina (…): AC 79 (faltam 78) · EP 71 (faltam 70) · PPI 60 (faltam 59)". Console sem erros nem avisos.

**Revisão de código (`/code-review high`, diff `master...HEAD`) — 10 achados, 9 corrigidos e 1 justificado (`b140feb`):**
1. Corrigido: `?ano=` fora de 1977–2100 ia à API (422) e a página mostrava a tela de erro; agora pede o mais recente e avisa (teste novo).
2. Corrigido: com `keepPreviousData`, ao trocar de ano o seletor voltava ao ano anterior e o aviso de "ano fora da base" piscava; o seletor mostra o escolhido, a tabela fica esmaecida (`aria-busy`) e o aviso espera a resposta (teste novo).
3. Corrigido: o 422 `carreira_invalida` (lista que ficou velha com a página aberta) aparecia como erro genérico e a lista não recarregava; agora a mensagem diz que a lista mudou e a lista nova é buscada (teste novo).
4. Corrigido: o cache do PDF do `cortes` valia por ano, e rodar com outra URL reaproveitava o PDF antigo; agora vale para a mesma URL (`.url` ao lado). PDF ilegível virou erro da CLI, sem traceback (dois testes novos).
5. Corrigido: `validar --ano` de um ano só com cortes (sem pacote de prova) falhava antes de olhar os cortes (teste novo).
6. Justificado: o cartão do início fica sem a linha quando a carreira-alvo saiu da lista. É o desenho da spec 08 §3: o cartão é um lembrete curto, e o aviso de escolher de novo fica no resultado e na página.
7. Corrigido: o padrão da URL e o download do PDF estavam duplicados; agora há um `PADRAO_FONTE` só e o `obter_pdf` do `baixar`.
8. Corrigido: a marcação das modalidades estava repetida em três lugares; o `CortesEmLinha` ganhou a situação opcional e a `LinhaCortes` passou a usá-lo.
9. Corrigido: `GET /api/sessao` lia o diretório de cortes até para quem não entrou; agora só com usuário.
10. Corrigido: a busca refazia a normalização e a ordenação a cada render; agora com `useMemo`.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum segredo novo; nenhuma variável de ambiente nova |
| Validação de entrada | `CarreiraAlvoRequest` (Pydantic, `extra="forbid"`, ano 1977–2100, código 100–999); `ano` da query com a mesma faixa; o par (ano, código) só é aceito se estiver nos cortes publicados e for do ano mais recente |
| Tokens / ownership | PUT e DELETE agem só sobre o usuário da sessão (`exigir_usuario`), sem id do cliente; a sessão só devolve a carreira-alvo do próprio usuário; `Cache-Control: no-store` |
| SQL | Só ORM (atribuição de atributos e `commit`) |
| CSRF / CORS | `verificar_origem` no PUT e no DELETE (403 `origem_invalida`); PUT acrescentado só ao CORS de desenvolvimento; produção sem CORS |
| Caminho de arquivo | `DATA_DIR/notas_corte/*.yaml`, fixo; o `ano` da query só é chave de dicionário. O comando `cortes` só baixa de `https://www.fuvest.br/*.pdf` para o cache |
| XSS | Nomes das carreiras (conteúdo do repositório) renderizados como texto pelo React |
| Rate limit | 30/min por IP no PUT e no DELETE |
| Dado pessoal (LGPD) | Só a carreira (não é dado sensível); a modalidade nunca é pedida nem guardada (D4); Privacidade, Conta e apresentação atualizadas; apagada com a conta |
| Dependências | Nenhuma nova (pdfplumber e PyYAML já eram usados): `pip audit` e `npm audit` não se aplicam |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | O estudante lê o corte como garantia de aprovação | Média | Médio | Texto fixo "referência para ir à 2ª fase, não previsão de aprovação" no bloco e na página; a página explica o que é o corte |
| 2 | Comparar a Prova de um ano de 2022 com o corte de 2025 (D2) confunde | Média | Baixo | O bloco diz o ano do corte ("corte FUVEST 2025") e a Prova de um ano oferece o link para os cortes do próprio ano |
| 3 | Erro de extração atribui o mínimo à modalidade errada | Baixa | Médio | Regras C03/C04 (27 ≤ corte ≤ máximo ≤ 90, três modalidades); conferência por amostragem com o PDF no Gate 1 |
| 4 | Nome da carreira errado ou sem o campus | Média | Médio | Pendência automática para nome repetido ou cortado; nomes completados pelo Guia de Carreiras e revisados pelo usuário (Gate 1); regra C02 (nomes únicos) |
| 5 | Ao publicar os cortes de um ano novo, os códigos mudam e as carreiras-alvo antigas deixam de ser da lista mais recente | Alta (todo ano) | Baixo | A carreira-alvo continua valendo e compara com o corte do ano dela; a página avisa e sugere escolher de novo (RN-019) |
| 6 | Arquivo de cortes removido ou inválido em produção | Baixa | Baixo | O CI (`validar --todas`) é o portão; a API ignora o ano inválido (log de aviso) e a carreira-alvo sem dados aparece como "não está mais na lista" |
| 7 | Dado pessoal novo na conta | Alta | Baixo | Só a carreira (não é dado sensível); a modalidade nunca é guardada (D4); Privacidade e Conta atualizadas; apagada com a conta |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git checkout -b hotfix/revert-CR-010` → `git revert -m 1 <merge do CR-010>` → merge em `master` → push. O revert leva código e conteúdo (`data/provas/notas_corte/`) juntos.
- **Método alternativo:** redeploy do deployment anterior via Railway Dashboard. O código anterior ignora as colunas novas de `usuarios` e o diretório `notas_corte`.
- **Commits a reverter:** o merge `--no-ff` da branch `feat/CR-010-notas-de-corte`.

### 10.2 Rollback de Migration

- **Migration afetada:** `004_carreira_alvo.py`
- **Comando de downgrade:** `alembic downgrade 003`
- **Downgrade testado?** [x] Sim / [ ] Nao — SQLite local (alembic e BT-047) e Postgres no CI (run 37064793416)
- **Downgrade é destrutivo?** [x] Sim / [ ] Nao — apaga só as carreiras-alvo escolhidas; contas, sessões e históricos ficam

Sem o downgrade, o código anterior também funciona: ele ignora as colunas extras.

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [x] Sim (só com o downgrade) / [ ] Nao
- **Detalhamento:** com `downgrade`, as carreiras-alvo escolhidas são perdidas (os estudantes escolhem de novo). Sem `downgrade`, nada é perdido. As notas de corte são conteúdo do repositório.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao — a migration só acrescenta duas colunas opcionais. O banco tem dados de usuário (CR-005): backup obrigatório antes de um `downgrade` em produção
- **Procedimento de backup:** Deploy Guide §6

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional (`/api/health` com as provas)
- [ ] `alembic current` mostra a revisão esperada (se a migration foi revertida)
- [ ] `/api/notas-corte` responde 404 e o resultado abre sem o bloco
- [ ] Usuários existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-02 | Rafael Peixoto (com Claude) | CR criado com as decisões D1–D4 e o resultado do teste dos dados |
| 2026-10-02 | Rafael Peixoto (com Claude) | Gate 0: CR e spec 08 aprovados pelo usuário |
| 2026-10-02 | Rafael Peixoto (com Claude) | Implementação (CR-T-02 a CR-T-08), primeira passada do conteúdo (CR-T-04, em rascunho), validação runtime, revisão de código (9 corrigidos, 1 justificado) e de segurança, documentos atualizados. Os PDFs reais mostraram modalidades sem vagas e sem convocados (spec 08 §2.4) e que de 2024 em diante o PDF não traz o campus de nenhuma carreira |
| 2026-10-02 | Rafael Peixoto (com Claude) | CI da branch verde (run 37064793416). Gate 1: nomes aprovados pelo usuário sem ajustes; os cinco arquivos de cortes publicados; merge em `master` autorizado |
| 2026-10-02 | Rafael Peixoto (com Claude) | Pós-merge: limite do nome da carreira de 200 para 250 caracteres (schema e spec 08), porque o nome de 2026/313, com dez cursos e três campi, passa de 200 (teste novo). Encontrado ao preparar as notas de corte de 2026 (conteúdo, branch `conteudo/cortes-2026`) |
| 2026-10-02 | Rafael Peixoto (com Claude) | Conferência em produção pelo usuário com o login real — validação ✅, status Concluído. Na mesma entrega, as notas de corte de 2026 (74 carreiras, nomes aprovados pelo usuário) foram publicadas como conteúdo e passam a ser a lista da carreira-alvo |
