# Especificação Técnica — Ingestão de Provas

**Versão:** 1.2
**Data:** 2026-10-02
**PRD Ref:** 01-PRD v2.0 (RF-001 a RF-006, RF-023, US-009, US-012, RN-001, RN-006, RN-007, RN-014)
**Arquitetura Ref:** 02-ARCHITECTURE v1.4 (ADR-002, ADR-003, ADR-006, ADR-008, ADR-009)
**CR Ref:** CR-004 (assunto por questão, V11, taxonomia e comando `assuntos` — detalhe em `specs/06-assuntos-desempenho.md`), CR-010 (notas de corte: comando `cortes` e `validar` com os cortes — detalhe em `specs/08-notas-de-corte.md`)

---

## 1. Resumo das Mudanças

CLI do curador (`python -m ingestao <comando>`, executada a partir de `backend/`) que transforma os PDFs oficiais de uma prova em um **pacote de revisão** versionado (`data/provas/AAAA/prova.yaml` + `figuras/`). Inclui também o módulo `app/pacote/`, usado tanto pela CLI quanto pela produção: schema do pacote, validação e sincronização repositório → banco.

### Escopo desta Iteração
- Schema do `prova.yaml` e leitura/escrita (`app/pacote/schema.py`, `leitura.py`)
- Validação com relatório de pendências (`app/pacote/validacao.py`)
- Sincronização idempotente com o banco (`app/pacote/sincronizar.py`)
- Comandos `baixar`, `extrair`, `preview`, `recortar`, `validar`, `importar`
- Primeira família de layout: **`familia_2025`** (prova + gabarito), com a extensão do registry aos anos vizinhos que ela conseguir extrair

---

## 2. Detalhamento Técnico

### 2.1 Arquivos

| Ação | Caminho | Descrição |
|------|---------|-----------|
| Criar | `backend/app/disciplinas.py` | Enum `Disciplina` (8 slugs) + rótulos em português |
| Criar | `backend/app/pacote/schema.py` | Modelos Pydantic do pacote |
| Criar | `backend/app/pacote/leitura.py` | `carregar_pacote(dir)`, `salvar_pacote(pacote, dir)`, `listar_pacotes(data_dir)` |
| Criar | `backend/app/pacote/validacao.py` | `validar_pacote(pacote, dir_figuras, taxonomia) -> list[Pendencia]` (a taxonomia entrou no CR-004) |
| Criar (CR-004) | `backend/app/pacote/assuntos.py` | Taxonomia de assuntos: schema, `carregar_taxonomia`, `taxonomia_em_uso` (`specs/06` §2.2) |
| Criar | `backend/app/pacote/sincronizar.py` | `sincronizar(session, data_dir, incluir_rascunhos=False) -> ResumoSincronizacao` + `__main__` |
| Criar | `backend/ingestao/__main__.py`, `cli.py` | argparse com os subcomandos |
| Criar | `backend/ingestao/baixar.py` | Download para `data/_cache/AAAA/` |
| Criar | `backend/ingestao/pdf_util.py` | Colunas, ordem de leitura, limpeza de texto, render de região |
| Criar | `backend/ingestao/figuras.py` | Render de região → WebP |
| Criar | `backend/ingestao/gabarito/__init__.py`, `familia_2025.py` | Registry + parser do gabarito |
| Criar | `backend/ingestao/layouts/__init__.py`, `base.py`, `familia_2025.py` | Registry + protocolo + parser da prova |
| Criar | `backend/tests/fixtures/pdfs/*.pdf` | Páginas recortadas dos PDFs oficiais (≤ 1 MB no total) |
| Criar | `backend/tests/test_pacote_*.py`, `test_ingestao_*.py` | Testes |
| Modificar | `.gitignore` | Adicionar `data/_cache/` |

### 2.2 Interfaces / Types

**Pacote (`app/pacote/schema.py`)** — mesmo formato no YAML:

