# PRD — Simulado Fuvest

**Versão:** 1.0
**Data:** 2026-09-29
**Status:** Aprovado
**Fase:** MVP — Simulados da 1ª fase
**CR Ref:** —

---

## 1. Visão Geral do Produto

O **Simulado Fuvest** é um site público e gratuito que gera simulados da **1ª fase da FUVEST** (Prova de Conhecimentos Gerais) usando questões reais de provas de anos anteriores, publicadas no acervo oficial em [fuvest.br](https://www.fuvest.br/acervo/).

**Problema:** as provas antigas existem só como PDFs soltos, um por ano. Para treinar, o estudante imprime ou lê o PDF, confere as respostas à mão no gabarito e não tem nenhuma visão do próprio desempenho por disciplina. Também não dá para montar uma prova misturando anos, nem treinar só uma matéria.

**Solução:** uma base de questões estruturada (enunciado, alternativas, figuras, gabarito, disciplina, ano), alimentada por um processo de ingestão dos PDFs oficiais, sobre a qual o site gera quatro tipos de simulado. O próprio site corrige e mostra o desempenho. Não é preciso criar conta.

**Público-alvo:** estudantes que vão prestar a FUVEST (3º ano do ensino médio, cursinho, treineiros).

**A 1ª fase da FUVEST** (Guia de Provas 2025): 90 questões de múltipla escolha com 5 alternativas (A–E) e uma correta, até 5 horas de prova, cada questão vale 1 ponto. Disciplinas: Biologia, Física, Geografia, História, Inglês, Matemática, Português e Química, com algumas questões interdisciplinares. Questão anulada tem o ponto atribuído a todos os candidatos.

---

## 2. Objetivos e Métricas de Sucesso

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Base de questões útil no lançamento | Provas (anos) publicadas na base | ≥ 5 provas (450 questões) no lançamento; +1 prova por ano (a cada novo vestibular) |
| Questões corretas e confiáveis | % de questões publicadas que passam em todas as validações automáticas (RN-007) | 100% |
| Questões corretas e confiáveis | Questões com reporte de erro confirmado / questões publicadas | < 2% |
| Ingestão sustentável sem IA | Tempo de curadoria manual (revisão + classificação) por prova | ≤ 3 h por prova |
| Uso do produto | Simulados gerados por semana (contagem anônima no servidor) | Linha de base medida no 1º mês após o lançamento |
| Experiência fluida | Tempo de geração de um simulado (p95) | < 2 s |

---

## 3. Personas

### Persona 1: Estudante vestibulando
- **Perfil:** 16–19 anos, 3º ano do ensino médio ou cursinho, vai prestar a FUVEST. Estuda no celular e no computador. Usa o site sem cadastro.
- **Necessidades:** treinar com questões reais no formato da prova; fazer provas completas cronometradas para ganhar ritmo; focar nas disciplinas em que vai pior; saber na hora o que errou.
- **Frustrações:** PDFs dispersos por ano; correção manual pelo gabarito; nenhuma estatística por disciplina; não conseguir montar uma lista só de Física ou só de anos recentes.

### Persona 2: Curador da base (dono do produto)
- **Perfil:** mantém o site. Roda os scripts de ingestão localmente e revisa as questões antes de publicar.
- **Necessidades:** transformar o PDF de uma prova nova em questões publicadas com o mínimo de trabalho manual; saber exatamente o que o parser não conseguiu extrair; corrigir erros reportados pelos estudantes.
- **Frustrações:** layout e codificação dos PDFs mudam de ano para ano (ex.: 2015 com artefatos de fonte, 2025 em quatro versões e duas colunas); figuras que fazem parte do enunciado; classificar 90 questões por disciplina à mão.

---

## 4. Requisitos Funcionais

### Módulo: Ingestão de Provas (curador, via linha de comando)

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-001 | Registrar uma prova do acervo (ano + URLs oficiais do PDF da prova e do gabarito) e baixar os PDFs | Alta | Curador |
| RF-002 | Extrair o gabarito oficial (90 respostas A–E ou "anulada") da versão escolhida | Alta | Curador |
| RF-003 | Extrair as questões do PDF da prova: número, enunciado, texto-base compartilhado, alternativas A–E e figuras | Alta | Curador |
| RF-004 | Gerar um pacote de revisão editável por prova, com relatório de validação e pendências | Alta | Curador |
| RF-005 | Classificar cada questão por disciplina durante a revisão | Alta | Curador |
| RF-006 | Importar o pacote revisado no banco de forma idempotente e publicar a prova | Alta | Curador |
| RF-007 | Consultar os reportes de erro enviados pelos estudantes e corrigir a questão | Média | Curador |

**RF-001 — Detalhamento:**
- Campos obrigatórios: ano do vestibular, URL do PDF da prova, URL do PDF do gabarito
- Campos opcionais: versão da prova (V1 por padrão quando houver várias; "única" em anos com uma só versão)
- Regras específicas: os PDFs baixados ficam guardados localmente como cópia de referência. O padrão das URLs muda por ano (ex.: `fuvest2025_primeira_fase_prova_V1.pdf` × `fuvest_2015_1fase_prova_V.pdf`), então elas são informadas, não deduzidas

**RF-002 — Detalhamento:**
- Lê a tabela do gabarito e extrai a coluna da versão registrada (RN-001)
- Reconhece questões anuladas
- Falha com mensagem clara se não encontrar exatamente 90 respostas

**RF-003 — Detalhamento:**
- Parser determinístico (sem IA), organizado por **família de layout**: anos com a mesma diagramação compartilham a mesma lógica de extração
- Trata diagramação em duas colunas e artefatos de codificação de fonte
- Figuras: extrai as imagens embutidas no PDF e, quando a figura é vetorial (gráficos, diagramas), recorta a região da página renderizada
- Textos-base compartilhados ("Texto para as questões 10 e 11") são extraídos uma vez e vinculados às questões correspondentes
- O que o parser não conseguir extrair com segurança vira pendência no relatório (RF-004); nada é descartado em silêncio

**RF-004 — Detalhamento:**
- Saída por prova: arquivo estruturado legível e editável à mão + pasta com as figuras
- Validações automáticas: 90 questões; 5 alternativas não vazias por questão; resposta do gabarito presente para cada questão; toda figura referenciada existe; toda questão tem disciplina principal
- Relatório lista as pendências por questão (ex.: "Q37: alternativa D vazia", "Q52: figura não localizada")

**RF-005 — Detalhamento:**
- Campos obrigatórios: disciplina principal (uma das 8 disciplinas oficiais)
- Campos opcionais: disciplinas secundárias (para questões interdisciplinares)
- Regras específicas: feita pelo curador no pacote de revisão; a importação recusa questão sem disciplina principal

**RF-006 — Detalhamento:**
- Reimportar a mesma prova atualiza as questões existentes, sem duplicar
- A prova só fica visível no site quando o pacote passa em todas as validações e o curador a marca como publicada (RN-006)
- Figuras são publicadas junto com as questões

**RF-007 — Detalhamento:**
- Lista os reportes pendentes (questão, tipo, texto, data)
- Após a correção no pacote e a reimportação, o reporte é marcado como resolvido

### Módulo: Início e Catálogo

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-008 | Tela inicial com os modos de simulado e o catálogo da base (anos disponíveis, questões por disciplina) | Alta | Estudante |

**RF-008 — Detalhamento:**
- Mostra os 4 modos (RF-009 a RF-012) com uma descrição curta de cada um
- Mostra os anos publicados e o total de questões por disciplina
- Se houver simulado em andamento no navegador, oferece retomar (RN-012)
- Rodapé com aviso de que o site não é afiliado à FUVEST/USP e com link para o acervo oficial

### Módulo: Geração de Simulados

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-009 | Prova completa: 90 questões sorteadas de várias provas, na distribuição por disciplina da prova real, com 5 h | Alta | Estudante |
| RF-010 | Personalizado: o estudante escolhe disciplinas, intervalo de anos e quantidade de questões | Alta | Estudante |
| RF-011 | Prova de um ano: a prova original de um ano, na ordem original, com 5 h | Alta | Estudante |
| RF-012 | Treino por questão: uma questão por vez com correção imediata, sem cronômetro | Alta | Estudante |

**RF-009 — Detalhamento:**
- Distribuição por disciplina conforme RN-003; sem repetição (RN-004); sem anuladas (RN-002)
- Cronômetro de 5 h, sem pausa (RN-009)

**RF-010 — Detalhamento:**
- Campos obrigatórios: pelo menos uma disciplina; quantidade de questões (1 a 90)
- Campos opcionais: intervalo de anos (padrão: todos); cronômetro ligado/desligado (padrão: ligado, com tempo proporcional — RN-009)
- Regras específicas: se não houver questões suficientes para os filtros, informa quantas existem e oferece gerar com esse total

**RF-011 — Detalhamento:**
- Lista os anos publicados; o estudante escolhe um
- Questões na ordem original da versão ingerida; anuladas aparecem e contam como acerto (RN-002)

**RF-012 — Detalhamento:**
- Filtros opcionais: disciplinas e intervalo de anos
- Ao responder, mostra na hora se acertou e qual é a alternativa correta; botão "próxima" sorteia outra questão
- Placar da sessão (acertos/respondidas), sem histórico permanente

### Módulo: Resolução do Simulado

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-013 | Tela de questão: texto-base, enunciado, figuras, alternativas, marcar/desmarcar resposta | Alta | Estudante |
| RF-014 | Navegação por grade de questões com estado (respondida, em branco, marcada para revisar) | Alta | Estudante |
| RF-015 | Cronômetro regressivo com finalização automática | Alta | Estudante |
| RF-016 | Salvar o simulado em andamento no navegador e finalizar com confirmação | Alta | Estudante |

**RF-013 — Detalhamento:**
- Figuras com ampliação (zoom) ao tocar/clicar
- Mostra a fonte da questão (FUVEST ano, nº original)
- Atalhos de teclado: A–E marcam a alternativa; setas navegam
- O gabarito nunca aparece durante o simulado (exceto no modo Treino)

**RF-014 — Detalhamento:**
- Grade com os números das questões, colorida pelo estado; clicar leva à questão
- Opção "marcar para revisar" por questão

**RF-015 — Detalhamento:**
- Mostra o tempo restante; pode ser ocultado na tela, mas continua contando
- Aviso quando faltarem 15 min; ao zerar, finaliza automaticamente (RN-010)

**RF-016 — Detalhamento:**
- Respostas, marcações e horário de início persistidos no navegador a cada alteração: recarregar a página ou fechar a aba não perde nada
- "Finalizar" pede confirmação e mostra quantas questões estão em branco

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

**RF-019 — Detalhamento:**
- Cada questão com a alternativa marcada, a correta e a sinalização de anulada, quando for o caso
- Filtros: todas, erradas, em branco, por disciplina

### Módulo: Histórico Local

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-020 | Histórico dos simulados concluídos, guardado só no navegador | Média | Estudante |

**RF-020 — Detalhamento:**
- Lista com data, modo, nota e percentual; abrir um item mostra o resultado (RF-017 a RF-019)
- Botão para limpar o histórico
- Aviso explícito de que o histórico fica só neste navegador e se perde ao trocar de dispositivo ou limpar os dados do navegador

### Módulo: Reporte de Erro

| ID     | Requisito | Prioridade | Persona |
|--------|-----------|------------|---------|
| RF-021 | Reportar problema em uma questão, de forma anônima | Média | Estudante |

**RF-021 — Detalhamento:**
- Campos obrigatórios: tipo (enunciado/alternativa com erro, figura faltando ou ilegível, gabarito incorreto, outro)
- Campos opcionais: descrição livre (até 500 caracteres)
- Regras específicas: disponível na tela de questão e na revisão do resultado; sem dados pessoais; limite de envios por origem (RNF-004)

---

## 5. Requisitos Não-Funcionais

| ID      | Requisito | Categoria |
|---------|-----------|-----------|
| RNF-001 | Geração de simulado em < 2 s (p95); figuras otimizadas para web e carregadas sob demanda | Performance |
| RNF-002 | Layout responsivo, mobile-first, utilizável a partir de 360 px de largura | Usabilidade |
| RNF-003 | Navegação completa por teclado, contraste WCAG AA, texto alternativo nas figuras (padrão: "Figura da questão N — FUVEST ano") | Acessibilidade |
| RNF-004 | Endpoint de reporte com validação de entrada e limite de requisições por IP; sem área administrativa exposta na web (ingestão só por CLI) | Segurança |
| RNF-005 | Nenhum dado pessoal coletado no MVP; sem cookies de rastreamento; estado do estudante só no navegador | Privacidade (LGPD) |
| RNF-006 | Questão publicada = questão validada (RN-006/RN-007); nada chega ao site sem passar pelas validações | Confiabilidade dos dados |
| RNF-007 | Interface em português do Brasil | Localização |
| RNF-008 | Suporte às 2 últimas versões de Chrome, Edge, Firefox e Safari (desktop e mobile) | Compatibilidade |
| RNF-009 | Hospedagem na Railway (app + PostgreSQL) com custo compatível com projeto gratuito | Operação |

---

## 6. User Stories

- **US-001:** Como estudante, quero fazer uma prova completa de 90 questões cronometrada, para treinar o ritmo real da 1ª fase
  - Critérios de aceite:
    - [ ] O simulado tem 90 questões sem repetição, de mais de um ano quando a base permitir
    - [ ] A distribuição por disciplina segue a RN-003
    - [ ] O cronômetro começa em 5 h e finaliza o simulado ao zerar

- **US-002:** Como estudante, quero montar um simulado só com as disciplinas e os anos que escolher, para focar nas minhas dificuldades
  - Critérios de aceite:
    - [ ] Posso escolher uma ou mais disciplinas, um intervalo de anos e de 1 a 90 questões
    - [ ] Todas as questões geradas respeitam os filtros
    - [ ] Se não houver questões suficientes, sou avisado e posso gerar com o total disponível

- **US-003:** Como estudante, quero refazer a prova original de um ano específico, para comparar com o que caiu de fato
  - Critérios de aceite:
    - [ ] Vejo a lista de anos disponíveis
    - [ ] As questões aparecem na ordem original, com as figuras e os textos-base
    - [ ] Questões anuladas contam como acerto e aparecem sinalizadas no resultado

- **US-004:** Como estudante, quero treinar questão por questão vendo a resposta na hora, para estudar sem pressão de tempo
  - Critérios de aceite:
    - [ ] Ao escolher uma alternativa, vejo se acertei e qual é a correta
    - [ ] Posso filtrar por disciplina e anos
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

---

## 7. Regras de Negócio

| ID     | Regra | Módulo Relacionado |
|--------|-------|--------------------|
| RN-001 | Cada prova da base é a 1ª fase de um ano. Ingere-se **uma** versão por ano (V1 quando houver V1–V4; a única nos anos com uma versão) junto com a coluna correspondente do gabarito. As demais versões trazem as mesmas questões em outra ordem e não são ingeridas | Ingestão |
| RN-002 | Questão anulada fica fora do sorteio (Prova completa, Personalizado, Treino). Na Prova de um ano ela aparece e conta como acerto para todos, como na regra oficial | Geração / Resultado |
| RN-003 | Distribuição da Prova completa: número de questões por disciplina principal proporcional à média das provas publicadas, arredondado para somar 90 | Geração |
| RN-004 | Uma questão não se repete dentro do mesmo simulado | Geração |
| RN-005 | Questões que compartilham texto-base e são sorteadas no mesmo simulado aparecem em sequência; o texto-base é exibido em cada uma delas | Geração / Resolução |
| RN-006 | Uma prova só aparece no site depois de passar em todas as validações automáticas e ser marcada como publicada pelo curador | Ingestão |
| RN-007 | Uma questão só entra na base com: enunciado, 5 alternativas A–E não vazias, resposta do gabarito (ou "anulada"), disciplina principal e fonte (ano, versão, número original) | Ingestão |
| RN-008 | Cada questão vale 1 ponto; em branco conta como erro; nota = acertos / total de questões do simulado | Resultado |
| RN-009 | Tempo: Prova completa e Prova de um ano têm 5 h, sem pausa, contadas pelo relógio a partir do início (fechar a aba não pausa). Personalizado: tempo proporcional (300 min ÷ 90 = 3 min 20 s por questão), com pausa permitida, ou sem cronômetro. Treino não tem cronômetro | Resolução |
| RN-010 | Quando o tempo acaba, o simulado é finalizado automaticamente com as respostas marcadas até então | Resolução |
| RN-011 | Só há um simulado em andamento por navegador; iniciar outro pede confirmação para descartar o atual | Resolução |
| RN-012 | O estado do estudante (simulado em andamento e histórico) fica só no navegador; o servidor não guarda respostas nem resultados | Resolução / Histórico |
| RN-013 | Toda questão exibida mostra a fonte (FUVEST ano, nº original) e o site oferece o link do PDF oficial daquele ano | Resolução / Catálogo |

---

## 8. Fora de Escopo

- 2ª fase (questões dissertativas) — ver Roadmap
- Contas de usuário, login, histórico no servidor e sincronização entre dispositivos
- Extração de questões com IA (decisão do MVP: parser determinístico + revisão manual)
- Área administrativa web (curadoria só por linha de comando)
- Resoluções ou comentários das questões (a FUVEST não publica resolução da 1ª fase)
- Nota de corte, simulação de aprovação ou classificação por carreira
- Classificação por assunto dentro da disciplina (ex.: "Genética" em Biologia)
- Outros vestibulares (Unicamp, ENEM etc.)
- Ranking ou comparação entre estudantes
- App mobile nativo
- Monetização (anúncios, planos pagos)

---

## 9. Dependências e Premissas

### Dependências
- **Acervo oficial da FUVEST** (`fuvest.br/acervo-vestibular-AAAA/`): PDFs da prova da 1ª fase e do gabarito, de 1977 a 2026
- **Railway:** hospedagem da aplicação e do PostgreSQL
- **Bibliotecas Python de leitura de PDF:** extração de texto, imagens e renderização de páginas (escolha na Arquitetura)

### Premissas
- As provas e os gabaritos do acervo são públicos. O site é gratuito e educacional, cita a fonte em cada questão (RN-013), linka os PDFs oficiais e avisa que não é afiliado à FUVEST/USP
- As versões V1–V4 de um mesmo ano têm as mesmas questões em ordem diferente (RN-001) — verificar no primeiro ano ingerido
- O layout dos PDFs muda entre anos. O parser é construído por família de layout, começando pelos anos mais recentes, e a revisão manual faz parte do processo: nem toda questão sai do parser pronta
- A classificação por disciplina é manual (o gabarito oficial não a informa)
- Há um único curador, que é o dono do produto

### Riscos
- **Direitos autorais:** o conteúdo das provas pertence à FUVEST. A premissa acima (uso gratuito, com atribuição) deve ser revista antes de divulgar o site amplamente
- **Esforço de ingestão:** sem IA, anos com layout muito diferente (provas antigas, escaneadas ou com fórmulas complexas) podem custar mais de 3 h de curadoria. A meta de ≥ 5 provas no lançamento prioriza os anos recentes
- **Figuras vetoriais e fórmulas** (Matemática, Física, Química) podem não sair como texto; nesse caso a região é recortada como imagem

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| 1ª fase | Prova de Conhecimentos Gerais da FUVEST: 90 questões objetivas, até 5 h |
| Acervo | Página oficial da FUVEST com provas e gabaritos de anos anteriores |
| Versão da prova (V1–V4) | Variações da mesma prova com as questões em ordem diferente, cada uma com sua coluna no gabarito |
| Gabarito | Tabela oficial com a alternativa correta de cada questão, por versão |
| Questão anulada | Questão cancelada pela FUVEST; o ponto é atribuído a todos |
| Texto-base | Texto ou figura compartilhado por duas ou mais questões ("Texto para as questões 10 e 11") |
| Disciplina principal | A disciplina oficial em que a questão é contada nas estatísticas e na distribuição (RN-003) |
| Família de layout | Conjunto de anos com a mesma diagramação de PDF, tratados pela mesma lógica do parser |
| Pacote de revisão | Saída do parser por prova (arquivo editável + figuras + relatório) que o curador revisa antes de importar |
| Curador | Quem roda a ingestão, revisa, classifica e publica as provas |
| Simulado | Conjunto de questões gerado para o estudante resolver em um dos 4 modos |

---

## Apêndice: Roadmap Futuro

### Fase 2 — 2ª fase
- Questões dissertativas da 2ª fase por dia de prova
- Autoavaliação comparando com o "Guia de respostas esperadas" da FUVEST

### Fase 3 — Contas e estatísticas
- Login opcional com histórico no servidor e sincronização entre dispositivos
- Classificação por assunto dentro da disciplina e estatísticas por assunto

### Fase 4 — Escala da base
- Extração assistida por IA para acelerar a ingestão de anos antigos
- Área administrativa web para curadoria e reportes
- Referência de notas de corte por carreira

---

*Documento criado em 2026-09-29.*
