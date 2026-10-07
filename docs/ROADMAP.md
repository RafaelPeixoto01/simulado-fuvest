# Roadmap de Produto — Simulado Fuvest

**Versão:** 1.1
**Data:** 2026-10-07
**PRD Ref:** 01-PRD v7.0 (Apêndice: Roadmap Futuro)

> Lista viva das próximas funcionalidades, priorizada pela análise de produto de 07/10/2026. Cada item que entra em desenvolvimento vira um CR (`/sdd-pipeline`); ao abrir ou concluir o CR, atualize a coluna **Status** e o changelog deste arquivo. As fases já concluídas e o que está fora de escopo continuam no PRD (§8 e Apêndice).

---

## 1. O que orienta a prioridade

**Calendário.** A 1ª fase da FUVEST 2027 é em **01/11/2026**. O pico de uso é até lá. Em dezembro vem a 2ª fase, que só interessa aos convocados; depois, o uso cai até o próximo ciclo (fevereiro/março). Funcionalidade pronta depois de 01/11 perde a maior parte do valor deste ano. A partir de **~26/10, só correções**: uma falha no fluxo de resolução durante o pico custa mais do que uma funcionalidade a mais.

**Base pequena para quem usa muito.** São 786 questões válidas (9 provas, em 07/10/2026). A Prova completa sorteia 80 sem saber o que o estudante já fez: cerca de 19% das questões do 3º simulado já apareceram antes, e cerca de 42% no 6º. Quem fez as 9 provas de um ano já viu a base inteira. Por disciplina: Português 135, História 130, Matemática 96, Geografia 96, Química 92, Física 88, Biologia 86, Inglês 67 (contando as anuladas).

**Muitos dados já existem.** O histórico guarda, por questão, a resposta, o acerto e o assunto (`HistoricoEntry.resultado.itens`); o Treino já aceita `excluir`; as contagens anônimas por alternativa existem desde o CR-013. Vários itens abaixo custam pouco por isso.

---

## 2. Itens

Esforço: **P** pequeno, **M** médio, **G** grande. Status: Pendente · Em andamento (CR) · Concluído (CR) · Descartado.

### 2.1 Até a 1ª fase (01/11/2026)

| # | Funcionalidade | Problema | Valor | Esforço | Status | Observação |
|---|----------------|----------|-------|---------|--------|------------|
| 1 | **Questões inéditas primeiro** no sorteio (Prova completa, Personalizado, Treino) | Repetição de questões para quem faz vários simulados | Alto | P–M | Concluído (CR-015) | Garante ~9 Provas completas sem repetir (conferido na base real: a 10ª repete 20, todas da 1ª) |
| 2 | **Caderno de erros**: refazer só as questões erradas ou em branco | A revisão é por simulado; não há como juntar os erros de vários | Alto | M | Pendente | Cobre os últimos 50 simulados (RN-016) |
| 3 | **"Treinar este assunto"** a partir do "Meu desempenho" | O painel diagnostica mas não leva à ação | Alto | P | Pendente | **Desfaz decisão do CR-004** (filtro por assunto fora de escopo). ~7 questões por assunto em média: melhor junto com o item 2 |
| 4 | **Riscar alternativas** durante a prova | Eliminação de alternativas é técnica central na prova em papel | Médio | P | Pendente | Combina com a identidade "Papel & Caneta". Sugestão: mesmo CR do item 5 |
| 5 | **Marcar "chutei"** | O acerto não separa conhecimento de sorte | Médio | P | Pendente | Resultado mostra os acertos no chute à parte |
| 6 | **Evolução da nota até o corte** (gráfico no "Meu desempenho") | O painel mostra o acumulado, não a tendência | Médio | P | Pendente | Dados no histórico; conversão 80 × 90 pela RN-018 |
| 7 | **Tempo por disciplina** na Prova completa | Administrar 5 h para 80 questões | Médio | M | Pendente | Campo novo no simulado em andamento e no histórico (versão 2 do formato) |
| 8 | **Corretor da FUVEST 2027**: escolher a versão, digitar as 80 respostas e ver a nota com o corte | Todo candidato quer saber a nota na mesma noite | Alto (aquisição) | M | Pendente | Precisa estar pronto **antes** de 01/11 (alvo: ~25/10). Testável com os gabaritos S1–S4 de `2027s1`/`2027s2`. O gabarito das 4 versões pode ser digitado pelo curador (hoje só uma versão é ingerida, RN-001). Até sair a lista de 2027, o corte é o de 2026 convertido (estimativa fraca: o formato mudou). Conferir no Manual do Candidato se o candidato pode levar o caderno ou anotar as respostas. Decisão em aberto D2 |