```python
Letra = Literal["A", "B", "C", "D", "E"]

class Bloco(BaseModel):            # exatamente um dos dois campos
    texto: str | None = None
    figura: str | None = None      # nome do arquivo em figuras/ (ex.: "q037-1.webp")

class Alternativa(BaseModel):      # pelo menos um dos dois campos
    texto: str | None = None
    figura: str | None = None

class TextoBase(BaseModel):
    id: str                        # "tb01".."tb99" (regex ^tb\d{2}$)
    questoes: list[int]            # números das questões que usam este texto
    conteudo: list[Bloco]

class Questao(BaseModel):
    numero: int                    # 1..90
    disciplina: Disciplina | None = None
    assunto: str | None = None     # slug da taxonomia da disciplina principal (CR-004; V11)
    disciplinas_secundarias: list[Disciplina] = []
    texto_base: str | None = None  # id "tbNN"
    enunciado: list[Bloco]
    alternativas: dict[Letra, Alternativa]
    resposta: Letra | None = None
    anulada: bool = False
    pendencias: list[str] = []     # escritas pelo parser; o curador apaga ao resolver

class Fonte(BaseModel):
    url_prova: HttpUrl
    url_gabarito: HttpUrl
    familia_layout: str            # ex.: "familia_2025"

class PacoteProva(BaseModel):
    ano: int                       # 1977..2100
    versao: str                    # "V1".."V4" (2025) | "V","K","Q","X","Z" (2020, 2022-2024) | "unica"
    status: Literal["rascunho", "publicada"] = "rascunho"
    fonte: Fonte
    textos_base: list[TextoBase] = []
    questoes: list[Questao]
```

**Exemplo de `prova.yaml`:**

```yaml
ano: 2025
versao: V1
status: rascunho
fonte:
  url_prova: https://www.fuvest.br/wp-content/uploads/fuvest2025_primeira_fase_prova_V1.pdf
  url_gabarito: https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf
  familia_layout: familia_2025
textos_base:
  - id: tb01
    questoes: [10, 11]
    conteudo:
      - texto: "Texto para as questões 10 e 11..."
questoes:
  - numero: 2
    disciplina: null
    assunto: null
    disciplinas_secundarias: []
    texto_base: null
    enunciado:
      - texto: "Analise, na figura a seguir, os dados referentes a áreas de garimpo ilegal..."
      - figura: q002-1.webp
      - texto: "A partir dos dados apresentados ..., é correto afirmar:"
    alternativas:
      A: {texto: "Os territórios indígenas encontram-se nas áreas mais desmatadas..."}
      B: {texto: "..."}
      C: {texto: "..."}
      D: {texto: "..."}
      E: {texto: "..."}
    resposta: B
    anulada: false
    pendencias: []
```

**Pendência de validação (`app/pacote/validacao.py`):**

```python
@dataclass(frozen=True)
class Pendencia:
    codigo: str            # "V01".."V11"
    questao: int | None    # None = pendência da prova
    mensagem: str
    bloqueante: bool
```

**Protocolo de layout (`ingestao/layouts/base.py`):**

```python
class ResultadoExtracao(NamedTuple):
    questoes: list[Questao]        # disciplina=None; resposta preenchida depois pelo gabarito
    textos_base: list[TextoBase]
    figuras: dict[str, bytes]      # nome do arquivo -> WebP

class ParserLayout(Protocol):
    nome: str                                        # "familia_2025"
    def extrair(self, pdf_path: Path) -> ResultadoExtracao: ...

class ParserGabarito(Protocol):
    nome: str
    def extrair(self, pdf_path: Path, versao: str) -> dict[int, Letra | None | Literal["anulada"]]: ...
    # None = marcação não reconhecida (vira pendência)
```

Registries (`layouts/__init__.py`, `gabarito/__init__.py`): `FAMILIAS: dict[int, str]` (ano → nome da família) e `obter_parser(ano)`, que levanta `FamiliaNaoRegistrada` se o ano não tiver família.

### 2.3 Comandos da CLI

