# Change Request — CR-014: Backup do banco sem URL pública e correção do `source-map-js`

**Versão:** 1.0  
**Data:** 2026-10-06  
**Status:** Em Implementação  
**Autor:** Rafael Peixoto (com Claude)  
**Prioridade:** Alta

---

## 1. Resumo da Mudança

Duas pendências achadas no fechamento do CR-013, num CR só, a pedido do usuário:

- **A · Backup do banco de produção.** O procedimento do Deploy Guide (§6) usa `pg_dump` com a `DATABASE_PUBLIC_URL`, que não existe: o Postgres da Railway não tem proxy TCP público. A máquina também não tem o cliente do PostgreSQL. Hoje, portanto, não há como fazer o backup obrigatório antes de uma migration destrutiva. O banco guarda contas e históricos de estudantes desde o CR-005.
- **B · Alerta alto do `npm audit`.** `source-map-js` 1.2.1 (GHSA-68fv-2mgg-jv7q, negação de serviço com mapa de código-fonte malicioso) chega por três dependências de build e de teste. A 1.2.2 corrige e cabe nas faixas que elas pedem.

---

## 2. Classificação

| Campo            | Valor |
|------------------|-------|
| Tipo             | Bug Fix (procedimento operacional que não funciona) + atualização de dependência |
| Origem           | Dívida técnica (achada na conclusão do CR-013) |
| Urgência         | Próxima sprint (A antes da próxima migration destrutiva) |
| Complexidade     | Média |

---

## 3. Contexto e Motivação

### Situação Atual (AS-IS)

**A — Backup (conferido em 06/10/2026, só leitura):**
- `railway variables -s Postgres` não tem `DATABASE_PUBLIC_URL`: o Postgres só é alcançável pela rede interna (`postgres.railway.internal`).
- Não há `pg_dump`/`pg_restore` nesta máquina (o próprio §6 já avisava).
- O container do serviço Postgres tem `pg_dump` e `psql` **18.6**, e o volume usa 68 MB de 4,6 GB.
- Pelo `railway ssh -s Postgres`, um `pg_dump -Fc --schema-only` em base64 chegou íntegro a esta máquina: 16.548 bytes, cabeçalho `PGDMP`, mesmo SHA-256 dos dois lados. Baixar um dump completo pelo mesmo caminho é viável.
- O `railway ssh` **não repassa a entrada padrão**: um `cat` remoto com dados no stdin ficou esperando até o tempo acabar. Devolver um arquivo de backup ao servidor (para restaurar) não funciona por esse caminho.
- A CLI da Railway (4.29) não tem comando de backup; os backups nativos do volume ficam no painel e dependem do plano, o que não dá para conferir daqui.
- O CI testa as migrations no Postgres **17**, e a produção roda o **18.6**.

**B — Dependência:**
- `npm ls source-map-js`: 1.2.1, trazida por `@tailwindcss/node` 4.3.3, `postcss` 8.5.28 (via `vite`) e `css-tree` 3.2.1 (via `jsdom`). Todas pedem `^1.2.1`.
- `npm audit`: 1 alerta alto, com correção disponível (`fixAvailable: true`); a 1.2.2 é a mais recente.
- O pacote só roda no build e nos testes (processamento de CSS e mapas de código-fonte); não entra no código que o navegador recebe. O passo do CI é informativo e não bloqueia.

### Problema ou Necessidade
- A: sem backup possível, uma migration destrutiva ou uma perda do volume apagaria contas e históricos sem volta, e o Deploy Guide manda executar um procedimento que falha.
- B: o alerta polui o CI (o passo informativo sai com erro em todo push) e esconde um alerta novo que apareça.

### Situação Desejada (TO-BE)
- A: um procedimento de backup que funciona com a infraestrutura atual, testado de ponta a ponta (dump, transferência, checksum e restauração), documentado no Deploy Guide.
- B: `source-map-js` 1.2.2 no `package-lock.json`, `npm audit` sem alertas, build e testes verdes.

**Decisões do usuário (06/10/2026, §4.3):** D1 (a) backup pelo `railway ssh` e restauração com o proxy TCP ligado só durante ela; D2 (a) ensaio de restauração num banco temporário no servidor; D3 (a) CI no Postgres 18.