### 2.2 No dia da prova e depois (01/11 → dezembro)

| # | Funcionalidade | Problema | Valor | Esforço | Status | Observação |
|---|----------------|----------|-------|---------|--------|------------|
| 9 | **2ª fase** (Fase 2 do PRD): dissertativas por dia de prova | Os convocados têm ~6 semanas para treinar | Alto, público menor | G | Pendente | Primeira versão possível: escrever a resposta, comparar com as respostas esperadas da FUVEST e se autoavaliar; sem redação. Decisão em aberto D3 |

**Conteúdo do ciclo (não é CR — rotina de curadoria):** publicar a prova da FUVEST 2027 (`conteudo/prova-2027`, família 2027) logo depois de 01/11 e as notas de corte de 2027 (`conteudo/cortes-2027`, com `pontos_prova: 80`) quando saírem; a lista de 2027 passa a ser a da carreira-alvo.

### 2.3 Fora da temporada e próximo ciclo

| # | Funcionalidade | Valor | Esforço | Status | Observação |
|---|----------------|-------|---------|--------|------------|
| 10 | **Ampliar a base** com 2015–2019 e 2021 (~540 questões, +69%) | Alto | G | Pendente | Uma família de layout por CR; 2021 exige OCR. É o que mais aumenta o valor para quem usa muito |
| 11 | **Explicação das questões** | Alto | G | Pendente | Maior lacuna diante dos cursinhos; hoje fora de escopo (PRD §8). Proposta: teste com as 20 questões mais erradas, explicação escrita com IA na curadoria e revisada antes de publicar, como conteúdo no pacote. Explicação errada é pior que nenhuma. Decisão em aberto D4 |
| 12 | **Dificuldade real** ("38% acertaram") e treino com as mais erradas | Médio | P | Pendente | Usa `estatisticas_questoes` (CR-013); só com ≥ 20 respostas (limite da RN-022) |
| 13 | **Imprimir o simulado** e lançar as respostas depois | Médio | M | Pendente | A prova real é em papel. Reaproveita a tela de lançar respostas do item 8 |
| 14 | **Modo escuro e tamanho de fonte** | Médio | P–M | Pendente | Direções B e C no canvas do protótipo; cores em tokens (ADR-013) |
| 15 | **Compartilhar o resultado** como imagem (WhatsApp) | Médio | P–M | Pendente | O link leva à tela de login; sem o nome por padrão |
| 16 | **Medir o funil da apresentação** | Médio | P | Pendente | `GET /api/vitrine` só é chamada pela apresentação: contar os pedidos por dia (anônimo) e comparar com os logins mostra quantos desistem no login (risco "Alcance" do PRD §9). Ajuda a decidir a D2 |

---

## 3. O que não fazer agora

- **Ranking entre estudantes, pontos e medalhas:** fora de escopo no PRD, pressiona adolescentes e ensina pouco.
- **Turmas para professores:** esforço grande e expõe dados de menores a terceiros.
- **Lembretes por e-mail:** exigem consentimento de menores e infraestrutura de e-mail; uma contagem regressiva no site cobre o essencial.
- **App nativo, outros vestibulares, monetização:** continuam fora (PRD §8).

---

## 4. Sequência recomendada (até 01/11)

1. ~~Item 1 — questões inéditas (CR-015)~~ — no ar em 07/10/2026
2. Itens 2 + 3 num CR: "treinar meus erros e assuntos"
3. Itens 4 + 5 num CR: ferramentas de prova
4. Item 8 — corretor, pronto até ~25/10
5. Item 6, se sobrar tempo
6. ~26/10 a 01/11: só correções

Depois de 01/11: publicar a prova de 2027 e decidir a 2ª fase (D3).

---

## 5. Decisões em aberto

| ID | Decisão | Item |
|----|---------|------|
| D1 | Desfazer o "sem filtro por assunto" do CR-004? | 3 |
| D2 | O corretor da FUVEST 2027 abre sem login (exceção ao CR-006) ou exige conta? | 8 |
| D3 | Fazer a 2ª fase ainda neste ciclo? | 9 |
| D4 | Fazer o teste das explicações com IA revisadas pelo curador? | 11 |

---

## Changelog

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.1 | 2026-10-07 | Item 1 concluído (CR-015), no ar em produção |
| 1.0 | 2026-10-07 | Criação, a partir da análise de produto de 07/10/2026; item 1 em andamento (CR-015) |
