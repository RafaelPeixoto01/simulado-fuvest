# PRD — Simulado Fuvest

**Versão:** 7.2
**Data:** 2026-10-09
**Status:** Aprovado
**Fase:** MVP — Simulados da 1ª fase + Fase 3 — Assuntos e desempenho (3A) e Contas (3B), com login obrigatório (CR-006) + Fase 4 — Notas de corte (CR-010) + formato de 80 questões e simulados oficiais da FUVEST (CR-011) + área de gestão (CR-013) + inéditas primeiro no sorteio (CR-015)
**CR Ref:** CR-001, CR-003, CR-004, CR-005, CR-006, CR-007, CR-008, CR-010, CR-011, CR-012, CR-013, CR-015, CR-016

---

## 1. Visão Geral do Produto

O **Simulado Fuvest** é um site público e gratuito que gera simulados da **1ª fase da FUVEST** (Prova de Conhecimentos Gerais) usando questões reais de provas de anos anteriores, publicadas no acervo oficial em [fuvest.br](https://www.fuvest.br/acervo/), e dos simulados oficiais que a própria FUVEST aplica e publica (CR-011).

**Problema:** as provas antigas existem só como PDFs soltos, um por ano. Para treinar, o estudante imprime ou lê o PDF, confere as respostas à mão no gabarito e não tem nenhuma visão do próprio desempenho por disciplina. Também não dá para montar uma prova misturando anos, nem treinar só uma matéria.

**Solução:** uma base de questões estruturada (enunciado, alternativas, figuras, gabarito, disciplina, assunto, ano), alimentada por um processo de ingestão dos PDFs oficiais, sobre a qual o site gera quatro tipos de simulado. O próprio site corrige e mostra o desempenho por disciplina e por assunto, em cada simulado e somando os simulados já feitos (CR-004). Para usar o site, o estudante entra com a conta Google, que guarda o histórico e o mostra em qualquer dispositivo (CR-005, CR-006). O site também traz as notas de corte da 1ª fase de cada carreira da USP, e o resultado compara a nota do simulado com o corte da carreira-alvo escolhida pelo estudante (CR-010). Uma área de gestão, só para o administrador, mostra os números do site: uso, onde os estudantes vão pior, questões com sinal de erro e a lista de contas (CR-013).

**Público-alvo:** estudantes que vão prestar a FUVEST (3º ano do ensino médio, cursinho, treineiros).

**A 1ª fase da FUVEST** (Guia de Provas 2025): 90 questões de múltipla escolha com 5 alternativas (A–E) e uma correta, até 5 horas de prova, cada questão vale 1 ponto. Disciplinas: Biologia, Física, Geografia, História, Inglês, Matemática, Português e Química, com algumas questões interdisciplinares. Questão anulada tem o ponto atribuído a todos os candidatos. **Desde a FUVEST 2027** (Resolução CoG nº 9008/2026, art. 11; 1ª fase em 01/11/2026), são **80 questões**, no mesmo tempo e com o mesmo formato; a eliminação passa a ser abaixo de 24 acertos (30%). A FUVEST aplicou dois simulados oficiais nesse formato em 2026 (1ª edição em 26/04 e 2ª em 26/07), com as provas e os gabaritos publicados (CR-011).

---

## 2. Objetivos e Métricas de Sucesso

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Base de questões útil no lançamento | Provas (anos) publicadas na base | ≥ 5 provas (450 questões) no lançamento; +1 prova por ano (a cada novo vestibular) |
| Questões corretas e confiáveis | % de questões publicadas que passam em todas as validações automáticas (RN-007) | 100% |
| Questões corretas e confiáveis | Questões com reporte de erro confirmado / questões publicadas | < 2% |
| Estatística por assunto confiável | % de questões publicadas com assunto da taxonomia (V11, CR-004) | 100% |
| Ingestão sustentável sem IA | Tempo de curadoria manual (revisão + classificação) por prova | ≤ 3 h por prova |
| Uso do produto | Simulados gerados por semana (contagem anônima no servidor) | Linha de base medida no 1º mês após o lançamento |
| Uso do produto | Usuários ativos por dia e simulados concluídos por semana (contagem anônima, vista na área de gestão — CR-013) | Linha de base medida no 1º mês após o CR-013 |
| Experiência fluida | Tempo de geração de um simulado (p95) | < 2 s |

---

## 3. Personas

### Persona 1: Estudante vestibulando
- **Perfil:** 16–19 anos, 3º ano do ensino médio ou cursinho, vai prestar a FUVEST. Estuda no celular e no computador. Entra com a conta Google, obrigatória desde o CR-006, e vê o mesmo histórico em qualquer aparelho.
- **Necessidades:** treinar com questões reais no formato da prova; fazer provas completas cronometradas para ganhar ritmo; focar nas disciplinas em que vai pior; saber na hora o que errou; saber se a nota do simulado chegaria ao corte da carreira que quer (CR-010).
- **Frustrações:** PDFs dispersos por ano; correção manual pelo gabarito; nenhuma estatística por disciplina; não conseguir montar uma lista só de Física ou só de anos recentes.

### Persona 2: Curador da base (dono do produto)
- **Perfil:** mantém o site. Roda os scripts de ingestão localmente e revisa as questões antes de publicar.
- **Necessidades:** transformar o PDF de uma prova nova em questões publicadas com o mínimo de trabalho manual; saber exatamente o que o parser não conseguiu extrair; corrigir erros reportados pelos estudantes; acompanhar os números do site (uso, desempenho dos estudantes, questões com sinal de erro) sem consultar o banco (CR-013).
- **Frustrações:** layout e codificação dos PDFs mudam de ano para ano (ex.: 2015 com artefatos de fonte, 2025 em quatro versões e duas colunas); figuras que fazem parte do enunciado; classificar 90 questões por disciplina à mão.

---

## 4. Requisitos Funcionais

### Módulo: Ingestão de Provas (curador, via linha de comando)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-001 | Registrar uma prova do acervo ou um simulado oficial da FUVEST (código da prova + URLs oficiais do PDF da prova e do gabarito) e baixar os PDFs | Alta | Curador |
| RF-002 | Extrair o gabarito oficial (90 ou 80 respostas A–E ou "anulada") da versão escolhida | Alta | Curador |
| RF-003 | Extrair as questões do PDF da prova: número, enunciado, texto-base compartilhado, alternativas A–E e figuras | Alta | Curador |
| RF-004 | Gerar um pacote de revisão editável por prova, com relatório de validação e pendências | Alta | Curador |
| RF-005 | Classificar cada questão por disciplina e por assunto durante a revisão | Alta | Curador |
| RF-006 | Importar o pacote revisado no banco de forma idempotente e publicar a prova | Alta | Curador |
| RF-007 | Consultar os reportes de erro enviados pelos estudantes e corrigir a questão | Média | Curador |
| RF-023 | Manter a taxonomia de assuntos de cada disciplina, versionada junto com as provas (CR-004) | Alta | Curador |

**RF-001 — Detalhamento:**
- Campos obrigatórios: código da prova (o ano do vestibular, ex.: `2025`; ou `AAAAsN` no simulado oficial, ex.: `2027s1` — CR-011), URL do PDF da prova, URL do PDF do gabarito
- Campos opcionais: versão da prova (V1 por padrão quando houver várias; "única" em anos com uma só versão)
- Regras específicas: os PDFs baixados ficam guardados localmente como cópia de referência. O padrão das URLs muda por ano (ex.: `fuvest2025_primeira_fase_prova_V1.pdf` × `fuvest_2015_1fase_prova_V.pdf`), então elas são informadas, não deduzidas

**RF-002 — Detalhamento:**
- Lê a tabela do gabarito e extrai a coluna da versão registrada (RN-001)
- Reconhece questões anuladas
- Falha com mensagem clara se não encontrar exatamente o total da prova (90 até 2026; 80 nos simulados oficiais e desde a FUVEST 2027 — CR-011)

**RF-003 — Detalhamento:**
- Parser determinístico (sem IA), organizado por **família de layout**: anos com a mesma diagramação compartilham a mesma lógica de extração
- Trata diagramação em duas colunas e artefatos de codificação de fonte
- Figuras: extrai as imagens embutidas no PDF e, quando a figura é vetorial (gráficos, diagramas), recorta a região da página renderizada
- Textos-base compartilhados ("Texto para as questões 10 e 11") são extraídos uma vez e vinculados às questões correspondentes
- O que o parser não conseguir extrair com segurança vira pendência no relatório (RF-004); nada é descartado em silêncio

**RF-004 — Detalhamento:**
- Saída por prova: arquivo estruturado legível e editável à mão + pasta com as figuras
- Validações automáticas: o total de questões da prova (90 ou 80); 5 alternativas não vazias por questão; resposta do gabarito presente para cada questão; toda figura referenciada existe; toda questão tem disciplina principal e um assunto dessa disciplina (CR-004)
- Relatório lista as pendências por questão (ex.: "Q37: alternativa D vazia", "Q52: figura não localizada")

**RF-005 — Detalhamento:**
- Campos obrigatórios: disciplina principal (uma das 8 disciplinas oficiais); assunto (exatamente um, da taxonomia da disciplina principal — RN-014, CR-004)
- Campos opcionais: disciplinas secundárias (para questões interdisciplinares), sem assunto próprio
- Regras específicas: feita pelo curador no pacote de revisão; a importação recusa questão sem disciplina principal ou sem assunto válido. Um comando lista a classificação de uma prova, agrupada por disciplina e assunto, para revisão

**RF-023 — Detalhamento (CR-004):**
- Lista fixa de assuntos por disciplina (11 a 14; Inglês, que na FUVEST é só leitura, tem 5), condensada do "Programa das disciplinas" do Guia de Provas FUVEST, em arquivo versionado junto com os pacotes das provas
- Cada assunto tem um identificador estável (slug) e um nome para exibição
- A taxonomia é validada no CI; taxonomia inválida impede a publicação (a sincronização não altera o banco)
- Renomear o slug de um assunto já usado exige reclassificar as questões na mesma mudança (a validação acusa o que ficou órfão)

**RF-006 — Detalhamento:**
- Reimportar a mesma prova atualiza as questões existentes, sem duplicar
- A prova só fica visível no site quando o pacote passa em todas as validações e o curador a marca como publicada (RN-006)
- Figuras são publicadas junto com as questões

**RF-007 — Detalhamento:**
- Lista os reportes pendentes (questão, tipo, texto, data)
- Após a correção no pacote e a reimportação, o reporte é marcado como resolvido
- Desde o CR-013, a lista e a resolução também estão na área de gestão (RF-033); o comando continua existindo

### Módulo: Início e Catálogo

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-008 | Tela inicial com os modos de simulado e o catálogo da base (anos disponíveis, questões por disciplina) | Alta | Estudante |

**RF-008 — Detalhamento:**
- Mostra os 4 modos (RF-009 a RF-012) com uma descrição curta de cada um
- Mostra os anos publicados e o total de questões por disciplina
- Se houver simulado em andamento no navegador, oferece retomar (RN-012), num aviso no topo da página com o progresso e o tempo restante (o relógio continua correndo com a aba fechada, RN-009); enquanto isso, os modos ficam em segundo plano (CR-003)
- Os anos da base aparecem como links para o PDF oficial, avisando que abrem em outra aba (CR-003)
- Com conta (CR-008): saudação "Olá, ‹primeiro nome›." acima do título; a Prova completa em destaque, num cartão maior, e os outros três modos em cartões menores; e o cartão "Seu último simulado" (acertos, aproveitamento e as duas disciplinas mais fracas, com links para o resultado e para "Meu desempenho")
- Rodapé com aviso de que o site não é afiliado à FUVEST/USP e com link para o acervo oficial
- Sem login, o início é uma página de apresentação: o que é o site, os 4 modos e "Entrar com Google" (RN-017, CR-006). Desde o CR-007, ela mostra também os números da base (questões válidas, provas e anos, pela vitrine pública) e uma prévia da tela de resolução; o resto dos dados da base continua protegido com o catálogo

### Módulo: Geração de Simulados

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-009 | Prova completa: 80 questões (o formato da FUVEST 2027 — CR-011) sorteadas de várias provas, na distribuição por disciplina da prova real, com 5 h | Alta | Estudante |
| RF-010 | Personalizado: o estudante escolhe disciplinas, intervalo de anos e quantidade de questões | Alta | Estudante |
| RF-011 | Prova de um ano: a prova original de um ano ou um simulado oficial da FUVEST, inteiro e na ordem original, com 5 h (CR-011) | Alta | Estudante |
| RF-012 | Treino por questão: uma questão por vez com correção imediata, sem cronômetro | Alta | Estudante |

**RF-009 — Detalhamento:**
- Distribuição por disciplina conforme RN-003; sem repetição (RN-004); sem anuladas (RN-002)
- Cronômetro de 5 h, sem pausa (RN-009)
- As questões que o estudante ainda não fez vêm primeiro em cada disciplina (RN-023, CR-015)

**RF-010 — Detalhamento:**
- Campos obrigatórios: pelo menos uma disciplina; quantidade de questões (1 a 90)
- Campos opcionais: intervalo de anos (padrão: todos); cronômetro ligado/desligado (padrão: ligado, com tempo proporcional — RN-009)
- Disciplinas: a questão entra quando a principal ou alguma secundária está entre as escolhidas, então as interdisciplinares entram quando tocam uma delas (no Treino é diferente: RF-012, CR-016)
- Regras específicas: se não houver questões suficientes para os filtros, informa quantas existem e oferece gerar com esse total. Entre as que atendem aos filtros, as que o estudante ainda não fez vêm primeiro (RN-023, CR-015)

**RF-011 — Detalhamento:**
- Lista os anos publicados e, à parte, os simulados oficiais da FUVEST (CR-011); o estudante escolhe um
- A prova tem o total dela: 90 questões de 2020 a 2026, 80 nos simulados oficiais (e na FUVEST 2027, quando entrar)
- Questões na ordem original da versão ingerida; anuladas aparecem e contam como acerto (RN-002)

**RF-012 — Detalhamento:**
- Filtros opcionais: disciplinas e intervalo de anos
- O filtro de disciplinas conta só a disciplina principal: uma questão interdisciplinar entra apenas no treino da principal dela, nunca no de uma secundária (CR-016)
- Ao responder, mostra na hora se acertou e qual é a alternativa correta; botão "próxima" sorteia outra questão
- Placar da sessão (acertos/respondidas), sem histórico permanente
- Não repete questão na sessão, e as que o estudante ainda não fez em simulados vêm primeiro (RN-023, CR-015)

### Módulo: Resolução do Simulado

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-013 | Tela de questão: texto-base, enunciado, figuras, alternativas, marcar/desmarcar resposta | Alta | Estudante |
| RF-014 | Navegação por grade de questões com estado (respondida, em branco, marcada para revisar) | Alta | Estudante |
| RF-015 | Cronômetro regressivo com finalização automática | Alta | Estudante |
| RF-016 | Salvar o simulado em andamento no navegador e finalizar com confirmação | Alta | Estudante |

**RF-013 — Detalhamento:**
- Figuras com ampliação ao tocar/clicar: abrem ajustadas à tela, com a opção "Tamanho real" (CR-003)
- Mostra a fonte da questão (FUVEST ano, nº original)
- Atalhos de teclado: A–E marcam a alternativa; setas navegam
- O gabarito nunca aparece durante o simulado (exceto no modo Treino)

**RF-014 — Detalhamento:**
- Grade com os números das questões, colorida pelo estado; clicar leva à questão
- Opção "marcar para revisar" por questão
- No desktop, a folha de respostas fica sempre à vista e cabe inteira na tela; no celular, abre como painel (diálogo acessível) com botões de 48 px (CR-001)
- Anterior, Revisar e Próxima ficam numa barra fixa no rodapé; trocar de questão volta ao topo da nova questão (CR-001)

**RF-015 — Detalhamento:**
- Mostra o tempo restante; pode ser ocultado na tela, mas continua contando
- No Personalizado, pausar esconde a questão até retomar (CR-001)
- Aviso quando faltarem 15 min; ao zerar, finaliza automaticamente (RN-010)

**RF-016 — Detalhamento:**
- Respostas, marcações e horário de início persistidos no navegador a cada alteração: recarregar a página ou fechar a aba não perde nada
- "Finalizar" pede confirmação e mostra quantas questões estão em branco e quantas estão marcadas para revisar; fica no rodapé da folha de respostas e no lugar de "Próxima" na última questão (CR-001)
- Durante a resolução, a tela fica em modo foco, sem o cabeçalho e o rodapé do site (CR-001)

### Módulo: Resultado

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-017 | Nota do simulado: acertos, total e percentual, além do tempo gasto | Alta | Estudante |
| RF-018 | Desempenho por disciplina | Alta | Estudante |
| RF-019 | Revisão questão a questão: resposta do estudante × gabarito oficial | Alta | Estudante |

**RF-017 — Detalhamento:**
- Nota conforme RN-008
- Tempo gasto e tempo médio por questão

**RF-018 — Detalhamento:**
- Por disciplina principal: acertos / questões e percentual, ordenado da pior para a melhor
- Em cada disciplina, "Ver por assunto" (recolhido) mostra acertos / questões por assunto, também do pior para o melhor (CR-004)

**RF-019 — Detalhamento:**
- Cada questão com a alternativa marcada, a correta e a sinalização de anulada, quando for o caso
- Filtros: todas, erradas, em branco, por disciplina
- Uma questão por vez, com Anterior/Próxima; a folha corrigida, logo depois do desempenho por disciplina, leva direto a qualquer questão (CR-003)

### Módulo: Histórico

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-020 | Histórico dos simulados concluídos, guardado no navegador e, com conta, também na conta (CR-005) | Média | Estudante |

**RF-020 — Detalhamento:**
- Lista com data, modo, nota e percentual; abrir um item mostra o resultado (RF-017 a RF-019)
- Botão para limpar o histórico; com conta, limpa na conta (todos os dispositivos), com confirmação que diz isso (CR-005)
- Sem conta: aviso explícito de que o histórico fica só neste navegador e se perde ao trocar de dispositivo ou limpar os dados do navegador, com convite para entrar com o Google. Com conta: aviso de que o histórico está na conta e aparece em todos os dispositivos (CR-005)
- Até os 50 simulados mais recentes, no navegador e na conta (RN-016)

### Módulo: Desempenho (CR-004)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-022 | Painel "Meu desempenho": desempenho acumulado por disciplina e por assunto, somando os simulados concluídos do histórico | Alta | Estudante |

**RF-022 — Detalhamento:**
- Resumo: simulados considerados, questões e percentual de acerto
- Por disciplina (da pior para a melhor), com os assuntos de cada uma (do pior para o melhor) e acertos / questões e percentual em texto
- Regras de agregação na RN-015 (anuladas fora, em branco como erro, "poucas questões" abaixo de 5)
- Fonte: o histórico (RF-020), que com conta é o histórico sincronizado (CR-005); o Treino não entra (RF-012). O mesmo aviso do histórico: só neste navegador, ou na conta
- Acesso pelo cabeçalho do site e pela página Histórico; sem simulados concluídos, convida a começar um

### Módulo: Conta (CR-005)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-024 | Entrar e sair com a conta Google, obrigatório para usar o site (CR-006) | Alta | Estudante |
| RF-025 | Sincronizar o histórico de simulados concluídos com a conta, entre dispositivos | Alta | Estudante |
| RF-026 | Excluir a conta e todos os dados dela no servidor; página de privacidade | Alta | Estudante |

**RF-024 — Detalhamento:**
- Só com Google: sem cadastro com senha, sem e-mail de recuperação
- "Entrar" no cabeçalho e na página Conta; o login volta para a página de origem e o cabeçalho passa a mostrar o primeiro nome
- Sair: os simulados ainda não enviados vão para a conta e o histórico deixa este navegador; continua na conta (RN-016)
- ~~Sem conta, o site funciona por inteiro~~ — desde o CR-006, sem conta abrem só a apresentação e a Privacidade, e um link direto volta à página pedida depois do login (RN-017)

**RF-025 — Detalhamento:**
- Ao entrar, os simulados já feitos neste navegador vão para a conta (RN-016)
- Simulado concluído com conta vai para a conta na hora; sem internet, fica pendente e vai na próxima vez
- Com conta, o histórico (RF-020) e o painel "Meu desempenho" (RF-022) mostram o que está na conta, em qualquer dispositivo
- O simulado em andamento e o Treino não são sincronizados

**RF-026 — Detalhamento:**
- "Excluir conta" na página Conta, com confirmação: apaga na hora o nome, o e-mail e todo o histórico guardado no servidor, e também o histórico deste navegador
- Página Privacidade (link no rodapé): o que é guardado, para quê, cookies, como excluir e contato

### Módulo: Notas de Corte (CR-010)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-027 | Extrair do PDF oficial as notas de corte da 1ª fase de um ano, revisar os nomes das carreiras e publicá-las | Alta | Curador |
| RF-028 | Consultar as notas de corte por ano e carreira | Alta | Estudante |
| RF-029 | Escolher uma carreira-alvo e comparar a nota da Prova completa e da Prova de um ano com o corte dela, na escala da lista de corte (CR-011) | Alta | Estudante |

**RF-027 — Detalhamento:**
- Um comando baixa o PDF "Notas de Corte" do acervo (URL informada, como as das provas) e gera um rascunho por ano, com as três modalidades de cada carreira (ampla concorrência, escola pública e escola pública PPI): vagas, convocados, corte (menor nota entre os convocados para a 2ª fase) e maior nota
- Ficam de fora as carreiras de treineiro. Modalidade sem convocados fica sem corte
- O rascunho aponta os nomes cortados e os repetidos no ano. O curador completa o nome e, quando o PDF não traz o campus (de 2024 em diante), o campus de todas as carreiras, pelo Guia de Carreiras ou pelo Manual do Candidato do ano
- As notas de corte ficam no repositório, como os pacotes das provas, e só são publicadas sem pendências e com nomes únicos no ano (validação no CI)

**RF-028 — Detalhamento:**
- Página "Notas de corte" (cabeçalho e menu do celular): escolha do ano (o mais recente por padrão), busca pelo nome ou código da carreira, tabela com vagas e o corte de cada modalidade
- Explica o que é o corte, o mínimo de 30% (27 pontos de 90; 24 de 80 a partir de 2027 — CR-011) e que é referência para a 1ª fase, não previsão de aprovação; link para o PDF oficial
- Exige login, como o resto do conteúdo (RN-017)

**RF-029 — Detalhamento:**
- A carreira-alvo é escolhida na página, entre as carreiras do ano mais recente, e fica guardada na conta (RN-019)
- O resultado da Prova completa e da Prova de um ano mostra os três cortes da carreira-alvo e quanto falta para cada um, ou se a nota atingiu o corte (RN-018); quando o simulado e a lista de corte têm tamanhos diferentes, a nota é convertida para a escala da lista e mostrada como estimativa (CR-011); na Prova de um ano de vestibular, um link leva aos cortes daquele ano
- O cartão "Seu último simulado" do início mostra a mesma comparação numa linha
- Sem carreira-alvo, o resultado convida a escolher uma

### Módulo: Reporte de Erro

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-021 | Reportar problema em uma questão, de forma anônima | Média | Estudante |

**RF-021 — Detalhamento:**
- Campos obrigatórios: tipo (enunciado/alternativa com erro, figura faltando ou ilegível, gabarito incorreto, outro)
- Campos opcionais: descrição livre (até 500 caracteres)
- Regras específicas: disponível na tela de questão e na revisão do resultado; sem dados pessoais; limite de envios por origem (RNF-004)

### Módulo: Gestão (CR-013)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-030 | Área de gestão na web, visível só para o administrador do site | Alta | Curador |
| RF-031 | Acompanhar o uso do site: estudantes cadastrados, logins, usuários ativos, simulados gerados e concluídos, por período | Alta | Curador |
| RF-032 | Ver o desempenho somado de todos os estudantes, por modo, disciplina e assunto, e as carreiras-alvo mais escolhidas | Média | Curador |
| RF-033 | Ver e resolver os reportes de erro, as questões com sinal de gabarito errado e a saúde da base | Alta | Curador |
| RF-034 | Consultar a lista de contas, para suporte | Média | Curador |

**RF-030 — Detalhamento:**
- Página "Gestão" com quatro abas: Uso, Aprendizado, Qualidade e Estudantes; link no cabeçalho e no menu do celular só para o administrador
- O administrador é a conta Google definida na configuração do servidor (RN-020); para qualquer outra pessoa a área não existe ("página não encontrada")
- A curadoria das provas, das notas de corte e da taxonomia continua por linha de comando

**RF-031 — Detalhamento:**
- Filtro de período: últimos 7, 30 ou 90 dias, ou desde o início
- Cartões: estudantes (total e novos no período), ativos hoje, em 7 e em 30 dias, logins, simulados gerados, simulados concluídos e contas excluídas
- Gráficos por dia (até 31 dias) ou por semana: cadastros, usuários ativos, logins, gerados e concluídos
- Taxa de conclusão por modo (concluídos ÷ gerados), quantos simulados cada estudante tem no histórico e as provas mais feitas na Prova de um ano
- Logins, usuários ativos e concluídos vêm de contagens anônimas por dia (RN-021); logins e ativos só existem a partir do CR-013

**RF-032 — Detalhamento:**
- Por modo, no período: acerto médio, porcentagem finalizada por tempo e tempo médio por questão
- Por disciplina e assunto, desde o início: acerto de todas as respostas, sem as anuladas, com o gabarito atual
- As carreiras-alvo mais escolhidas, com os cortes e quantos estudantes atingiriam cada um no último simulado de Prova completa (RN-018)

**RF-033 — Detalhamento:**
- Reportes pendentes com a questão ao lado (que abre com o gabarito marcado) e "marcar como resolvidos"; lista dos resolvidos recentemente; índice da métrica de reportes do §2
- Questões suspeitas (RN-022), com a distribuição das marcações e o gabarito
- Saúde da base: provas, questões válidas e anuladas, questões sem assunto, distribuição por disciplina e a data da última sincronização

**RF-034 — Detalhamento:**
- Nome, e-mail, data de cadastro, último acesso, quantos simulados estão no histórico e a carreira-alvo de cada conta; busca por nome ou e-mail e ordem por cadastro ou último acesso
- Só consulta: excluir a conta continua sendo do próprio estudante (RF-026)

---

## 5. Requisitos Não-Funcionais

| ID      | Requisito | Categoria |
|---------|-----------|-----------|
| RNF-001 | Geração de simulado em < 2 s (p95); figuras otimizadas para web e carregadas sob demanda | Performance |
| RNF-002 | Layout responsivo, mobile-first, utilizável a partir de 360 px de largura | Usabilidade |
| RNF-003 | Navegação completa por teclado, contraste WCAG AA (conferido a partir dos tokens; anel de foco próprio, visível sobre a ação azul-marinho — CR-008), texto alternativo nas figuras (padrão: "Figura da questão N, FUVEST ano"; nos simulados oficiais, "Simulado FUVEST ano · Nª edição" — CR-011) | Acessibilidade |
| RNF-004 | Endpoints públicos com validação de entrada e limite de requisições por IP. A única área administrativa na web é a de gestão (CR-013): restrita ao administrador, invisível para os demais (404) e sem edição de conteúdo; a ingestão continua só por CLI. Com conta (CR-005): sessão em cookie `HttpOnly`, sem token acessível ao JavaScript; proteção contra CSRF; cada estudante só acessa o próprio histórico. Desde o CR-006, a API de conteúdo exige sessão (RN-017); só os totais da base ficam públicos, para a apresentação (CR-007) | Segurança |
| RNF-005 | Usar o site exige entrar com a conta Google (CR-006). O servidor guarda só o mínimo (CR-005): identificador da conta Google, nome, e-mail, o histórico de simulados concluídos e a carreira-alvo (CR-010; nunca a modalidade de concorrência), apagáveis pelo próprio estudante. Quem não entra vê só a apresentação e a Privacidade, sem cookie. Sem cookies de rastreamento nem scripts de terceiros. Os números do site (logins, acessos, simulados concluídos, marcações de cada questão) são contados por dia sem identificar ninguém; o administrador vê a lista de contas, só para suporte, e a Privacidade o diz (CR-013) | Privacidade (LGPD) |
| RNF-006 | Questão publicada = questão validada (RN-006/RN-007); nada chega ao site sem passar pelas validações | Confiabilidade dos dados |
| RNF-007 | Interface em português do Brasil | Localização |
| RNF-008 | Suporte às 2 últimas versões de Chrome, Edge, Firefox e Safari (desktop e mobile) | Compatibilidade |
| RNF-009 | Hospedagem na Railway (app + PostgreSQL) com custo compatível com projeto gratuito | Operação |

---

## 6. User Stories

- **US-001:** Como estudante, quero fazer uma prova completa cronometrada no formato atual da 1ª fase (80 questões desde a FUVEST 2027 — CR-011), para treinar o ritmo real da prova
  - Critérios de aceite:
    - [ ] O simulado tem 80 questões sem repetição, de mais de um ano quando a base permitir
    - [ ] A distribuição por disciplina segue a RN-003
    - [ ] O cronômetro começa em 5 h e finaliza o simulado ao zerar

- **US-002:** Como estudante, quero montar um simulado só com as disciplinas e os anos que escolher, para focar nas minhas dificuldades
  - Critérios de aceite:
    - [ ] Posso escolher uma ou mais disciplinas, um intervalo de anos e de 1 a 90 questões
    - [ ] Todas as questões geradas respeitam os filtros
    - [ ] Se não houver questões suficientes, sou avisado e posso gerar com o total disponível

- **US-003:** Como estudante, quero refazer a prova original de um ano específico, para comparar com o que caiu de fato
  - Critérios de aceite:
    - [ ] Vejo a lista de anos disponíveis e, à parte, os simulados oficiais da FUVEST (CR-011)
    - [ ] As questões aparecem na ordem original, com as figuras e os textos-base, e a prova tem o total dela (90 ou 80)
    - [ ] Questões anuladas contam como acerto e aparecem sinalizadas no resultado

- **US-004:** Como estudante, quero treinar questão por questão vendo a resposta na hora, para estudar sem pressão de tempo
  - Critérios de aceite:
    - [ ] Ao escolher uma alternativa, vejo se acertei e qual é a correta
    - [ ] Posso filtrar por disciplina e anos, e o treino de uma disciplina só traz questões que são dela (pela disciplina principal — CR-016)
    - [ ] Vejo o placar da sessão

- **US-005:** Como estudante, quero que meu simulado não se perca se eu fechar a aba, para poder fazer uma prova de 5 h com tranquilidade
  - Critérios de aceite:
    - [ ] Recarregar ou reabrir o site oferece retomar o simulado com as respostas marcadas
    - [ ] O tempo restante considera o tempo já decorrido (RN-009)

- **US-006:** Como estudante, quero ver meu resultado por disciplina e revisar cada questão, para saber onde estudar mais
  - Critérios de aceite:
    - [ ] Vejo a nota geral e o desempenho de cada disciplina
    - [ ] Posso filtrar a revisão pelas questões que errei
    - [ ] Vejo minha resposta e a resposta oficial em cada questão

- **US-007:** Como estudante, quero ver os simulados que já fiz, para acompanhar minha evolução
  - Critérios de aceite:
    - [ ] O histórico lista data, modo e nota dos simulados concluídos neste navegador
    - [ ] O site avisa que o histórico é local

- **US-008:** Como estudante, quero reportar uma questão com erro, para que ela seja corrigida
  - Critérios de aceite:
    - [ ] Envio o reporte sem me identificar, escolhendo o tipo do problema
    - [ ] Recebo a confirmação de envio

- **US-009:** Como curador, quero transformar os PDFs de uma prova em um pacote de revisão com as pendências apontadas, para publicar um ano novo com pouco trabalho manual
  - Critérios de aceite:
    - [ ] Um comando baixa os PDFs e gera o pacote + relatório de validação
    - [ ] O relatório aponta cada questão com problema e o motivo
    - [ ] A importação recusa o pacote enquanto houver pendência bloqueante
    - [ ] Reimportar a mesma prova não duplica questões

- **US-010:** Como curador, quero ver os reportes dos estudantes, para corrigir as questões com erro
  - Critérios de aceite:
    - [ ] Listo os reportes pendentes com a questão e a descrição
    - [ ] Depois de corrigir e reimportar, marco o reporte como resolvido

- **US-011:** Como estudante, quero ver meu desempenho por assunto em cada disciplina, em cada simulado e somando os que já fiz, para saber exatamente o que estudar (CR-004)
  - Critérios de aceite:
    - [ ] No resultado, vejo os acertos por assunto de cada disciplina
    - [ ] O painel "Meu desempenho" soma os simulados concluídos neste navegador, por disciplina e por assunto, do pior para o melhor
    - [ ] Assuntos com poucas questões aparecem sinalizados
    - [ ] O painel avisa que os dados ficam só neste navegador

- **US-012:** Como curador, quero classificar cada questão num assunto de uma lista fixa, para que as estatísticas por assunto sejam comparáveis entre provas (CR-004)
  - Critérios de aceite:
    - [ ] A lista de assuntos de cada disciplina fica versionada no repositório e é validada no CI
    - [ ] A publicação recusa questão sem assunto ou com assunto de outra disciplina
    - [ ] Um comando lista a classificação de uma prova por disciplina e assunto, para revisão

- **US-013:** Como estudante, quero entrar com a minha conta Google, para ver meu histórico e meu desempenho no celular e no computador (CR-005)
  - Critérios de aceite:
    - [ ] Entro com o Google em poucos cliques, sem criar senha
    - [ ] Os simulados que eu já tinha feito neste navegador aparecem na minha conta
    - [ ] Em outro dispositivo, depois de entrar, vejo o mesmo histórico e o mesmo painel
    - [ ] Ao sair, o histórico deixa este navegador e volta quando eu entrar de novo

- **US-014:** Como estudante, quero saber o que o site guarda sobre mim e poder apagar tudo, para confiar em criar a conta (CR-005)
  - Critérios de aceite:
    - [ ] Uma página explica os dados guardados, para quê e por quanto tempo
    - [ ] Excluo a conta com uma confirmação, e tudo é apagado do servidor na hora

- **US-015:** Como dono do produto, quero que o uso do site exija login com Google, para que todo uso aconteça com conta (CR-006)
  - Critérios de aceite:
    - [ ] Sem login, vejo só a apresentação do site e a Privacidade
    - [ ] Um link direto (ex.: um resultado) leva ao login e, depois de entrar, abre a página pedida
    - [ ] A API recusa catálogo, geração, questões, correção e reportes sem sessão

- **US-016:** Como estudante que ainda não entrou, quero ver o tamanho da base e como é o simulado, para decidir se vale entrar com o Google (CR-007)
  - Critérios de aceite:
    - [ ] A apresentação mostra quantas questões, provas e anos a base tem, com os números atuais
    - [ ] Vejo uma prévia da tela de resolução e os 4 modos antes de entrar
    - [ ] Sem login, a API mostra só esses totais, nada das questões

- **US-017:** Como estudante com conta, quero ver no início como fui no último simulado e o que estudar, para continuar de onde parei (CR-008)
  - Critérios de aceite:
    - [ ] O início me cumprimenta pelo primeiro nome
    - [ ] Vejo os acertos e o aproveitamento do último simulado e as duas disciplinas em que fui pior
    - [ ] Chego ao resultado completo e ao painel "Meu desempenho" a partir dali

- **US-018:** Como estudante, quero consultar as notas de corte da 1ª fase por carreira, para saber quanto preciso fazer (CR-010)
  - Critérios de aceite:
    - [ ] Vejo, por ano, o corte de cada carreira na ampla concorrência, na escola pública e na escola pública PPI
    - [ ] Encontro a carreira pelo nome, sem me preocupar com acentos
    - [ ] A página explica o que é o corte e que ele não prevê a aprovação

- **US-019:** Como estudante, quero escolher uma carreira-alvo e ver no resultado quanto falta para o corte dela, para saber se estou no caminho (CR-010)
  - Critérios de aceite:
    - [ ] Escolho a carreira-alvo na lista mais recente e ela aparece em qualquer dispositivo
    - [ ] No resultado da Prova completa e da Prova de um ano, vejo os três cortes e quanto falta para cada um
    - [ ] O site não pergunta nem guarda a minha modalidade de concorrência

- **US-020:** Como curador, quero transformar o PDF de notas de corte de um ano em dados revisados, para publicar os cortes do ano novo com pouco trabalho (CR-010)
  - Critérios de aceite:
    - [ ] Um comando baixa o PDF e gera o rascunho com os nomes a revisar apontados
    - [ ] A publicação recusa arquivo com pendência, nome repetido ou corte fora da faixa

- **US-021:** Como estudante, quero fazer os simulados oficiais da FUVEST no formato de 80 questões e encontrar as questões deles no meu treino, para me preparar para a prova de 2027 (CR-011)
  - Critérios de aceite:
    - [ ] Faço cada simulado oficial inteiro, com 80 questões e 5 horas, numa seção própria da Prova de um ano
    - [ ] As questões dos simulados também aparecem na Prova completa, no Personalizado, no Treino e no "Meu desempenho", com a origem visível em cada questão
    - [ ] A comparação com a nota de corte converte a minha nota para a escala da lista e avisa que é uma estimativa

- **US-022:** Como administrador, quero acompanhar quantos estudantes usam o site e quantos simulados terminam, para saber se o site está cumprindo o papel (CR-013)
  - Critérios de aceite:
    - [ ] Vejo estudantes, logins, usuários ativos e simulados gerados e concluídos num período que eu escolho
    - [ ] Vejo a taxa de conclusão de cada modo
    - [ ] Nenhum desses números identifica um estudante

- **US-023:** Como administrador, quero resolver os reportes e encontrar questões com sinal de gabarito errado pela web, para corrigir a base sem consultar o banco (CR-013)
  - Critérios de aceite:
    - [ ] Vejo os reportes pendentes com a questão e os marco como resolvidos
    - [ ] Vejo as questões com acerto muito baixo ou com uma alternativa errada mais marcada que a correta, com a distribuição das marcações

- **US-024:** Como administrador, quero consultar a lista de contas, para atender um pedido de suporte ou de exclusão (CR-013)
  - Critérios de aceite:
    - [ ] Encontro a conta pelo nome ou pelo e-mail e vejo cadastro, último acesso e quantos simulados ela tem
    - [ ] Só eu vejo essa lista; para qualquer outra pessoa a página não existe

- **US-025:** Como estudante que faz vários simulados, quero que o site comece pelas questões que eu ainda não fiz, para não gastar o treino com questões repetidas (CR-015)
  - Critérios de aceite:
    - [ ] Na Prova completa, no Personalizado e no Treino, nenhuma questão do meu histórico aparece enquanto houver inéditas que atendam ao simulado
    - [ ] Quando as inéditas acabam, voltam primeiro as que fiz há mais tempo
    - [ ] Com conta, vale o que fiz em qualquer aparelho
    - [ ] O início avisa que as questões que ainda não fiz vêm primeiro

---

## 7. Regras de Negócio

| ID     | Regra | Módulo Relacionado |
|--------|-------|--------------------|
| RN-001 | Cada prova da base é a 1ª fase de um ano ou um simulado oficial da FUVEST (CR-011), identificada por um código: o ano (`2025`) ou `AAAAsN` (`2027s1`). Ingere-se **uma** versão por prova (V1 quando houver V1–V4; S1 nos simulados; a única nos anos com uma versão) junto com a coluna correspondente do gabarito. As demais versões trazem as mesmas questões em outra ordem e não são ingeridas | Ingestão |
| RN-002 | Questão anulada fica fora do sorteio (Prova completa, Personalizado, Treino). Na Prova de um ano ela aparece e conta como acerto para todos, como na regra oficial | Geração / Resultado |
| RN-003 | Distribuição da Prova completa: número de questões por disciplina principal pela média, entre as provas publicadas (vestibulares e simulados oficiais), da proporção de cada disciplina, arredondado para somar 80 (CR-011) | Geração |
| RN-004 | Uma questão não se repete dentro do mesmo simulado | Geração |
| RN-005 | Questões que compartilham texto-base e são sorteadas no mesmo simulado aparecem em sequência; o texto-base é exibido em cada uma delas | Geração / Resolução |
| RN-006 | Uma prova só aparece no site depois de passar em todas as validações automáticas e ser marcada como publicada pelo curador | Ingestão |
| RN-007 | Uma questão só entra na base com: enunciado, 5 alternativas A–E não vazias, resposta do gabarito (ou "anulada"), disciplina principal, assunto (RN-014) e fonte (código da prova, versão, número original) | Ingestão |
| RN-008 | Cada questão vale 1 ponto; em branco conta como erro; nota = acertos / total de questões do simulado | Resultado |
| RN-009 | Tempo: Prova completa e Prova de um ano têm 5 h, sem pausa, contadas pelo relógio a partir do início (fechar a aba não pausa). Personalizado: tempo proporcional (300 min ÷ 80 = 3 min 45 s por questão, o ritmo da FUVEST 2027 — CR-011), com pausa permitida, ou sem cronômetro. Treino não tem cronômetro | Resolução |
| RN-010 | Quando o tempo acaba, o simulado é finalizado automaticamente com as respostas marcadas até então | Resolução |
| RN-011 | Só há um simulado em andamento por navegador; iniciar outro pede confirmação para descartar o atual | Resolução |
| RN-012 | O simulado em andamento fica só no navegador. O histórico fica na conta e no navegador, como espelho dela (RN-016, CR-005) | Resolução / Histórico |
| RN-013 | Toda questão exibida mostra a fonte ("FUVEST ano" ou "Simulado FUVEST ano · Nª edição", nº original — CR-011) e o site oferece o link do PDF oficial daquela prova | Resolução / Catálogo |
| RN-014 | Cada disciplina tem uma lista fixa de assuntos (taxonomia versionada). Cada questão tem **exatamente um** assunto, da lista da sua disciplina principal; disciplinas secundárias não têm assunto. O assunto não aparece durante a resolução nem filtra a geração (CR-004) | Ingestão / Resultado / Desempenho |
| RN-015 | O painel "Meu desempenho" agrega as questões dos simulados concluídos no histórico: anuladas ficam fora (não medem conhecimento), em branco conta como erro (RN-008). Usa o assunto gravado no resultado de cada simulado. Assunto com menos de 5 questões aparece como "poucas questões" e vai para o fim da lista da disciplina; questão de resultado antigo, sem assunto, entra só na disciplina (CR-004) | Desempenho |
| RN-016 | Conta (CR-005): login só com Google, obrigatório desde o CR-006 (RN-017). A conta guarda os 50 simulados concluídos mais recentes; o navegador com conta mostra o histórico da conta. Ao entrar, os simulados feitos sem conta neste navegador vão para a conta; ao sair, o histórico deixa o navegador e continua na conta; com conta, limpar o histórico limpa na conta. O resultado de um simulado não muda depois de enviado. A sessão dura 90 dias | Conta / Histórico |
| RN-017 | Acesso (CR-006): usar o site exige sessão. Sem sessão, abrem só a apresentação (início) e a Privacidade; qualquer outra página leva à apresentação, e o login volta para ela. A API de conteúdo (catálogo, geração, questões, correção e reportes) recusa pedidos sem sessão; health, figuras e a vitrine (só os totais da base, CR-007) são públicos. Em produção sem login configurado, o site fica indisponível; fora de produção, aberto | Conta / Acesso |
| RN-018 | Comparação com o corte (CR-010): só na Prova completa e na Prova de um ano, de qualquer tamanho (CR-011); a nota é o número de acertos (na Prova de um ano, a anulada conta como acerto, RN-002). Quando o simulado e a lista de corte têm tamanhos diferentes (80 × 90), a nota é convertida para a escala da lista (acertos ÷ total × pontos da prova da lista), com 1 casa decimal, e mostrada como estimativa (CR-011). Compara sempre com o corte do ano da carreira-alvo, nas três modalidades, e a nota atinge o corte quando é igual ou maior. A modalidade não é perguntada nem guardada. O texto fala em referência para ir à 2ª fase, nunca em aprovação | Notas de Corte |
| RN-019 | Carreira-alvo (CR-010): uma por conta, escolhida entre as carreiras do ano mais recente. Quando sai a lista de um ano novo, os códigos e nomes das carreiras mudam e nada é migrado: a carreira-alvo continua comparando com o corte do ano dela até o estudante escolher de novo. Sai com a exclusão da conta | Notas de Corte |
| RN-020 | Administrador (CR-013): a conta Google cujo identificador está na configuração do servidor (`ADMIN_GOOGLE_SUBS`), nunca reconhecida pelo e-mail. Sem a configuração, ninguém é administrador. Para quem não é administrador, inclusive sem login, a área e a API dela respondem "não encontrada" | Gestão |
| RN-021 | Contagens anônimas (CR-013): por dia de Brasília, sem guardar quem: logins; usuários ativos (a conta conta uma vez no dia, no primeiro acesso); contas excluídas; simulados concluídos por modo, com acertos, questões, tempo (limitado a 24 h) e "finalizado por tempo", contados quando chegam à conta (o reenvio não conta de novo); a prova de cada Prova de um ano; e quantas vezes cada alternativa de cada questão foi marcada ou deixada em branco. Desde o CR-013, o contador de simulados gerados também usa o dia de Brasília (antes, o dia UTC). O acerto de uma questão é calculado com o gabarito atual | Gestão |
| RN-022 | Questão suspeita (CR-013): não anulada, com pelo menos 20 respostas, e acerto abaixo de 15% ou uma alternativa errada mais marcada que a correta. É sinal para o curador conferir, não correção automática | Gestão |
| RN-023 | Inéditas primeiro (CR-015): na Prova completa, no Personalizado e no Treino, o sorteio começa pelas questões que o estudante ainda não fez, ou seja, as que não estão em nenhum simulado concluído do histórico (Prova completa, Personalizado ou Prova de um ano, inclusive as deixadas em branco; o Treino não conta). Se as inéditas não bastam (numa disciplina da Prova completa, ou nos filtros), completa com as vistas há mais tempo. A prioridade não muda a distribuição da RN-003 nem o que pode ser sorteado, e não se desliga. A memória é a do histórico (os 50 simulados mais recentes, RN-016) | Geração |

---

## 8. Fora de Escopo

- 2ª fase (questões dissertativas) — ver Roadmap
- ~~Contas de usuário, login, histórico no servidor e sincronização entre dispositivos~~ — implementados no CR-005 (RF-024 a RF-026)
- Login com e-mail e senha ou com outros provedores além do Google (decisão de 30/09/2026)
- Sincronizar o simulado em andamento ou o Treino entre dispositivos (decisão de 30/09/2026)
- Apagar um simulado específico do histórico (só "Limpar histórico" inteiro)
- Extração de questões com IA (decisão do MVP: parser determinístico + revisão manual)
- ~~Área administrativa web~~ — a área de gestão (indicadores, reportes e lista de contas) foi implementada no CR-013 (RF-030 a RF-034). Continuam fora: curadoria das provas pela web (só por linha de comando), ações sobre as contas, exportar os indicadores, retenção por coorte e qualquer registro da atividade de cada estudante (decisões de 06/10/2026)
- Resoluções ou comentários das questões (a FUVEST não publica resolução da 1ª fase)
- ~~Nota de corte~~ — referência por carreira implementada no CR-010 (RF-027 a RF-029). Continuam fora: simulação de aprovação, classificação por carreira, notas mínimas de aprovação por chamada (dependem da 2ª fase), equivalência de carreiras entre anos e guardar a modalidade de concorrência (decisões de 02/10/2026)
- ~~Classificação por assunto dentro da disciplina (ex.: "Genética" em Biologia)~~ — implementada no CR-004 (RF-005, RF-022, RF-023)
- Filtro por assunto ao gerar Personalizado ou Treino (decisão do CR-004)
- Outros vestibulares (Unicamp, ENEM etc.)
- Ranking ou comparação entre estudantes
- App mobile nativo
- Monetização (anúncios, planos pagos)

---

## 9. Dependências e Premissas

### Dependências
- **Simulados oficiais da FUVEST** (`fuvest.br/simulado-fuvest-2027-provas-gabarito`): PDFs da prova (versões S1–S4) e do gabarito de cada edição (CR-011). O simulado oficial do ciclo anterior (FUVEST 2026, aplicado em 19/10/2025, 90 questões) está no acervo de 2026 (CR-012)
- **Acervo oficial da FUVEST** (`fuvest.br/acervo-vestibular-AAAA/`): PDFs da prova da 1ª fase e do gabarito, de 1977 a 2026; desde o CR-010, também o PDF "Notas de Corte" de cada ano e, para os nomes das carreiras, o Guia de Carreiras ou o Manual do Candidato
- **Railway:** hospedagem da aplicação e do PostgreSQL
- **Bibliotecas Python de leitura de PDF:** extração de texto, imagens e renderização de páginas (escolha na Arquitetura)
- **Google (OAuth 2.0 / OpenID Connect):** login obrigatório (CR-005, CR-006). Exige um cliente OAuth no Google Cloud com o app publicado; sem ele, o site fica indisponível em produção

### Premissas
- As provas e os gabaritos do acervo são públicos. O site é gratuito e educacional, cita a fonte em cada questão (RN-013), linka os PDFs oficiais e avisa que não é afiliado à FUVEST/USP
- As versões V1–V4 de um mesmo ano têm as mesmas questões em ordem diferente (RN-001) — verificar no primeiro ano ingerido. Nos simulados oficiais, as versões S1–S4 também: o gabarito traz a tabela de correspondência (conferido no CR-011)
- O layout dos PDFs muda entre anos. O parser é construído por família de layout, começando pelos anos mais recentes, e a revisão manual faz parte do processo: nem toda questão sai do parser pronta
- A classificação por disciplina é manual (o gabarito oficial não a informa)
- Há um único curador, que é o dono do produto

### Riscos
- **Direitos autorais:** o conteúdo das provas pertence à FUVEST. A premissa acima (uso gratuito, com atribuição) deve ser revista antes de divulgar o site amplamente
- **Esforço de ingestão:** sem IA, anos com layout muito diferente (provas antigas, escaneadas ou com fórmulas complexas) podem custar mais de 3 h de curadoria. A meta de ≥ 5 provas no lançamento prioriza os anos recentes
- **Figuras vetoriais e fórmulas** (Matemática, Física, Química) podem não sair como texto; nesse caso a região é recortada como imagem
- **Dados pessoais (CR-005):** com as contas, o banco passa a guardar nome, e-mail e resultados de estudantes, em geral menores de idade. Mitigação: só o mínimo (RNF-005), exclusão pelo próprio estudante, página de privacidade e backup do banco. Desde o CR-006, todo estudante entrega esses dados para usar o site (LGPD art. 14: "melhor interesse" do adolescente)
- **Alcance (CR-006):** exigir conta Google afasta quem não quer ou não pode entrar; a apresentação explica o site antes do login e, desde o CR-007, mostra a base e uma prévia do simulado

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| 1ª fase | Prova de Conhecimentos Gerais da FUVEST: 90 questões objetivas até 2026 e 80 desde a FUVEST 2027, até 5 h |
| Simulado oficial | Prova aplicada pela própria FUVEST para treinar o formato da 1ª fase (em 2026, duas edições no formato de 80 questões), publicada com o gabarito. Entra na base como prova própria (CR-011) |
| Código da prova | Identificador de uma prova na base: o ano no vestibular (`2025`) e `AAAAsN` no simulado oficial (`2027s1`, 1ª edição); prefixo dos ids das questões (CR-011) |
| Acervo | Página oficial da FUVEST com provas e gabaritos de anos anteriores |
| Versão da prova (V1–V4) | Variações da mesma prova com as questões em ordem diferente, cada uma com sua coluna no gabarito (S1–S4 nos simulados oficiais) |
| Gabarito | Tabela oficial com a alternativa correta de cada questão, por versão |
| Questão anulada | Questão cancelada pela FUVEST; o ponto é atribuído a todos |
| Texto-base | Texto ou figura compartilhado por duas ou mais questões ("Texto para as questões 10 e 11") |
| Disciplina principal | A disciplina oficial em que a questão é contada nas estatísticas, na distribuição (RN-003) e no filtro do Treino (RF-012, CR-016) |
| Família de layout | Conjunto de anos com a mesma diagramação de PDF, tratados pela mesma lógica do parser |
| Pacote de revisão | Saída do parser por prova (arquivo editável + figuras + relatório) que o curador revisa antes de importar |
| Curador | Quem roda a ingestão, revisa, classifica e publica as provas |
| Simulado | Conjunto de questões gerado para o estudante resolver em um dos 4 modos |
| Assunto | Parte de uma disciplina usada nas estatísticas (ex.: "Eletricidade" em Física); cada questão tem exatamente um (RN-014) |
| Taxonomia de assuntos | Lista fixa de assuntos por disciplina, condensada do programa oficial da FUVEST e versionada com as provas (RF-023) |
| Painel de desempenho | Página "Meu desempenho", que soma os simulados concluídos por disciplina e por assunto (RF-022) |
| Conta | Identidade opcional do estudante, criada ao entrar com o Google, que guarda o histórico no servidor (RF-024, RN-016) |
| Sincronização | Envio dos simulados concluídos do navegador para a conta e cópia do histórico da conta para o navegador (RF-025) |
| Página de apresentação | Início para quem não entrou: descreve o site e os modos, mostra os números da base e uma prévia do simulado, e leva ao login (RN-017, CR-007) |
| Vitrine | Totais públicos da base (questões válidas e anos publicados) que a apresentação mostra sem login (CR-007) |
| Nota de corte | Menor nota (de 0 a 90 até 2026; de 0 a 80 desde 2027) entre os candidatos chamados para a 2ª fase, por carreira e modalidade, publicada pela FUVEST a cada ano (CR-010) |
| Modalidade | Forma de concorrência na FUVEST: ampla concorrência (AC), escola pública (EP) ou escola pública PPI — pretos, pardos e indígenas |
| Carreira | Agrupamento de cursos da USP com uma única nota de corte por modalidade; o código e o nome mudam entre anos (em 2025, Medicina juntou os três campi) |
| Carreira-alvo | Carreira escolhida pelo estudante, entre as do ano mais recente, para comparar a nota dos simulados com o corte (RN-019) |
| Área de gestão | Página só do administrador com os números do site: uso, aprendizado, qualidade da base e lista de contas (CR-013) |
| Administrador | A conta Google do dono do produto, definida na configuração do servidor, que vê a área de gestão (RN-020) |
| Usuário ativo | Conta que usou o site num dia (de Brasília), contada uma vez por dia sem guardar quem (RN-021) |
| Questão suspeita | Questão com acerto muito baixo ou uma alternativa errada mais marcada que a correta, que o curador deve conferir (RN-022) |
| Questão inédita | Para um estudante, questão que não aparece em nenhum simulado concluído do histórico dele; o sorteio começa por elas (RN-023, CR-015) |
| Papel & Caneta | Identidade visual do site (CR-008): papel creme, tinta azul-marinho, a bolinha rosa da folha óptica e títulos em Fraunces; a marca é uma bolinha preenchida |

---

## Apêndice: Roadmap Futuro

> Desde 07/10/2026, as próximas funcionalidades, priorizadas, ficam em [`docs/ROADMAP.md`](ROADMAP.md); este apêndice guarda as fases já planejadas no PRD.

### Fase 2 — 2ª fase
- Questões dissertativas da 2ª fase por dia de prova
- Autoavaliação comparando com o "Guia de respostas esperadas" da FUVEST

### Fase 3 — Contas e estatísticas
Dividida em duas partes independentes; os assuntos vieram primeiro porque não coletam dado pessoal.

**Fase 3A — Assuntos e desempenho (CR-004, concluída em 2026-10-01)**
- Classificação por assunto dentro da disciplina (RF-005, RF-023) e estatísticas por assunto no resultado e no painel "Meu desempenho" (RF-018, RF-022)

**Fase 3B — Contas (CR-005, concluída em 2026-10-01)**
- Login opcional com histórico no servidor e sincronização entre dispositivos (RF-024 a RF-026, RN-016)
- CR-006 (01/10/2026): o login passa a ser obrigatório para usar o site (RN-017)
- Decisões de 30/09/2026: login **só com Google** (sem senha nem e-mail de recuperação); o servidor guarda **só o histórico concluído** (o simulado em andamento continua no navegador). O painel da Fase 3A passa a somar o histórico sincronizado
- Decisões de 01/10/2026: ao entrar, os simulados deste navegador vão para a conta; ao sair, o histórico deixa o navegador; a conta guarda nome e e-mail; limite de 50 simulados

### Fase 4 — Escala da base
- Extração assistida por IA para acelerar a ingestão de anos antigos
- ~~Área administrativa web para curadoria e reportes~~ — CR-013 (06/10/2026): área de gestão com indicadores de uso, aprendizado e qualidade, resolução dos reportes e lista de contas. Decisões de 06/10/2026: só contagens anônimas (sem registro por estudante), administrador pelo identificador da conta Google; a curadoria das provas continua pela CLI
- ~~Referência de notas de corte por carreira~~ — CR-010 (02/10/2026): notas de corte de 2020 e 2022–2025, página de consulta e carreira-alvo na conta. Decisões de 02/10/2026: carreira-alvo só da lista mais recente, sem equivalência entre anos; sempre as três modalidades, sem guardar a do estudante

---

*Documento criado em 2026-09-29. v1.1 (2026-09-30, CR-001): detalhamento de RF-014, RF-015 e RF-016 (folha, barra de navegação, pausa, finalizar e modo foco). v1.2 (2026-09-30, CR-003): detalhamento de RF-008, RF-013 e RF-019 (banner do início, figura ampliada, revisão e folha corrigida). v2.0 (2026-09-30, CR-004): Fase 3A — assunto por questão (RF-005, RF-023, RN-007, RN-014), desempenho por assunto no resultado (RF-018) e painel "Meu desempenho" (RF-022, RN-015), US-011 e US-012, métrica de classificação, fora de escopo, glossário e roadmap dividido em 3A/3B. v3.0 (2026-10-01, CR-005): Fase 3B — módulo Conta (RF-024 a RF-026, RN-016), histórico com conta (RF-020, RF-022, RN-012), US-013 e US-014, RNF-004 e RNF-005 com conta, dependência do Google, risco de dados pessoais, fora de escopo, glossário e roadmap. v4.0 (2026-10-01, CR-006): login obrigatório — visão geral, persona, RF-008 (apresentação), RF-024, RN-012, RN-016, RN-017, RNF-004, RNF-005, US-015, dependência, riscos, glossário e roadmap. v4.1 (2026-10-01, CR-007): apresentação com os números da base e a prévia do simulado — RF-008, RN-017 e RNF-004 (vitrine pública), US-016, riscos e glossário. v4.2 (2026-10-01, CR-008): identidade "Papel & Caneta" — RF-008 (saudação, último simulado e Prova completa em destaque), US-017, RNF-003 e glossário. v5.0 (2026-10-02, CR-010): Fase 4, notas de corte — visão geral, persona, módulo Notas de Corte (RF-027 a RF-029), RNF-005 (carreira-alvo), US-018 a US-020, RN-018 e RN-019, fora de escopo, dependências, glossário e roadmap. v6.0 (2026-10-03, CR-011): formato de 80 questões da FUVEST 2027 e simulados oficiais da FUVEST — visão geral, RF-001, RF-002, RF-004, RF-009, RF-011, RF-028, RF-029, US-001, US-003, US-021, RN-001, RN-003, RN-007, RN-009, RN-013, RN-018, dependências, premissas e glossário (1ª fase, simulado oficial, código da prova, versão, nota de corte). v6.1 (2026-10-05, CR-012): dependências — o simulado oficial da FUVEST 2026 no acervo de 2026. v7.0 (2026-10-06, CR-013): área de gestão — visão geral, métricas, persona do curador, módulo Gestão (RF-030 a RF-034), RF-007, RNF-004, RNF-005, US-022 a US-024, RN-020 a RN-022, fora de escopo, glossário e roadmap. v7.1 (2026-10-07, CR-015): inéditas primeiro no sorteio — RF-009, RF-010, RF-012, US-025, RN-023, glossário e o apêndice aponta para `docs/ROADMAP.md`. v7.2 (2026-10-09, CR-016): o Treino filtra pela disciplina principal — RF-010, RF-012, US-004 e glossário.*