---

## 4. Detalhamento da Mudança

### 4.1 O que muda

| #  | Item | Antes (AS-IS) | Depois (TO-BE) |
|----|------|---------------|----------------|
| 1 | Backup (A) | `pg_dump` local com `DATABASE_PUBLIC_URL` (não existe) | Dump dentro do container do Postgres pelo `railway ssh`, uma vez num arquivo temporário, com o SHA-256 conferido nos dois lados; o arquivo `.dump` fica fora do repositório (tem dado pessoal) |
| 2 | Script (A) | — | `scripts/backup-producao.sh` (Git Bash): faz o dump, baixa em base64, confere o checksum, apaga o temporário no container e informa o arquivo gerado; nunca imprime a URL nem a senha |
| 3 | Restauração (A) | `pg_restore` local pela URL pública | D1a: proxy TCP do Postgres ligado só durante a restauração, `pg_restore` 18 local, proxy desligado em seguida |
| 4 | Ensaio (A) | Nunca feito | D2a: opção `--ensaio` do script restaura o mesmo arquivo do backup num banco temporário do servidor, compara as contagens com o banco real e apaga o temporário, antes de baixá-lo |
| 5 | Dependência (B) | `source-map-js` 1.2.1 | 1.2.2 no `package-lock.json` (`npm audit fix`, sem mudar o `package.json`) |
| 6 | CI | Postgres 17 | D3a: Postgres 18, a versão da produção |

### 4.2 O que NÃO muda
- Código da aplicação, API, schema e migrations.
- Variáveis de ambiente da aplicação.
- Rede do Postgres (a menos que a D1 escolha o proxy TCP).
- `package.json` e versões diretas do frontend.

### 4.3 Decisões (respondidas pelo usuário em 06/10/2026: D1a, D2a e D3a)

**D1 · Estratégia de backup e restauração**
- **(a) Dump pelo `railway ssh` + restauração com o proxy TCP ligado só durante a restauração** (recomendada): o backup não expõe o banco nem exige instalar nada; a restauração, rara, liga o proxy TCP do Postgres no painel, usa o `pg_restore` 18 local (instalar o cliente do PostgreSQL) e desliga o proxy em seguida.
- **(b) Backups nativos da Railway + dump pelo `railway ssh` sob demanda**: backups agendados do volume pelo painel (Postgres → Backups), se o plano tiver; o dump pelo ssh continua para antes das migrations. A restauração de desastre é a do painel.
- **(c) Proxy TCP ligado de vez**: devolve a `DATABASE_PUBLIC_URL` e mantém o §6 como está (com o cliente instalado), mas deixa a porta do banco aberta na internet o tempo todo, protegida só pela senha.

**D2 · Ensaio de restauração**
- **(a)** Num banco temporário no próprio servidor de produção, dentro do container: `createdb`, `pg_restore` do dump, conferir as contagens contra o banco real e `dropdb`. Não toca no banco `railway` nem expõe nada (recomendada; prova que o dump restaura).
- **(b)** Só documentar, sem ensaio.

**D3 · Postgres do CI**
- **(a)** Trocar `postgres:17` por `postgres:18` no CI, para as migrations serem testadas na versão de produção (recomendada).
- **(b)** Deixar como está.

---

## 5. Impacto nos Documentos

| Documento | Impactado? | Seções Afetadas | Ação Necessária |
|-----------|------------|-----------------|-----------------|
| `/docs/01-PRD.md` | Não | — | Sem funcionalidade nova: procedimento operacional e dependência de build |
| `/docs/02-ARCHITECTURE.md` | Sim | §1 (CI com o Postgres da produção, se D3a), §3 (pasta `scripts/`), §9.4 (backup) | Atualizar |
| `/docs/03-SPEC.md` | Não | — | Nenhum contrato muda |
| `/docs/04-IMPLEMENTATION-PLAN.md` | Sim | Visão geral | Linha CR-014 |
| `/docs/05-DEPLOY-GUIDE.md` | Sim | §4.3 (backup antes de migration), §5 (rollback), §6 (backup e restauração), changelog | Reescrever o §6 |
| `CLAUDE.md` | Sim | Comandos (backup), Lembretes (banco com dados de usuário), Troubleshooting, CRs | Atualizar |