| Comando | Argumentos | Efeito |
|---------|------------|--------|
| `baixar` | `--ano`, `--prova-url`, `--gabarito-url`, `[--versao V1]` | Baixa para `data/_cache/AAAA/prova.pdf` e `gabarito.pdf` e grava `data/_cache/AAAA/fonte.json` (URLs, versão). Timeout 60 s; falha se o HTTP não for 200 ou se o arquivo não começar com `%PDF` |
| `extrair` | `--ano`, `[--forcar]` | Roda gabarito + layout da família do ano e grava `data/provas/AAAA/prova.yaml` (status `rascunho`) + `figuras/`. **Recusa** se `prova.yaml` já existir, a menos que receba `--forcar`, para proteger a revisão manual. Imprime o relatório de validação |
| `preview` | `--ano`, `--pagina`, `[--grade 50]` | Renderiza a página do PDF em cache em `data/_cache/AAAA/preview-pNN.png`, com grade de coordenadas (em pontos PDF) a cada `--grade` pontos, para o curador achar a bbox de uma figura |
| `recortar` | `--ano`, `--pagina`, `--bbox x0,y0,x1,y1`, `--nome qNNN-k` | Renderiza a região e grava `figuras/qNNN-k.webp`. **Não edita o YAML**: imprime o bloco `- figura: qNNN-k.webp` para o curador colar, preservando a formatação do arquivo |
| `validar` | `--ano` ou `--todas` | Carrega a taxonomia (`data/provas/assuntos.yaml`; inválida ou ausente → exit 1) e imprime o relatório. Exit 1 se houver pendência bloqueante em pacote `publicada` ou YAML inválido em qualquer pacote. Pacote `rascunho` só gera avisos |
| `importar` | `[--incluir-rascunhos]` | Roda a sincronização no banco do `DATABASE_URL`. `--incluir-rascunhos` só é aceito com banco SQLite (recusa com erro caso contrário), para o curador ver no site local um rascunho já completo antes de publicá-lo. Taxonomia inválida → exit 1 sem tocar o banco |
| `assuntos` | `[--ano]` | Relatório da classificação por disciplina e assunto, para revisão (CR-004; formato em `specs/06` §2.5). Não toca o banco |
| `cortes` | `--ano --url [--forcar]` | Baixa o PDF "Notas de Corte" do ano e grava `data/provas/notas_corte/AAAA.yaml` em rascunho, com as pendências de nome (CR-010; `specs/08` §2.4). Não sobrescreve sem `--forcar`; não toca o banco. `validar` passa a relatar também os cortes (`== cortes AAAA — status`, regras C01–C05) |

**Pacotes sintéticos para desenvolvimento:** `backend/tests/fixtures/gerar_pacotes.py` gera, de forma determinística, pacotes válidos de anos fictícios (2098 e 2099), com 90 questões, textos-base, figuras placeholder, anuladas e todas as disciplinas, além de uma taxonomia sintética (`assuntos.yaml`, 3 assuntos por disciplina) e um assunto em cada questão (CR-004). Esses pacotes alimentam os testes e o site local (`importar --data-dir tests/fixtures/provas`) antes de existir uma prova real curada.

Todos os comandos aceitam `--data-dir` (default: `DATA_DIR` da config) para os testes.

### 2.4 Lógica de Negócio

**Extrair (`extrair --ano A`):**
1. Carregar `data/_cache/A/fonte.json`; se não existir → erro "Rode `baixar` antes".
2. `obter_parser(A)` para layout e gabarito; se não houver família → erro listando os anos registrados.
3. Gabarito → `dict[numero, marcação]`. Se não houver exatamente 90 números → erro fatal (nada é gravado).
4. Layout → `ResultadoExtracao`.
5. Casar cada questão com o gabarito: letra → `resposta`; `"anulada"` → `anulada=True, resposta=None`; `None` → pendência "Marcação de gabarito não reconhecida".
6. Gravar figuras (`figuras/`) e `prova.yaml` com `status: rascunho`.
7. Imprimir o relatório de validação (todas as questões sairão com as pendências V05 e V11, sem disciplina e sem assunto, até a classificação). O YAML traz `assunto: null` em cada questão.

