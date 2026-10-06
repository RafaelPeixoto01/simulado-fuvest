# Change Request — CR-012: Família 2026 no extrator (prova da FUVEST 2026 e simulado oficial de 2025)

**Versão:** 1.0  
**Data:** 2026-10-05  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Média

---

## 1. Resumo da Mudança

O acervo de 2026 da FUVEST (`fuvest.br/acervo-vestibular-2026/`) tem duas provas oficiais de 90 questões que não estão na base: a **prova da 1ª fase da FUVEST 2026** (aplicada em 23/11/2025, versões V1–V4, gabarito retificado em 25/11/2025) e o **simulado oficial da FUVEST 2026** (aplicado em 19/10/2025, 90 questões inéditas, versões S1–S4). O extrator não aceita os códigos `2026` e `2026s1`, porque eles não estão no registry de famílias.

Este CR cria a família **`familia_2026`**: o layout da família 2027 (que estreou nesses PDFs) com o gabarito de 90 questões da família 2025. Também registra `2026` e `2026s1`. A curadoria e a publicação das duas provas são conteúdo e ficam fora do CR (branches `conteudo/prova-2026` e `conteudo/simulados-2026`).

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Nova Feature (extensão do parser) |
| Origem           | Evolução do produto (pesquisa de novas provas, 05/10/2026) |
| Urgência         | Próxima sprint (a 1ª fase da FUVEST 2027 é em 01/11/2026) |
| Complexidade     | Baixa |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)

- O registry (`ingestao/familias.py`) tem `2020`, `2022`–`2025` → `familia_2025` e `2027s1`, `2027s2` → `familia_2027`. `extrair --prova 2026` termina com "Prova 2026 sem família de layout registrada".
- Uma família é um par (parser de prova, parser de gabarito) com o mesmo nome. A `familia_2027` é a variante do layout de 2025 com o marcador de até 14,5 pt e o glifo `(cid:172)` como espaço, e tem gabarito fixo em **80** questões (`total = 80`, que o pacote extraído grava em `total_questoes`).

### Problema ou Necessidade

Teste com os PDFs reais, fora do repositório (05/10/2026):

| PDF | Layout 2025 | Layout 2027 | Gabarito 2025 (90) | Gabarito 2027 (80) |
|-----|-------------|-------------|--------------------|--------------------|
| Prova FUVEST 2026, V1 (38 páginas) | 90 questões, 54 com pendência do parser | 90 questões, 35 com pendência | 90 respostas, a 3 anulada (`*`) | Recusa: "Esperadas 80 … encontradas 90" |
| Simulado FUVEST 2026, S1 (30 páginas) | 90 questões, 65 com pendência | 90 questões, 49 com pendência | 90 respostas | Recusa |

- Os dois PDFs usam o número da questão em Baloo 2 ExtraBold de 13,98 pt e o espaço entre palavras como `(cid:172)`, igual aos simulados de 2027. A família 2025 encontra as questões, mas toma o `(cid:172)` por símbolo não extraído: cada página ganha uma pendência de "símbolos não extraídos" com dezenas de linhas, que esconde as fórmulas de verdade.
- Os dois gabaritos usam o formato da família 2025: `PROVA V1 …` (prova) e `PROVA S1 …` (simulado), linhas `n L n+45 L`, `*` = anulada, e uma página "Gabarito de correspondência" que o parser já ignora.
- Nenhuma das duas famílias serve sozinha: falta a combinação do layout 2027 com o gabarito de 90.

### Situação Desejada (TO-BE)

- `extrair --prova 2026` e `extrair --prova 2026s1` geram os rascunhos com 90 questões, o gabarito casado e `fonte.familia_layout: familia_2026`.
- O simulado entra como `2026s1` (`tipo: simulado`, `edicao: 1`, `total_questoes: 90`), com o rótulo "Simulado FUVEST 2026 · 1ª edição", como os de 2027 (D1).
- Depois deste CR: curadoria de cada prova numa branch de conteúdo, com a revisão do usuário, como nas outras.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| # | Item | Antes (AS-IS) | Depois (TO-BE) |
|---|------|---------------|----------------|
| 1 | Famílias | `familia_2025` e `familia_2027` | + `familia_2026`: layout com a `VARIANTE_2027` (marcador 12–14,5 pt, `(cid:172)` = espaço) e gabarito de 90 (`ParserGabarito2025` com outro nome) |
| 2 | Registry | 2020, 2022–2025, 2027s1, 2027s2 | + `2026` e `2026s1` → `familia_2026` |
| 3 | Testes | IT-032 a IT-034 (família 2027) | + IT-035 (gabarito 2026: prova com a 3 anulada e simulado com 90), IT-036 (layout 2026: páginas da prova e do simulado, questões 89–90), IT-037 (`extrair --prova 2026s1`: simulado de 90 com `familia_2026`) e o teste do registry |