---

## 6. Impacto no Código

### 6.1 Arquivos Afetados

| Ação | Caminho do Arquivo | Descrição da Mudança |
|------|--------------------|----------------------|
| Criar | `scripts/backup-producao.sh` | Backup pelo `railway ssh` com checksum (A) |
| Modificar | `.gitignore` | Ignorar `*.dump` e a pasta local dos backups |
| Modificar | `frontend/package-lock.json` | `source-map-js` 1.2.2 (B) |
| Modificar | `.github/workflows/ci.yml` | `postgres:18` (se D3a) |

### 6.2 Banco de Dados

| Ação | Descrição | Migration Necessária? |
|------|-----------|-----------------------|
| — | Nenhuma mudança de schema. O ensaio (D2a) cria e apaga um banco temporário no servidor, sem tocar no `railway` | Não |

---

## 7. Tarefas de Implementação

| ID | Tarefa | Depende de | Done When |
|----|--------|------------|-----------|
| CR-T-01 | Este CR, com o diagnóstico e as decisões D1–D3 respondidas pelo usuário | — | Decisões registradas na §4.3 |
| CR-T-02 | `source-map-js` 1.2.2 (`npm audit fix`) | CR-T-01 | `npm audit` sem alertas; build, tsc, lint e vitest verdes |
| CR-T-03 | Script de backup + `.gitignore`; um backup real de produção com o checksum conferido | CR-T-01 | Arquivo `.dump` local, SHA-256 igual nos dois lados, nada sensível no terminal |
| CR-T-04 | Ensaio de restauração (conforme D2) | CR-T-03 | Contagens das tabelas de conta iguais às do banco real |
| CR-T-05 | CI no Postgres 18 (se D3a) | CR-T-01 | CI verde com `postgres:18` |
| CR-T-06 | Deploy Guide §6 (e §4.3, §5), Arquitetura, Plano, CLAUDE.md, INDEX; merge + push + CI verde | CR-T-02 a CR-T-05 | Critérios da §8 marcados |

---

## 8. Critérios de Aceite

- [x] `npm audit` (frontend) sem alertas; só o `package-lock.json` muda; build, tsc, eslint e vitest verdes — `source-map-js` 1.2.1 → 1.2.2 (3 linhas do lockfile); local: `found 0 vulnerabilities`, 317 testes; CI da branch: `found 0 vulnerabilities` no passo informativo
- [x] O script de backup gera um `.dump` de produção com o SHA-256 conferido nos dois lados, apaga o arquivo temporário do container e não imprime URL nem senha — dois backups reais em 06/10 (404.623 bytes; o segundo com o script revisado); depois de cada um, nenhum arquivo em `/tmp` nem banco `ensaio*` no container; o terminal só mostrou nomes de tabela e contagens
- [x] O dump é restaurável (ensaio conforme a D2), com as contagens de `usuarios`, `sessoes`, `simulados_concluidos`, `reportes` e `estatisticas_*` iguais às do banco real — `--ensaio`: as 11 tabelas do banco (inclusive `alembic_version`, `provas`, `questoes` e `textos_base`) com a mesma contagem no banco real e no restaurado
- [x] O Deploy Guide §6 descreve o backup e a restauração que funcionam hoje (D1), e o §4.3 e o CLAUDE.md apontam para eles — §6 reescrito (backup pelo script; §6.1 restauração com o proxy TCP ligado só durante ela, marcada como ainda não exercitada); §4.3, Arquitetura §9.4 e CLAUDE.md (comando, lembrete e troubleshooting do stdin no `railway ssh`)
- [x] Nenhum arquivo `.dump` no repositório (`.gitignore`) — `*.dump` ignorado; o backup fica em `~/backups-simulado-fuvest`
- [x] Testes existentes continuam passando (regressão) — backend 519 (CI), frontend 317
- [x] ~~Novos testes cobrem a mudança~~ — N/A no repositório: script operacional e lockfile. O script foi testado com um `railway` falso (roteiro fora do repositório, 9 casos: arquivo válido com uma linha de base64 começando por "FIM", saída com CRLF, transferência truncada, checksum errado, base64 inválido, ensaio incompleto, ensaio sem contagens, diferença no ensaio, tabela que mudou durante o backup e `railway ssh` com erro), e o ensaio de restauração é o teste do backup real
- [x] Fluxo afetado exercitado em runtime antes do merge — os dois backups reais com `--ensaio` acima e a conferência do container limpo
- [x] Revisão de código pré-merge (`/code-review` no diff da branch) executada — ver "Revisão de código" abaixo
- [x] Revisão de segurança (checklist OWASP do CLAUDE.md): dependência atualizada (`npm audit`) e manuseio de dado pessoal no backup — ver "Revisão de segurança" abaixo
- [x] Documentos afetados foram atualizados — Deploy Guide v1.9, Arquitetura v1.14, Plano, INDEX, CLAUDE.md; PRD e Spec sem mudança (nenhuma funcionalidade nem contrato novo)
- [ ] CI verde na branch e em `master`