**Parser `familia_2025` — prova** (heurísticas refinadas com as fixtures durante a implementação):
1. Ignorar a capa e as páginas de instruções (sem marcadores de questão).
2. Por página: remover as faixas de cabeçalho e rodapé (margens fixas da família) e dividir em duas colunas pela metade da largura.
3. Ordem de leitura: coluna esquerda de cima para baixo, depois a direita; uma questão pode continuar na coluna ou na página seguinte.
4. Detectar os marcadores de início de questão (na família 2025, o número de dois dígitos isolado dentro da caixa, na borda da coluna) e segmentar o texto entre marcadores.
5. Dentro do corpo: linhas iniciadas por `(A)`…`(E)` iniciam as alternativas; o que vem antes é o enunciado.
6. Textos-base: um trecho iniciado por `Texto para as questões N e M` (e variações: `N a M`, `N, M e P`) vira um `TextoBase` com `id` sequencial `tbNN` e é vinculado às questões citadas.
7. Limpeza de texto (em `pdf_util`): remover artefatos `(cid:N)` (cid:3 → espaço), normalizar espaços, juntar hifenização de fim de linha quando a linha seguinte começa em minúscula e preservar quebras de parágrafo (espaçamento vertical > 1,5× a altura da linha).
8. Figuras: palavras cuja bbox cai dentro da bbox de uma figura (rótulos sobrepostos a mapas e gráficos, ex.: Q02 de 2025) **não** entram no texto, porque o recorte já as inclui. Cada imagem embutida (`page.images`) cuja bbox cai na região de uma questão é renderizada a 2× (144 dpi), limitada a 1200 px de largura, em WebP qualidade 80, com o nome `qNNN-k.webp` (ou `tbNN-k.webp`) e inserida como bloco `figura` na posição vertical correspondente. Imagem na região de uma alternativa vira `figura` da alternativa.
9. Pendências geradas pelo parser (texto em `pendencias`):
   - menos de 5 alternativas detectadas;
   - região com muitos traços vetoriais (curvas/retângulos) e sem imagem: "Possível figura vetorial na página P, y≈Y0–Y1";
   - texto com o caractere de substituição `�`;
   - enunciado vazio;
   - índice/expoente em fonte pequena (< 7,5pt): a palavra sai do texto (evita "PbSO" + linha solta "4") e o curador reescreve (ex.: PbSO₄);
   - glifos sem mapeamento `(cid:N)` (N ≠ 3), típicos de fórmulas em Cambria Math: recortar a fórmula como figura;
   - texto sublinhado (fio fino logo abaixo de uma palavra): o texto puro perde a ênfase, e questões como "conectivos sublinhados" (Q11 de 2025) dependem dela.
   Os alertas são agrupados por tipo e página (`rótulo na página P, y≈A, B: ação`). Pendências de um texto-base vão para a primeira questão que o usa.
10. Ordem de leitura por faixas: cada linha é partida em segmentos nos vãos horizontais (> 15pt) e cada segmento é classificado como coluna esquerda, direita ou largura total. As faixas de duas colunas são lidas esquerda→direita entre os elementos de largura total, o que cobre páginas mistas (p. 2 de 2025) e de coluna única (p. 12). Imagens entram na ordem pelo centro vertical (as de alternativas começam acima do rótulo `(A)`).

**Parser `familia_2025` — gabarito:** cabeçalho `PROVA V1 ...` (2025) ou `PROVA V PROVA K ...` (2020, 2022–2024, às vezes em minúsculas); as linhas têm o formato `n L n+45 L` repetido por versão (ex.: `1 E 46 D 1 A 46 C ...`). Extrair a coluna da versão pedida. Letras `A`–`E` → letra; o marcador de anulada documentado no próprio PDF → `"anulada"`; qualquer outro token, ou **duas respostas aceitas** num gabarito retificado (`48 D E`), → `None` (pendência para o curador).

**Extensão do registry:** depois que `familia_2025` passar nas fixtures de 2025, rodar `baixar` + `extrair` nos anos anteriores (2024, 2023, …) e registrar na família os anos que saírem sem pendência estrutural (V01/V03). O ano em que a família parar de funcionar marca onde uma família nova será necessária (fora do MVP se a meta de ≥ 5 provas já tiver sido atingida).

**Validar (`validar_pacote`)** — regras RN-007:

| Código | Regra | Bloqueante |
|--------|-------|------------|
| V01 | Exatamente 90 questões, números 1–90, sem repetição | Sim |
| V02 | Enunciado com pelo menos um bloco; blocos de texto não vazios | Sim |
| V03 | Alternativas A–E presentes, cada uma com texto não vazio ou figura | Sim |
| V04 | Não anulada ⇒ `resposta` A–E; anulada ⇒ `resposta` nula | Sim |
| V05 | `disciplina` definida | Sim |
| V06 | Toda figura referenciada existe em `figuras/` e o nome casa `^[a-z0-9-]+\.webp$` | Sim |
| V07 | `texto_base` referenciado existe; `textos_base[].questoes` bate com as questões que o referenciam | Sim |
| V08 | `pendencias` vazia em todas as questões | Sim |
| V09 | `disciplinas_secundarias` sem duplicatas e sem a principal | Sim |
| V10 | Arquivo em `figuras/` não referenciado (órfão) | Não (aviso) |
| V11 | `assunto` definido e presente na taxonomia da disciplina principal (RN-014, CR-004). Sem disciplina, só acusa a ausência do assunto | Sim |