### Decisões

- **D1 (usuário, 05/10/2026) · Rótulo do simulado:** o simulado de 19/10/2025 teve uma edição só, mas entra como `2026s1` e aparece como "Simulado FUVEST 2026 · 1ª edição". Assim não mexe no schema nem no rótulo. A alternativa, "Simulado FUVEST 2026" sem edição, exigiria um simulado de edição única no schema.
- **D2 · Família nova, e não um gabarito de total variável:** o total do pacote vem do parser de gabarito da família (ADR-015). Uma família nova com duas subclasses de uma linha mantém esse contrato e não toca nas famílias 2025 e 2027 nem nos pacotes publicados.

### 4.2 O que NÃO muda

- As famílias `familia_2025` e `familia_2027` e os pacotes publicados (2020, 2022–2025, 2027s1, 2027s2).
- Schema do pacote, validação, sincronização, banco, API e frontend: provas de 90 questões, vestibulares e simulados oficiais já são suportados (CR-011).
- A regra "conteúdo não é código": os pacotes `2026` e `2026s1` não entram neste CR.
- 2021 continua fora (exige OCR).

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Sim | §9 Dependências | O simulado oficial de 2025 fica no acervo de 2026; versão 6.1 |
| `/docs/02-ARCHITECTURE.md` | Sim | Estrutura de pastas (`ingestao/`), ADR-003 | Acrescentar a `familia_2026`; v1.12 |
| `/docs/03-SPEC.md` | Sim | Índice (spec 01) | Famílias 2025, 2026 e 2027 |
| `/docs/specs/01-ingestao.md` | Sim | Arquivos, registries, família 2026, testes IT-035 a IT-037 | Documentar a família e os testes |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | CR Ref e tabela de CRs | Acrescentar o CR-012 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | §4.2 Conteúdo | O simulado de 2025 (`2026s1`) tem 90 questões; código novo só extrai depois de registrado (CR); v1.7 |
| `CLAUDE.md` | Sim | Change Requests, Última Tarefa | Acrescentar o CR-012 e mover o CR-007 para o INDEX |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `backend/ingestao/layouts/familia_2026.py` | `ParserLayout2026`: variante 2027 com o nome `familia_2026` |
| Criar | `backend/ingestao/gabarito/familia_2026.py` | `ParserGabarito2026`: formato da 2025, 90 questões, nome `familia_2026` |
| Modificar | `backend/ingestao/layouts/__init__.py`, `backend/ingestao/gabarito/__init__.py` | `familia_2026` nos `PARSERS` |
| Modificar | `backend/ingestao/familias.py` | `2026` e `2026s1` → `familia_2026` |
| Modificar | `backend/tests/test_ingestao_familias.py` | Registry com os dois códigos |
| Criar | `backend/tests/test_ingestao_familia_2026.py` | IT-035 a IT-037 |
| Criar | `backend/tests/fixtures/pdfs/fuvest2026_gabarito.pdf`, `fuvest2026_v1_p22.pdf`, `simulado2026s1_gabarito.pdf`, `simulado2026s1_p28.pdf` | Página "Gabarito" de cada PDF e uma página de cada prova (≈ 0,5 MB no total) |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma: códigos `AAAA` e `AAAAsN` e provas de 90 já existem (ADR-015) | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Família 2026 (layout + gabarito), `PARSERS` e registry | — | `extrair --prova 2026` e `--prova 2026s1` com os PDFs reais (fora do repositório): 90 questões e gabarito casado |
| CR-T-02 | Fixtures e testes IT-035 a IT-037; teste do registry | CR-T-01 | `pytest` e `ruff` verdes |
| CR-T-03 | Documentação (PRD, Arquitetura, índice da Spec, spec 01, Plano, Deploy Guide, CLAUDE.md, INDEX) | CR-T-02 | Docs refletem a família 2026 |