**Revisão de código (`/code-review high`, diff da branch) — 10 achados, 9 corrigidos e 1 justificado:**
1. Corrigido: os marcadores `INICIO`/`FIM` casavam por prefixo, e uma linha de base64 que começa com "FIM" (chance de 1 em 64³ por linha) cortaria o arquivo; agora valem só como linha inteira, depois de tirar os CR da saída.
2. Corrigido: com `set -e`, uma falha do `railway ssh` encerrava o script sem a mensagem nem a saída do container; agora o código de saída é tratado e a saída (sem o dump) aparece.
3. Corrigido: uma falha do `base64 -d` deixava um `.dump` parcial com cara de válido; agora o arquivo nasce como `.parcial` e só vira `.dump` depois do checksum, do cabeçalho e do ensaio.
4. Corrigido: o ensaio "passava" sem comparar nada se as contagens faltassem (o `join` descarta tabela sem par); agora o container informa quantas tabelas há em cada lista, e o script recusa lista vazia, incompleta ou diferente.
5. Corrigido: com Ctrl-C ou a conexão caída, o `sh` remoto morria sem apagar o dump do `/tmp`; agora HUP, INT e TERM saem pelo mesmo caminho de limpeza.
6. Corrigido: os arquivos de contagem ficavam no `/tmp` do container quando o ensaio falhava; agora a limpeza também os apaga.
7. Corrigido: o banco do ensaio tinha nome fixo, e dois ensaios ao mesmo tempo se atropelariam; agora leva o PID (`ensaio_restauracao_<pid>`).
8. Corrigido: `umask 077` no início do script. No Windows o NTFS ignora o umask (o arquivo aparece como `-rw-r--r--` no Git Bash); a proteção ali é a pasta pessoal do usuário, que só ele lê.
9. Justificado: o dump passa por cópias temporárias (no container, em base64 e decodificado) e o ensaio duplica o banco no servidor. Com 404 KB de dump e 4,5 GB livres no volume, é desprezível, e fazer streaming perderia a garantia de que o arquivo restaurado no ensaio é o mesmo que foi baixado. Se o banco crescer, comprimir com `-Z` é a saída.
10. Corrigido: o cabeçalho do Deploy Guide apontava a Arquitetura v1.13, e as linhas novas do changelog estavam fora da ordem (já desde o CR-013); agora v1.14 e a ordem cronológica.

**Revisão de segurança (checklist OWASP do CLAUDE.md):**

| Item | Resultado |
|------|-----------|
| Segredos hardcoded | Nenhum. O script não lê nem imprime URL ou senha: as variáveis `PG*` são expandidas dentro do container; a restauração (§6.1) guarda a URL numa variável do shell e a apaga (`unset`) |
| Dado pessoal | O `.dump` e a saída em base64 têm dados de estudantes: `umask 077`, saída temporária apagada no fim, `.dump` fora do repositório (`*.dump` no `.gitignore`) e o aviso de não compartilhar e apagar; os temporários do container são apagados mesmo com erro ou interrupção |
| Exposição do banco | Nenhuma no backup (só `railway ssh` autenticado); na restauração, o proxy TCP fica ligado só durante ela, com o passo explícito de desligar e conferir |
| Validação de entrada / SQL / ownership / CORS / headers | N/A: nenhum endpoint nem consulta da aplicação muda |
| Dependências | `source-map-js` 1.2.2 corrige o GHSA-68fv-2mgg-jv7q; `npm audit` sem alertas; nenhuma dependência nova |