**Sincronizar (`app/pacote/sincronizar.py`)** — idempotente, em uma única transação:
0. Carregar a taxonomia (`carregar_taxonomia(DATA_DIR)`). Inválida ou ausente → `TaxonomiaInvalida` **antes de tocar o banco**; `python -m app.pacote.sincronizar` sai com 1 e o start do container para (ADR-009, CR-004).
1. Listar `DATA_DIR/*/prova.yaml`; carregar e validar cada pacote (com a taxonomia).
2. Selecionar os pacotes **sem pendência bloqueante** com `status: publicada` (com `incluir_rascunhos`, também os `rascunho` sem pendência bloqueante, ou seja, completos mas ainda não publicados). YAML inválido ou pacote com pendência → ignorado, com log e o motivo (erro se `publicada`, informativo se `rascunho`).
3. Para cada pacote selecionado: upsert em `provas`; apagar `textos_base` e `questoes` daquele ano e inserir de novo, com IDs `AAAA-NNN` e `AAAA-tbNN` (ADR-006) e o `assunto` de cada questão.
4. Apagar de `provas` os anos que não estão entre os selecionados (cascade em questões e textos-base; `reportes` não são afetados).
5. Retornar e logar `ResumoSincronizacao(sincronizadas=[anos], ignoradas={ano: motivo}, removidas=[anos])`.
6. `python -m app.pacote.sincronizar`: exit 0 mesmo com pacotes ignorados (o CI já barra pacote inválido); exit 1 em erro de banco ou taxonomia inválida.

### 2.5 Banco de Dados

Tabelas `provas`, `textos_base` e `questoes` conforme `02-ARCHITECTURE.md` §4, criadas na migration `001_schema_inicial` (junto com `reportes` e `estatisticas_geracao`). Índices: `questoes(prova_ano)`, `questoes(disciplina)`, `UNIQUE(questoes.prova_ano, questoes.numero)`. A migration `002_assunto_questoes` (CR-004) acrescenta `questoes.assunto` (varchar 40, nullable) e o índice `ix_questoes_assunto`.

### 2.6 Validações da CLI

| Entrada | Regra | Mensagem de Erro |
|---------|-------|------------------|
| `--ano` | Inteiro 1977–2100 | "Ano inválido" |
| `--bbox` | 4 números, x0 < x1, y0 < y1, dentro da página | "bbox inválida: use x0,y0,x1,y1 dentro de 0–LARGURA × 0–ALTURA" |
| `--nome` | `^(q\d{3}\|tb\d{2})-[a-z0-9]+$` | "Nome inválido: use qNNN-k ou tbNN-k" |
| `--pagina` | 1..número de páginas | "Página fora do intervalo 1–N" |
| URLs | `https://` | "URL deve usar https" |

---

## 3. Componentes de UI

Não se aplica (CLI).

---

## 4. Fluxos Críticos

```mermaid
sequenceDiagram
    actor C as Curador
    participant CLI as python -m ingestao
    participant FS as data/
    participant Git as Repositório/CI
    C->>CLI: baixar --ano 2025 --prova-url ... --gabarito-url ...
    CLI->>FS: _cache/2025/{prova,gabarito}.pdf + fonte.json
    C->>CLI: extrair --ano 2025
    CLI->>FS: provas/2025/prova.yaml (rascunho) + figuras/
    CLI-->>C: relatório (pendências por questão)
    loop até zerar as pendências
        C->>FS: edita prova.yaml (disciplina, correções)
        C->>CLI: preview / recortar (figuras vetoriais)
        C->>CLI: validar --ano 2025
    end
    C->>CLI: importar --incluir-rascunhos (confere no site local)
    C->>FS: status: publicada
    C->>Git: commit + merge em master
    Git->>Git: CI roda validar --todas
    Note over Git: deploy -> sincronizar -> prova no ar
```

---

## 5. Casos de Borda