---

## 8. Critérios de Aceite

- [ ] `extrair --prova 2026` com os PDFs oficiais (V1) gera 90 questões, `total_questoes: 90`, `familia_layout: familia_2026`, o gabarito casado e a questão 3 anulada
- [ ] `extrair --prova 2026s1` com os PDFs oficiais (S1) gera 90 questões, `tipo: simulado`, `edicao: 1`, `versao: S1`, `total_questoes: 90` e o gabarito casado
- [ ] Os textos dos rascunhos saem sem `(cid:` e sem a pendência de "símbolos não extraídos" causada pelo espaço
- [ ] As famílias 2025 e 2027 continuam extraindo como antes (IT-008, IT-009, IT-032 a IT-034) e `validar --todas` segue verde sem editar nenhum pacote
- [ ] Testes existentes continuam passando (regressão)
- [ ] Novos testes cobrem a mudança (IT-035 a IT-037 e o registry)
- [ ] Fluxo afetado exercitado em runtime antes do merge: CLI `baixar` + `extrair` com os PDFs reais num diretório temporário. O site não muda (sem endpoint, tela nem pacote novo), então o Playwright e o HTTP ficam N/A
- [ ] Revisão de código pré-merge: N/A — complexidade Baixa (CR-040)
- [ ] Revisão de segurança: N/A — sem endpoint, autenticação, dados de usuário nem dependência nova; o parser só lê PDFs baixados pelo curador
- [ ] Documentos afetados foram atualizados
- [ ] CI verde na branch e em `master`

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| # | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|---|--------------------------|---------------|---------|-----------|
| 1 | O layout de 2026 ter alguma diferença que as páginas de teste não mostram (ex.: texto em volta de foto, figuras lado a lado) | Média | Baixo | É o que a curadoria página a página já trata (lições da 2027 na memória de curadoria); o rascunho só é publicado depois da revisão do usuário |
| 2 | Fixtures aumentarem o repositório | Baixa | Baixo | Só a página do gabarito e uma página de cada prova (≈ 0,5 MB) |
| 3 | O simulado de 2025 aparecer como "1ª edição" sem ter havido uma 2ª | Alta | Baixo | Decisão D1 do usuário; o rótulo pode mudar num CR futuro sem mexer no pacote |

---

## 10. Plano de Rollback

> Referencia: Procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md` (secoes 4 e 5).

### 10.1 Rollback de Codigo

- **Metodo:** `git checkout -b hotfix/revert-CR-012` → `git revert -m 1 <merge>` → merge em `master` → push
- **Metodo alternativo:** Redeploy do deployment anterior via Railway Dashboard
- **Commits a reverter:** o merge da branch `feat/CR-012-provas-2026`. Se os pacotes `2026`/`2026s1` já estiverem publicados, eles continuam válidos (a família só é usada no `extrair`; a validação e a sincronização não consultam o registry)

### 10.2 Rollback de Migration

- **Migration afetada:** nenhuma
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade e destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serao perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** o CR não toca no banco nem em pacotes
- **Backup necessario antes do deploy?** [ ] Sim / [x] Nao
- **Procedimento de backup:** N/A

### 10.4 Rollback de Variaveis de Ambiente

- **Variaveis novas/alteradas:** Nenhuma
- **Acao de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicacao acessivel e funcional
- [ ] `alembic current` mostra revisao esperada (N/A: sem migration)
- [ ] `python -m ingestao extrair --prova 2027s1` continua funcionando com a família 2027
- [ ] Usuarios existentes conseguem fazer login

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-05 | Rafael Peixoto (com Claude) | CR criado a partir da pesquisa de novas provas (relatório do Gemini conferido nas fontes): a prova da FUVEST 2026 e o simulado oficial de 19/10/2025 estão no acervo e não estão na base. Teste das famílias com os PDFs reais; D1 (rótulo "1ª edição") decidido pelo usuário |