> **Regra de conclusão (CR-037):** o Status deste CR só pode ser "Concluído" quando todos os critérios acima estiverem `[x]` ou riscados com justificativa. Critério pendente de evento posterior (ex: CI verde após push) mantém o CR "Em Implementação" até o follow-up.

---

## 9. Riscos e Efeitos Colaterais

| #  | Risco / Efeito Colateral | Probabilidade | Impacto | Mitigação |
|----|--------------------------|---------------|---------|-----------|
| 1 | O arquivo de backup (dado pessoal de estudantes) vazar da máquina local | Baixa | Alto | Fora do repositório (`.gitignore`), numa pasta local, apagado quando não for mais necessário; nunca enviado a serviço externo |
| 2 | O dump grande demais para passar em base64 pelo ssh | Baixa | Médio | O volume tem 68 MB; o checksum detecta truncamento; se crescer, comprimir (`-Z`) ou dividir |
| 3 | O ensaio no servidor de produção pesar no banco real | Baixa | Baixo | Banco pequeno, banco temporário separado, apagado no fim; fora do horário de uso |
| 4 | Proxy TCP esquecido ligado depois de uma restauração (D1a) | Média | Médio | Passo explícito de desligar no Deploy Guide, com a conferência de que a `DATABASE_PUBLIC_URL` sumiu |
| 5 | `source-map-js` 1.2.2 quebrar o build | Baixa | Baixo | Versão de correção na mesma faixa; build e testes no CI antes do merge |

---

## 10. Plano de Rollback

> Referência: procedimentos detalhados em `/docs/05-DEPLOY-GUIDE.md`.

### 10.1 Rollback de Codigo

- **Método:** `git revert -m 1 <merge do CR-014>` + push. O script e o lockfile voltam; nada da aplicação muda.
- **Método alternativo:** N/A (nenhum comportamento da aplicação muda).
- **Commits a reverter:** o merge `--no-ff` da branch `fix/CR-014-backup-e-dependencia`.

### 10.2 Rollback de Migration

- **Migration afetada:** nenhuma
- **Comando de downgrade:** N/A
- **Downgrade testado?** N/A
- **Downgrade é destrutivo?** N/A

### 10.3 Impacto em Dados

- **Dados serão perdidos no rollback?** [ ] Sim / [x] Nao
- **Detalhamento:** o backup só lê o banco; o ensaio usa um banco temporário apagado no fim.
- **Backup necessário antes do deploy?** [ ] Sim / [x] Nao
- **Procedimento de backup:** o deste CR

### 10.4 Rollback de Variaveis de Ambiente

- **Variáveis novas/alteradas:** nenhuma da aplicação (o proxy TCP da D1a é ligado e desligado só durante uma restauração)
- **Ação de rollback:** N/A

### 10.5 Verificacao Pos-Rollback

- [ ] Aplicação acessível e funcional
- [ ] CI verde

---

## Changelog

| Data       | Autor  | Descrição |
|------------|--------|-----------|
| 2026-10-06 | Rafael Peixoto (com Claude) | CR criado com o diagnóstico (só leitura): sem URL pública nem cliente local, `pg_dump` 18.6 no container, dump íntegro pelo `railway ssh` (checksum), stdin não repassado, CI no Postgres 17 × produção 18.6, `source-map-js` 1.2.2 corrige o GHSA-68fv-2mgg-jv7q |
| 2026-10-06 | Rafael Peixoto (com Claude) | Decisões D1a, D2a e D3a do usuário; status Em Implementação |
| 2026-10-06 | Rafael Peixoto (com Claude) | Implementação (CR-T-02 a CR-T-05): `source-map-js` 1.2.2, `scripts/backup-producao.sh` com dois backups reais com `--ensaio`, CI no Postgres 18 (run 37545145021 verde, imagem `postgres:18`); revisão de código (9 corrigidos, 1 justificado), script testado com um `railway` falso (9 casos) e de segurança; documentos atualizados |