| # | Cenário | Comportamento Esperado |
|---|---------|------------------------|
| 1 | `extrair` com `prova.yaml` já existente | Recusa sem `--forcar`; a revisão manual não é sobrescrita |
| 2 | Gabarito com 89 ou 91 números | Erro fatal; nada é gravado |
| 3 | Marcação de gabarito desconhecida | Questão sem resposta + pendência; V04/V08 bloqueiam a publicação |
| 4 | Questão que continua na coluna/página seguinte | Texto concatenado na ordem de leitura |
| 5 | Figura vetorial (gráfico desenhado) | Pendência com página e faixa vertical; o curador usa `preview` + `recortar` |
| 6 | Texto-base usado por questões não consecutivas | `questoes` lista todas; V07 valida a consistência |
| 7 | Pacote `publicada` com pendência chegando ao deploy | A sincronização ignora esse ano (log de erro); o site continua no ar sem ele. O CI deveria ter barrado |
| 8 | Pacote removido do repositório | A próxima sincronização remove a prova e as questões; reportes antigos permanecem |
| 9 | Ano sem família registrada | Erro listando os anos suportados |
| 10 | `importar --incluir-rascunhos` com `DATABASE_URL` de Postgres | Recusa (ADR-008) |
| 11 | `assuntos.yaml` ausente ou inválido | `validar`, `importar` e `assuntos` saem com 1; a sincronização do start aborta sem tocar o banco (CR-004) |
| 12 | Slug renomeado na taxonomia sem reclassificar as questões | V11 acusa cada questão com o slug antigo; o pacote publicado não passa no CI (CR-004) |

---

## 6. Plano de Testes

| ID | Cenário | Alvo | Esperado |
|----|---------|------|----------|
| IT-001 | YAML válido carrega e salva sem perda (ida e volta) | `leitura` | Objetos iguais |
| IT-002 | Cada regra V01–V10 com um pacote de fixture que a viola | `validacao` | Pendência com o código correto e bloqueante conforme a tabela |
| IT-003 | Pacote válido `publicada` | `validacao` | Nenhuma pendência bloqueante |
| IT-004 | Sincronizar 2× o mesmo diretório | `sincronizar` | Mesmo estado no banco; nenhuma duplicata |
| IT-005 | Sincronizar com um pacote `rascunho` e um `publicada` | `sincronizar` | Só o publicado entra; com `incluir_rascunhos`, ambos |
| IT-006 | Remover um pacote e sincronizar | `sincronizar` | Prova removida; reportes da prova preservados |
| IT-007 | Pacote publicado inválido | `sincronizar` | Ignorado, com motivo no resumo; demais sincronizados |
| IT-008 | Gabarito 2025 (fixture: PDF oficial, 2 páginas) | `gabarito/familia_2025` | 90 respostas para V1; Q1 = E, Q46 = D |
| IT-009 | Prova 2025 (fixture: páginas com questão simples, questão com figura, texto-base) | `layouts/familia_2025` | Enunciado, 5 alternativas e figura extraídos |
| IT-010 | Limpeza de texto: `(cid:3)`, hifenização, parágrafos | `pdf_util` | Texto normalizado |
| IT-011 | `extrair` com `prova.yaml` existente, sem `--forcar` | CLI | Exit ≠ 0; arquivo intacto |
| IT-012 | `importar --incluir-rascunhos` com URL Postgres | CLI | Exit ≠ 0 com mensagem |
| IT-013 | `recortar` com bbox fora da página | CLI | Exit ≠ 0 com mensagem |
| IT-014 a IT-020 | Taxonomia, V11, `validar` com taxonomia, pacotes sintéticos, sincronização com assunto e com taxonomia inválida, comando `assuntos` | ver `specs/06` §6 | CR-004 |

---

## 7. Checklist de Implementação

- [ ] Enum de disciplinas + schema do pacote + leitura/escrita
- [ ] Validação V01–V10 + relatório
- [ ] Sincronização + `__main__` + integração no start do container
- [ ] CLI: `baixar`, `extrair`, `preview`, `recortar`, `validar`, `importar`
- [ ] `pdf_util` + `figuras`
- [ ] Família 2025: gabarito + prova, com fixtures
- [ ] Extensão do registry aos anos vizinhos
- [ ] Testes IT-001 a IT-013
