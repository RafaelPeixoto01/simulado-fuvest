# Especificação Técnica — Contas e Histórico Sincronizado

**Versão:** 1.4
**Data:** 2026-10-01
**PRD Ref:** 01-PRD v4.1 (RF-008, RF-020, RF-022, RF-024 a RF-026, US-013 a US-016, RN-012, RN-016, RN-017, RNF-004, RNF-005)
**Arquitetura Ref:** 02-ARCHITECTURE v1.7 (ADR-004 revisto, ADR-010, ADR-011, ADR-012)
**CR Ref:** CR-005 (Fase 3B do roadmap), CR-006 (login obrigatório — §8), CR-007 (vitrine e apresentação — §9), CR-008 (identidade na apresentação — §9.2)

---

## 1. Resumo das Mudanças

Login opcional com a conta Google, por redirecionamento (OpenID Connect com *authorization code*, PKCE e `state`). Com a conta, o histórico de simulados concluídos fica também no servidor, e o navegador vira um espelho dele. O painel "Meu desempenho" passa a somar esse histórico. O estudante sai (o histórico deixa o navegador) e exclui a conta quando quiser. Sem conta, nada muda.

### Escopo desta Iteração
- Banco: `usuarios`, `sessoes`, `simulados_concluidos` (migration `003_contas`)
- Login e sessão: `/api/auth/google`, `/api/auth/google/callback`, `/api/sessao`
- Histórico no servidor: `/api/historico`; exclusão: `/api/conta`
- Frontend: sincronização do histórico, cabeçalho, `/conta`, `/privacidade`, avisos do Histórico e do painel

Fora desta iteração: outros provedores de login, e-mail/senha, sincronizar o simulado em andamento ou o Treino, excluir um simulado específico do histórico.

---

## 2. Detalhamento Técnico

### 2.1 Arquivos

| Ação | Caminho | Descrição |
|------|---------|-----------|
| Modificar | `backend/app/config.py` | Variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_URL`; `login_disponivel` |
| Modificar | `backend/app/models.py` + criar `alembic/versions/003_contas.py` | 3 tabelas |
| Criar | `backend/app/services/google.py` | `ProvedorGoogle`, `IdentidadeGoogle`, `ErroLoginGoogle` |
| Criar | `backend/app/autenticacao.py` | Cookies, PKCE, `state`, caminho de volta |
| Criar | `backend/app/services/contas.py` | Login, sessão, exclusão |
| Criar | `backend/app/services/historico.py` | Listar, gravar, limpar |
| Criar | `backend/app/routers/auth.py`, `conta.py`, `historico.py` | Endpoints |
| Modificar | `backend/app/dependencias.py`, `schemas.py`, `main.py` | Dependências, schemas, registro |
| Criar | `backend/tests/test_google.py`, `test_auth.py`, `test_historico.py` | Testes |
| Modificar | `frontend/src/types.ts`, `services/api.ts`, `storage/historicoStorage.ts` | Tipos, chamadas, marca da conta |
| Criar | `frontend/src/storage/sincronizacao.ts` | Algoritmo da sincronização |
| Criar | `frontend/src/hooks/useSessao.ts`, `useHistorico.ts`, `useConta.ts` | Estado da sessão e do histórico |
| Criar | `frontend/src/components/BotaoGoogle.tsx`, `pages/ContaPage.tsx`, `pages/PrivacidadePage.tsx` | UI |
| Modificar | `frontend/src/components/Layout.tsx`, `App.tsx`, `pages/HistoricoPage.tsx`, `DesempenhoPage.tsx`, `ResultadoPage.tsx`, `hooks/useFinalizarSimulado.ts`, `test/apiFalsa.ts` | Integração |

### 2.2 Modelo de dados

| Tabela | Campo | Tipo | Restrições | Descrição |
|--------|-------|------|------------|-----------|
| `usuarios` | id | int | PK | Interno; exposto ao próprio usuário em `/api/sessao` (marca da conta no navegador) |
| | google_sub | varchar(255) | NOT NULL, UNIQUE | Claim `sub` do Google: a identidade da conta |
| | email | varchar(320) | NOT NULL | Atualizado a cada login (D3) |
| | nome | varchar(200) | NULL | Claim `name`; atualizado a cada login (D3) |
| | criado_em | timestamptz | NOT NULL, default now | |
| | ultimo_acesso_em | timestamptz | NOT NULL, default now | Atualizado a cada login |
| `sessoes` | token_hash | varchar(64) | PK | SHA-256 (hex) do token do cookie; o token em si não é guardado |
| | usuario_id | int | FK → usuarios.id ON DELETE CASCADE, index | |
| | criado_em | timestamptz | NOT NULL, default now | |
| | expira_em | timestamptz | NOT NULL | `criado_em` + 90 dias |
| `simulados_concluidos` | usuario_id | int | PK (composta), FK → usuarios.id ON DELETE CASCADE | |
| | id | varchar(64) | PK (composta) | `HistoricoEntry.id` (UUID gerado no navegador) |
| | finalizado_em_ms | bigint | NOT NULL; índice `(usuario_id, finalizado_em_ms)` | `HistoricoEntry.finalizadoEm` (epoch ms): ordenação e limite |
| | dados | JSON | NOT NULL | O `HistoricoEntry` validado, como o navegador o enviou (campos ausentes continuam ausentes) |
| | recebido_em | timestamptz | NOT NULL, default now | |

### 2.3 Interfaces / Types

```python
# app/config.py
class Settings:
    ...
    google_client_id: str | None = None        # GOOGLE_CLIENT_ID
    google_client_secret: str | None = None    # GOOGLE_CLIENT_SECRET (segredo)
    public_url: str = "http://localhost:5173"  # PUBLIC_URL, sem barra final: redirect_uri e Origin aceito

    @property
    def login_disponivel(self) -> bool: ...   # client_id e secret definidos

# app/services/google.py
URL_AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth"
URL_TOKEN = "https://oauth2.googleapis.com/token"
EMISSORES = {"https://accounts.google.com", "accounts.google.com"}
ESCOPOS = "openid email profile"

@dataclass(frozen=True)
class IdentidadeGoogle:
    sub: str
    email: str
    nome: str | None

class ErroLoginGoogle(Exception): ...

class ProvedorGoogle:
    def __init__(self, client_id: str, client_secret: str): ...
    def url_autorizacao(self, *, redirect_uri: str, state: str, code_challenge: str) -> str: ...
    def trocar_codigo(self, *, code: str, code_verifier: str, redirect_uri: str) -> IdentidadeGoogle:
        """POST no URL_TOKEN (urllib, timeout 10 s); valida o id_token: iss em EMISSORES,
        aud == client_id, exp no futuro, sub e email presentes. Qualquer falha -> ErroLoginGoogle."""

# app/autenticacao.py
DURACAO_SESSAO = timedelta(days=90)
DURACAO_LOGIN = timedelta(minutes=10)
CAMINHO_VOLTAR = re.compile(r"^/[A-Za-z0-9/_-]*$")

def nome_cookie_sessao(settings) -> str      # "__Host-sessao" em produção, "sessao" fora
def nome_cookie_login(settings) -> str       # "__Host-login-google" / "login-google"
def novo_pkce() -> tuple[str, str]           # (verifier, challenge S256)
def caminho_seguro(voltar: str | None) -> str  # CAMINHO_VOLTAR ou "/"
```

```python
# app/schemas.py — histórico (espelho de HistoricoEntry, specs/04 §2.2)
class ItemHistorico(BaseModel):              # extra="forbid"
    questao_id: IdQuestao
    resposta: Letra | None
    correta: Letra | None
    anulada: bool
    acertou: bool
    disciplina: Disciplina
    assunto: Slug | None = None              # ausente nos resultados anteriores ao CR-004

class AssuntoHistorico(BaseModel):           # extra="forbid"
    assunto: Slug
    nome: str (1..60)
    total: int (0..90); acertos: int (0..90); percentual: float (0..100)

class DisciplinaHistorico(BaseModel):        # extra="forbid"
    disciplina: Disciplina
    total, acertos, percentual               # como acima
    assuntos: list[AssuntoHistorico] (≤ 20) | None = None   # ausente antes do CR-004

class ResultadoHistorico(BaseModel):         # extra="forbid"
    itens: list[ItemHistorico] (≤ 90)
    total, acertos, percentual
    por_disciplina: list[DisciplinaHistorico] (≤ 8)
    ignoradas: list[IdQuestao] (≤ 90)

class EntradaHistorico(BaseModel):           # extra="forbid"; campos em camelCase no JSON (alias)
    versao: Literal[1]
    id: str (^[A-Za-z0-9-]{1,64}$)
    modo: Literal["completa", "personalizado", "ano"]
    descricao: str (1..200)
    iniciadoEm: int; finalizadoEm: int (0..2^53)
    tempoGastoMs: int; tempoLimiteS: int | None
    finalizadoPorTempo: bool
    questaoIds: list[IdQuestao] (1..90)
    resultado: ResultadoHistorico

class HistoricoRequest(BaseModel):
    entradas: list[dict] (1..50)             # validadas uma a uma no serviço (ver §2.4)

class HistoricoResponse(BaseModel):
    entradas: list[dict]                     # HistoricoEntry, do mais recente para o mais antigo
    rejeitadas: list[str] = []               # ids recusados no POST (entrada inválida)

class UsuarioPublico(BaseModel):
    id: int
    email: str
    nome: str | None

class SessaoResponse(BaseModel):
    login_disponivel: bool
    usuario: UsuarioPublico | None
    acesso: Literal["conta", "livre", "indisponivel"]  # CR-006, §8
```

```typescript
// types.ts
export interface Usuario { id: number; email: string; nome: string | null }
export interface Sessao { login_disponivel: boolean; usuario: Usuario | null; acesso: 'conta' | 'livre' | 'indisponivel' }  // acesso: CR-006

// storage/historicoStorage.ts
export const CHAVE_CONTA = 'simulado-fuvest:v1:historico-conta'
export interface MarcaConta { conta: number; ids: string[] }  // ids confirmados pelo servidor para essa conta
export function substituirHistorico(lista: HistoricoEntry[]): boolean
export function lerMarcaConta(): MarcaConta | null
export function gravarMarcaConta(marca: MarcaConta): boolean
export function removerMarcaConta(): void

// storage/sincronizacao.ts
export function sincronizarHistorico(usuarioId: number): Promise<HistoricoEntry[]>
export function historicoSemConta(): HistoricoEntry[]
export function apagarHistoricoDoNavegador(): void

// hooks
export function useSessao(): UseQueryResult<Sessao, ApiError>
export function useHistorico(): {
  entradas: HistoricoEntry[]; usuario: Usuario | null; loginDisponivel: boolean
  sincronizando: boolean; erroSincronizacao: boolean
}
export function useLimparHistorico(), useSair(), useExcluirConta()  // mutations
```

### 2.4 Lógica de Negócio

**Login (`GET /api/auth/google?voltar=/caminho`):**
1. Sem `login_disponivel` → 404 `login_indisponivel`.
2. `state` = `token_urlsafe(32)`; PKCE: `verifier` = `token_urlsafe(64)`, `challenge` = base64url(SHA-256(verifier)) sem `=`.
3. `voltar` passa por `caminho_seguro` (só caminhos internos simples; senão `/`).
4. Cookie de login (`HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Path=/`, 10 min) = `state.verifier.base64url(voltar)`.
5. 302 para `URL_AUTORIZACAO` com `client_id`, `redirect_uri = PUBLIC_URL + /api/auth/google/callback`, `response_type=code`, `scope=openid email profile`, `state`, `code_challenge`, `code_challenge_method=S256`, `prompt=select_account`.

**Callback (`GET /api/auth/google/callback?code&state` ou `?error`):**
1. Falha em qualquer passo → 302 para `/conta?erro=login`, apagando o cookie de login e sem sessão. Falhas: `error` presente, `code`/`state` ausentes, cookie ausente ou malformado, `state` diferente (comparação em tempo constante), `ErroLoginGoogle` na troca.
2. `trocar_codigo` → `IdentidadeGoogle`.
3. `entrar`: usuário por `google_sub`; cria se não existir (num savepoint: dois primeiros logins simultâneos da mesma conta não dão erro, o segundo relê o usuário); atualiza `email`, `nome` e `ultimo_acesso_em`. Remove as sessões expiradas desse usuário.
4. Se a requisição trouxer um cookie de sessão válido, essa sessão é encerrada (troca de conta no mesmo navegador).
5. `criar_sessao`: token = `token_urlsafe(32)`; grava o SHA-256 e `expira_em` = agora + 90 dias.
6. 302 para `voltar` (caminho relativo), com o cookie de sessão (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 90 dias; `Secure` e `__Host-` em produção) e o cookie de login apagado.

**Sessão atual (`obter_usuario`):** cookie ausente, maior que 128 caracteres, hash desconhecido ou `expira_em` vencido → sem usuário (a sessão vencida é apagada). As datas do banco são normalizadas para UTC antes de comparar (o SQLite devolve sem fuso). Com o login desligado, a sessão continua valendo: desligar só impede logins novos, e quem já entrou ainda sincroniza, sai e exclui a conta (RF-026; revisão de código).

**Provedor (`criar_app`):** `ProvedorGoogle` só com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`; em produção, também exige `PUBLIC_URL` com `https` — senão o login fica desligado e o motivo vai para o log (uma variável esquecida não derruba o site). Falhas de rede na troca do código (`OSError`, `http.client.HTTPException`) e JSON inválido viram `ErroLoginGoogle`. Com várias audiências no `id_token`, o `azp` precisa ser este cliente. `email_verified` não é exigido: a identidade é o `sub`, e o e-mail só aparece para o próprio dono.

**Histórico — `POST /api/historico` (`gravar`):**
1. Cada item de `entradas` é validado com `EntradaHistorico`. Os inválidos vão para `rejeitadas` (o `id` deles, se for um texto; senão `"?"`) e não são gravados; o resto segue.
2. Insere as entradas cujo `id` ainda não existe para o usuário (`INSERT ... ON CONFLICT DO NOTHING`, no dialeto do banco). Entrada já existente **não é alterada** (o resultado de um simulado é imutável).
3. `dados` = `model_dump(mode="json", by_alias=True, exclude_unset=True)`: a entrada é devolvida como chegou.
4. Limite (D4): mantém as 50 de maior `finalizado_em_ms` (empate pelo `id`, decrescente) e apaga as demais do usuário.
5. Responde com a lista completa (como o `GET`) + `rejeitadas`.

**Histórico — `GET`:** `dados` das entradas do usuário, por `finalizado_em_ms` decrescente (empate pelo `id`). **`DELETE`:** apaga todas as do usuário.

**Excluir conta:** apaga o usuário; sessões e histórico saem por cascata (`ON DELETE CASCADE`, ativo também no SQLite); apaga o cookie de sessão.

**Verificação de origem (`verificar_origem`, nos `POST`/`DELETE` com cookie):** se o header `Origin` existir e for diferente da origem de `PUBLIC_URL` → 403 `origem_invalida`. Sem `Origin` (cliente que não é navegador) → segue; o navegador sempre manda `Origin` em `POST`/`DELETE`.

**Sincronização no navegador (`sincronizarHistorico(usuarioId)`, ADR-011):**
1. `marca` = `lerMarcaConta()`; `local` = `listarHistorico()`.
2. Se `marca.conta !== usuarioId` (espelho de outra conta, cuja sessão acabou sem "Sair"): remover de `local` as entradas de `marca.ids` e ignorar a marca. Elas são da outra conta e não vão para esta.
3. `pendentes` = entradas de `local` fora de `marca.ids` (feitas sem conta, D1, ou que ainda não chegaram ao servidor).
4. Com pendentes → `POST /api/historico {entradas: pendentes}`; sem → `GET /api/historico`.
5. Novo histórico local = resposta do servidor + as pendentes recusadas (`rejeitadas`, que ficam só neste navegador e não são reenviadas até a página recarregar) + o que outra aba gravou enquanto a chamada andava, do mais recente para o mais antigo, no máximo 50. `marca` = `{conta: usuarioId, ids: ids da resposta}`.
6. Erro (rede, 5xx) → o `localStorage` não muda e as pendentes continuam pendentes. 401 → a sessão é recarregada (`invalidateQueries(['sessao'])`).

Consequências: entrada apagada em outro dispositivo ("Limpar histórico") some deste na próxima sincronização, porque está na marca e não volta do servidor. Entrada pendente nunca é apagada por sincronização.

**Fila (`exclusivo`):** sincronizar, sair, limpar e excluir rodam uma de cada vez no navegador. Uma sincronização em andamento termina antes de "Sair"/"Limpar"/"Excluir" começar, e nenhuma começa no meio deles: sem a fila, ela regravaria o espelho (ou reenviaria entradas) depois de apagado (revisão de código).

**Sem conta (`historicoSemConta`):** se existir marca (a sessão acabou sem "Sair", ou o login foi desligado), remove do `localStorage` as entradas de `marca.ids` e a marca. As pendentes ficam e vão para a próxima conta que entrar (D1). Devolve `listarHistorico()`.

**`useHistorico`:** espera `useSessao`. Uma query `['historico', usuario?.id ?? 'sem-conta']`: com conta, `sincronizarHistorico` (`staleTime` 60 s, refaz ao voltar o foco para a aba); sem conta, `historicoSemConta`. Enquanto a sessão carrega, se ela falhar ou enquanto a query busca, as entradas são as do `localStorage` (`placeholderData`). Assim a página nunca fica vazia nem bloqueada, e quem está sem rede vê o que tem. O `Layout` chama `useHistorico`, então o envio pendente acontece em qualquer página. Com conta e `localStorage` bloqueado, a lista vem do servidor (só em memória).

**Finalizar (complementa `specs/04` §2.3):** depois de `adicionarAoHistorico`, `invalidateQueries(['historico'])`. A tela de resultado (dentro do `Layout`) remonta a query, que envia a nova entrada (pendente).

**Limpar histórico (`useLimparHistorico`), na fila:** com conta, `DELETE /api/historico`, depois `substituirHistorico([])` e marca `{conta, ids: []}`; se a chamada falhar, nada é apagado e a página mostra o erro. Sem conta, `limparHistorico()`, como hoje.

**Sair (`useSair`, D2), na fila:** sincroniza (envia as pendentes) → `DELETE /api/sessao` → `historicoSemConta()`: sai do navegador tudo o que a marca confirmou; as recusadas pelo servidor, que só existem ali, ficam (revisão de código). Se o envio falhar por rede, nada é apagado e a página avisa ("Não foi possível enviar os simulados pendentes; tente sair de novo com internet"). Se a sessão já tiver acabado (401), segue do mesmo jeito. Depois: sessão anônima no cache e mensagem "Você saiu. Seu histórico continua na sua conta."

**Excluir conta (`useExcluirConta`), na fila:** `DELETE /api/conta` → `apagarHistoricoDoNavegador()` (histórico e marca) → sessão anônima no cache → mensagem "Sua conta e o histórico guardado nela foram excluídos."

### 2.5 API Endpoints

```
GET /api/auth/google?voltar=/caminho
Auth: não | Rate limit: 20/min por IP
302: Location = accounts.google.com (+ cookie de login)
404: {"detail": {"codigo": "login_indisponivel", "mensagem": "O login com Google não está disponível."}}

GET /api/auth/google/callback?code=...&state=...   (ou ?error=...)
Auth: não (cookie de login) | Rate limit: 20/min por IP
302: Location = voltar (sucesso, + cookie de sessão) | /conta?erro=login (falha)
404: login_indisponivel
Query: code ≤ 2048, state ≤ 256, error ≤ 256 caracteres (acima → 422)

GET /api/sessao
Auth: opcional | Cache-Control: no-store
200: SessaoResponse  (sem sessão: {"login_disponivel": bool, "usuario": null})

DELETE /api/sessao
Auth: opcional (idempotente) | Origin verificado
204 (+ cookie de sessão apagado) | 403 origem_invalida

GET /api/historico
Auth: sessão | Rate limit: 60/min por IP | Cache-Control: no-store
200: HistoricoResponse (rejeitadas = []) | 401 nao_autenticado

POST /api/historico
Auth: sessão | Rate limit: 30/min por IP | Origin verificado | Cache-Control: no-store
Body: HistoricoRequest
200: HistoricoResponse | 401 | 403 | 422 (corpo fora do formato, 0 ou > 50 entradas)

DELETE /api/historico
Auth: sessão | Rate limit: 10/min por IP | Origin verificado
204 | 401 | 403

DELETE /api/conta
Auth: sessão | Rate limit: 10/min por IP | Origin verificado
204 (+ cookie de sessão apagado) | 401 | 403
```

Erros de domínio novos: `login_indisponivel` (404), `nao_autenticado` (401, "Entre com sua conta Google para continuar."), `origem_invalida` (403, "Origem da requisição não permitida.").

### 2.6 Validações

| Campo | Regra | Resultado |
|-------|-------|-----------|
| `voltar` | `^/[A-Za-z0-9/_-]*$` | Fora do padrão → `/` (sem erro) |
| `entradas` | 1–50 objetos | 422 |
| Cada entrada | `EntradaHistorico` (tamanhos, padrões, enums; campos extras recusados) | Vai para `rejeitadas` |
| Cookie de sessão | ≤ 128 caracteres; hash conhecido; não vencido | Senão, sem usuário |

---

## 3. Componentes de UI

### Cabeçalho (`Layout`, complementa `specs/03`)
- Terceiro link no `nav`, depois de "Histórico", se `login_disponivel` ou se já houver alguém conectado: sem conta, **"Entrar"**; com conta, o **primeiro nome** (primeira palavra de `nome`; "Conta" se não houver). Os dois levam a `/conta` (`NavLink`, mesmo estilo). Enquanto a sessão carrega ou se ela falhar, o link não aparece. Abaixo de 640 px, os três ficam empilhados como os dois de hoje.
- Rodapé: link "Privacidade" (`/privacidade`) depois do aviso de não afiliação.

### Componente: BotaoGoogle

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| voltar | `string` | Sim | Caminho para onde o login volta |

Link (`<a href="/api/auth/google?voltar=...">`, navegação de página inteira, não `fetch`) com o "G" do Google em SVG inline e o texto "Entrar com Google"; borda, fundo claro, 48 px de altura.

### Página: ContaPage (`/conta`)

| Situação | Conteúdo |
|----------|----------|
| Sessão carregando | `Carregando` |
| Erro de login (`?erro=login`) | Aviso "Não foi possível entrar com o Google. Tente novamente." acima do conteúdo |
| Login indisponível, sem ninguém conectado | "O login com Google não está disponível no momento. O histórico continua guardado neste navegador." (quem já está conectado vê a visão "Com conta") |
| Sem conta | `h1` "Conta"; texto: entrar guarda o histórico na conta e mostra em qualquer dispositivo; "Os simulados já feitos neste navegador vão para a sua conta."; "Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos. O simulado em andamento continua só neste navegador."; `BotaoGoogle voltar="/conta"`; link "Privacidade" |
| Com conta | `h1` "Conta"; "Conectado como **nome** (email)"; estado do histórico ("N simulados na sua conta" / "Sincronizando…" / "Não foi possível sincronizar agora. Tentaremos de novo."); botão "Sair" com a explicação "Ao sair, o histórico deixa este navegador e continua na sua conta."; seção "Excluir conta" com botão perigoso e `ConfirmDialog` ("Excluir a conta?" — "Seu nome, seu e-mail e todo o histórico guardado na conta serão apagados. Não dá para desfazer.") |
| Depois de sair / excluir | Mensagem de status (`role="status"`) + a visão "Sem conta" |

`useTituloPagina('Conta')`.

### Página: PrivacidadePage (`/privacidade`)
`h1` "Privacidade" e seções curtas: **Sem conta** (nada pessoal no servidor; simulado e histórico só no navegador; reportes anônimos; contagem anônima de simulados gerados); **Com conta Google** (o que guardamos: identificador da conta Google, nome, e-mail e os 50 simulados concluídos mais recentes; para quê: mostrar o histórico e o desempenho em qualquer dispositivo; do Google recebemos só nome e e-mail, sem acesso à senha nem a outros dados; não compartilhamos nem usamos para publicidade); **Cookies** (só para quem entra: um de sessão por 90 dias e um temporário durante o login; nenhum cookie de rastreamento); **Excluir seus dados** (Conta → "Excluir conta" apaga tudo na hora; "Sair" tira o histórico deste navegador); **Contato** (issues do repositório público no GitHub). `useTituloPagina('Privacidade')`.

### HistoricoPage e DesempenhoPage (complementam `specs/04` e `specs/06`)
- Fonte: `useHistorico().entradas` (no lugar de `listarHistorico`).
- Aviso com conta: "O histórico está guardado na sua conta (email) e aparece em todos os dispositivos em que você entrar." (Histórico) / "Estes números somam os simulados concluídos guardados na sua conta, em todos os dispositivos." (painel).
- Aviso sem conta: o de hoje e, se `login_disponivel`, o link "Entre com o Google para guardar o histórico na sua conta." (`/conta`).
- Histórico, "Limpar histórico" com conta: `ConfirmDialog` com o texto "Os resultados serão apagados da sua conta, em todos os dispositivos."; erro → aviso "Não foi possível limpar o histórico da conta. Tente novamente."

### ResultadoPage (complementa `specs/04`)
- A entrada vem do state da navegação ou de `useHistorico().entradas`. Não encontrada **e** sincronizando → `Carregando`. Não encontrada depois disso → a mensagem de hoje; sem conta e com login disponível, acrescenta "Se você fez o simulado com a sua conta, entre com o Google para vê-lo aqui." com link para `/conta`.

---

## 4. Fluxos Críticos

```mermaid
sequenceDiagram
    participant N as Navegador (SPA)
    participant API as FastAPI
    participant G as Google
    participant DB as Postgres
    N->>API: GET /api/auth/google?voltar=/conta
    API-->>N: 302 Google + cookie de login (state, verifier)
    N->>G: consentimento
    G-->>N: 302 /api/auth/google/callback?code&state
    N->>API: callback (+ cookie de login)
    API->>G: POST token (code, verifier, segredo)
    G-->>API: id_token
    API->>DB: usuário (upsert) + sessão (hash)
    API-->>N: 302 /conta + cookie de sessão
    N->>API: GET /api/sessao
    N->>API: POST /api/historico {entradas locais} (D1)
    API->>DB: insere novas, mantém 50
    API-->>N: lista da conta
    Note over N: localStorage = lista da conta; marca = ids
```

---

## 5. Casos de Borda

| # | Cenário | Comportamento Esperado |
|---|---------|------------------------|
| 1 | Estudante nega o consentimento no Google | 302 `/conta?erro=login` + aviso |
| 2 | `state` diferente, cookie de login vencido ou ausente | Mesmo que o 1; nenhuma sessão |
| 3 | Primeiro login com histórico local | Envia tudo (D1); a conta fica com a união, no máximo 50 |
| 4 | Segundo dispositivo, sem histórico local | Recebe o da conta |
| 5 | Simulado finalizado sem rede, com conta | Fica no navegador como pendente; vai na próxima sincronização |
| 6 | "Limpar histórico" no dispositivo A | B perde as entradas na próxima sincronização; as pendentes de B são enviadas |
| 7 | Sessão vencida (90 dias) ou cookie apagado | `/api/sessao` sem usuário → espelho removido do navegador, pendentes ficam |
| 8 | Outra conta entra no mesmo navegador sem "Sair" antes | Entradas da marca antiga saem do navegador e não vão para a nova conta |
| 9 | Duas abas sincronizando ao mesmo tempo | `ON CONFLICT DO NOTHING`: sem duplicata nem erro |
| 10 | Entrada local inválida para o servidor | Volta em `rejeitadas`, fica só neste navegador; o resto sincroniza |
| 11 | Mais de 50 na conta depois do envio | Ficam as 50 mais recentes por `finalizadoEm` |
| 12 | `localStorage` bloqueado, com conta | Histórico e painel vêm do servidor (em memória); finalizar com storage bloqueado continua avisando que o resultado não fica salvo (specs/04) |
| 13 | `POST`/`DELETE` vindos de outro site | Cookie não vai (`SameSite=Lax`); `Origin` diferente → 403 |
| 14 | `voltar=//evil.com` ou `https://...` | Vira `/` |
| 15 | Login desligado em produção (variável removida, ou `PUBLIC_URL` sem `https`) | "Entrar" some para quem não está conectado; quem já entrou continua conectado (sincroniza, sai, exclui a conta) até a sessão vencer |
| 16 | Sincronização em andamento quando o estudante clica em "Sair", "Limpar" ou "Excluir" | A operação espera a sincronização terminar (fila); nada é regravado depois |
| 17 | Entrada recusada pelo servidor | Fica só neste navegador, não é reenviada até a página recarregar e não sai do navegador no "Sair" |

---

## 6. Plano de Testes

| ID | Cenário | Alvo | Esperado |
|----|---------|------|----------|
| BT-050 | Sessão sem cookie, com e sem configuração | GET /api/sessao | `login_disponivel` false/true, `usuario` null, `Cache-Control: no-store` |
| BT-051 | Início do login: sem configuração; com configuração; `voltar` inválido | GET /api/auth/google | 404 `login_indisponivel` / 302 com `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge` S256 e cookie de login `HttpOnly` `SameSite=Lax` / `voltar` vira `/` |
| BT-052 | Callback feliz (provedor falso); segundo login | GET callback | Usuário criado; sessão com hash (token não está no banco); cookie de sessão; 302 para `voltar`; e-mail/nome atualizados sem duplicar |
| BT-053 | Callback com `error`, sem cookie, `state` errado, troca falhando | GET callback | 302 `/conta?erro=login`; nenhuma sessão |
| BT-054 | Token desconhecido; sessão vencida | GET /api/sessao, /api/historico | `usuario` null; 401; sessão vencida apagada |
| BT-055 | Sair com e sem sessão | DELETE /api/sessao | 204; sessão apagada; cookie expirado |
| BT-056 | Histórico sem sessão | GET/POST/DELETE /api/historico | 401 `nao_autenticado` |
| BT-057 | Gravar: novas, repetida (não altera), ordem, limite 50, inválidas em `rejeitadas`, 0/51 entradas, campo extra, entrada sem `assunto` | POST /api/historico | Conforme §2.4 |
| BT-058 | Ownership: B não vê nem apaga o de A | GET/DELETE /api/historico | Listas separadas |
| BT-059 | Limpar | DELETE /api/historico | 204; lista vazia; outro usuário intacto |
| BT-060 | Excluir conta | DELETE /api/conta | 204; usuário, sessões e histórico apagados; cookie expirado |
| BT-061 | `Origin` diferente; igual; ausente | POST/DELETE | 403 / segue / segue |
| BT-062 | Provedor Google: URL de autorização; `id_token` válido; `iss`/`aud`/`exp` errados; sem `sub`/`email`; resposta sem `id_token`; erro HTTP | `services/google` (sem rede) | Identidade / `ErroLoginGoogle` |
| BT-063 | Limite do login | GET /api/auth/google ×21 | 429 |
| BT-064 | Cookies em produção | `ENVIRONMENT=production` | `__Host-sessao`, `Secure` |
| BT-065 | Login desligado com sessão existente | GET /api/sessao, /api/historico, DELETE /api/conta | Usuário continua; 200/204; `/api/auth/google` 404 |
| BT-066 | Produção sem `PUBLIC_URL` https | `criar_app` | Provedor `None` + log de erro |
| BT-067 | Primeiro login simultâneo; falha de rede na troca; `azp` | `contas.entrar`, `services/google` | Um usuário só; `ErroLoginGoogle`; recusa com `azp` de outro cliente |
| BT-047 | Migrations `002` → `003` → `002` | alembic | Tabelas criadas e removidas; models em sincronia |
| UT-030 | `sincronizarHistorico`: primeiro login envia o local; marca evita reenvio; removida em outro dispositivo sai; marca de outra conta não vai para a nova; erro de rede não muda nada; rejeitadas ficam locais; limite 50 | `sincronizacao` | Estados esperados |
| UT-031 | `historicoSemConta` e `apagarHistoricoDoNavegador` | `sincronizacao` | Espelho removido, pendentes mantidas / tudo removido |
| UT-032 | Resposta 204 sem corpo | `api` | `undefined`, sem erro |
| UT-033 | Cabeçalho: "Entrar"; primeiro nome; login indisponível; "Privacidade" no rodapé | `Layout` | Links esperados |
| UT-034 | Conta: sem conta (botão com `voltar`), erro de login, com conta, sair (D2), excluir com confirmação | `ContaPage` | Textos, chamadas e `localStorage` esperados |
| UT-035 | Histórico e painel com conta: aviso da conta, lista sincronizada, limpar na conta | `HistoricoPage`, `DesempenhoPage` | Textos e chamadas esperados |
| UT-036 | Finalizar com conta envia a entrada; resultado espera a sincronização | `useFinalizarSimulado`, `ResultadoPage` | `POST /api/historico` com a entrada; `Carregando` → resultado |
| UT-037 | Fila: operação exclusiva espera a sincronização; recusadas não reenviadas na mesma carga; "Sair" mantém as recusadas; conectado com login desligado | `sincronizacao`, `ContaPage` | Ordem e estados esperados |
| FT-013 | Local, provedor falso: anônimo finaliza → Entrar → histórico vai para a conta → "outro dispositivo" (contexto limpo) entra e vê histórico e painel → Sair apaga o navegador → Excluir conta; 360 px sem rolagem horizontal; console limpo | E2E (Playwright MCP) | Conforme §2.4 |
| FT-014 | Produção: login real com Google e sincronização entre dois navegadores (com o usuário) | E2E manual | Histórico igual nos dois |

---

## 7. Checklist de Implementação

- [x] Banco: migration `003` + models
- [x] Login e sessão: provedor, cookies, endpoints, dependências
- [x] Histórico no servidor
- [x] Frontend: tipos, api, sessão, sincronização (com fila)
- [x] Frontend: cabeçalho, `/conta`, `/privacidade`, Histórico, painel, resultado, finalizar
- [x] Testes BT-047, BT-050 a BT-067, UT-030 a UT-037 + FT-013
- [x] Cliente OAuth no Google Cloud + variáveis na Railway (usuário) + FT-014 (01/10/2026)

---

## 8. Login obrigatório (CR-006)

Desde o CR-006 (RN-017, ADR-012), usar o site exige sessão. Esta seção complementa as anteriores; onde elas dizem "sem conta, o site funciona como antes", vale o modo `livre` abaixo, que só existe fora de produção.

### 8.1 Modo de acesso

| Modo | Quando | API de conteúdo | Interface |
|------|--------|-----------------|-----------|
| `conta` | Provedor Google configurado | Exige sessão: sem ela, 401 `nao_autenticado` | Sem login: apresentação, Privacidade e Conta; o resto leva à apresentação |
| `indisponivel` | Sem provedor, `ENVIRONMENT=production` (variável ausente, ou `PUBLIC_URL` sem https) | 503 `site_indisponivel` ("O site está temporariamente indisponível.") para todos, com ou sem sessão | "Temporariamente indisponível" no início e nas rotas protegidas; Conta e Privacidade abrem (quem já entrou ainda pode sair e excluir a conta) |
| `livre` | Sem provedor, fora de produção (desenvolvimento, testes, CI) | Aberta, como antes do CR-006 | Como antes do CR-006 |

- **Backend:** `modo_de_acesso(request)` em `app/dependencias.py` (tipo `ModoAcesso` em `schemas.py`); `exigir_acesso` (dependência dos routers de catálogo, simulados, questões, correções e reportes) aplica a tabela e só consulta a sessão no modo `conta`. Os POSTs de conteúdo (simulados, correções, reportes) também passam por `verificar_origem` (403 `origem_invalida`), como as rotas de conta. Erros de acesso vêm antes da validação do corpo (401/503 antes de 422).
- **Públicos em qualquer modo:** `/api/health`, `/api/vitrine` (só os totais da base, §9 — emenda do CR-007 à D2 do CR-006), `/figuras/...`, `/api/auth/google`, o callback, `GET`/`DELETE /api/sessao`; `/api/historico` e `/api/conta` seguem exigindo sessão (§2.5).
- **`GET /api/sessao`** devolve o modo em `acesso`.
- Os reportes exigem sessão, mas não gravam quem reportou (RNF-005).

### 8.2 Interface

- **`RequerConta`** (`components/RequerConta.tsx`) envolve todas as rotas, menos `/`, `/conta`, `/privacidade` e a página não encontrada; `/simulado` (fora do `Layout`) também. Comportamento:
  - Sessão carregando → `Carregando`.
  - Erro ao buscar a sessão (rede) → mostra a página: a API continua protegida, e um estudante no meio de uma prova não é barrado por uma falha momentânea.
  - `acesso: 'indisponivel'` → `SiteIndisponivel`.
  - `acesso: 'conta'` sem usuário → `semConta` se foi passado (o início passa a apresentação); senão `<Navigate replace to="/?voltar=<rota>">`.
  - Demais casos → a página.
- **Início (`/`):** `<RequerConta semConta={<ApresentacaoPage />}><HomePage /></RequerConta>`.
- **`ApresentacaoPage`:** `h1` "Treine com questões reais da 1ª fase da FUVEST"; texto curto do que o site faz (simulados com questões oficiais de anos anteriores, correção na hora, desempenho por disciplina e por assunto); com `?voltar=` diferente de `/`, o aviso "Entre com a sua conta Google para continuar."; `BotaoGoogle` com o `voltar` da URL (só se começar com `/` e não com `//`; senão `/`); os 4 modos em texto fixo; "Para usar o site, entre com a sua conta Google. Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos." + link Privacidade. Nenhum dado da base (o catálogo é protegido). Título da aba: "Simulado Fuvest". **Desde o CR-007 (§9.2):** números da base pela vitrine, prévia do produto, modos em cartões, botão de 52 px e o aviso começando por "É grátis."; o catálogo continua protegido.
- **`SiteIndisponivel`** (`components/Estados.tsx`): `h1` "Site temporariamente indisponível" e "Tente de novo em alguns minutos."
- **Cabeçalho:** "Desempenho" e "Histórico" só aparecem com acesso ao conteúdo (`livre`, ou `conta` com usuário). Sem login, só "Entrar"; com `indisponivel`, só o nome de quem está conectado (que leva à Conta) ou nada. Enquanto a sessão carrega, como antes.
- **Sessão que acaba no meio do uso, ou site que fecha:** o `requisitar` (`services/api.ts`) avisa (`definirAoErroDeAcesso`) em qualquer 401 `nao_autenticado` ou 503 `site_indisponivel`, inclusive nas chamadas feitas fora do React Query (Treino, reporte); o `criarQueryClient` (`queryClient.ts`) registra o tratamento, que recarrega a sessão. O `RequerConta` leva então à apresentação com `?voltar=` (e o login volta à página) ou mostra o aviso. O simulado em andamento continua no `localStorage`.
- **Sessão com erro de rede:** `useSessao` usa `retryOnMount: false`. Sem isso, cada componente que monta refaria a busca, a sessão voltaria a "carregando", e o `RequerConta` desmontaria e remontaria a página sem fim. Ela volta sozinha quando a conexão retorna (`refetchOnReconnect`), num 401/503 ou ao recarregar.
- **Textos:** início com login, "O simulado em andamento fica salvo neste navegador." no lugar de "Não precisa criar conta…"; Conta sem login, "Entre com a sua conta Google para usar o site. O histórico fica na sua conta e aparece em qualquer dispositivo. Os simulados já feitos neste navegador vão para a sua conta."; Privacidade, a seção "Sem conta" vira "Sem entrar": só a apresentação e a Privacidade abrem, nenhum dado vai para o servidor e nenhum cookie é criado.

### 8.3 Casos de borda

| # | Cenário | Comportamento Esperado |
|---|---------|------------------------|
| 18 | Link direto (`/resultado/:id`) sem login | Apresentação com "Entre… para continuar"; depois do login, o resultado |
| 19 | Simulado em andamento de antes do CR-006, sem conta | `/simulado` leva ao login; depois, a prova continua com as respostas salvas |
| 20 | Variável do Google removida em produção | 503 na API de conteúdo; "temporariamente indisponível" no site; quem já entrou ainda sai e exclui a conta |
| 21 | Sessão vence durante uma prova | A próxima chamada (questões, correção) dá 401 → sessão recarregada → login → volta a `/simulado`; nada se perde |
| 22 | Falha de rede ao verificar a sessão | A página abre; as chamadas à API falham como qualquer erro de rede |

### 8.4 Plano de testes

| ID | Cenário | Alvo | Esperado |
|----|---------|------|----------|
| BT-070 | Sem sessão, com login configurado | GET /api/catalogo, POST /api/simulados, GET /api/questoes, POST /api/correcoes, POST /api/reportes | 401 `nao_autenticado` (antes do 422) |
| BT-071 | Com sessão | Os mesmos | Respostas de antes do CR-006 |
| BT-072 | Produção sem login configurado | Os mesmos + GET /api/sessao | 503 `site_indisponivel` (com ou sem sessão); `acesso: 'indisponivel'` |
| BT-073 | Fora de produção sem login configurado | Os mesmos + GET /api/sessao | Abertos; `acesso: 'livre'` |
| BT-074 | Públicos com login configurado e sem sessão | /api/health, /figuras, /api/sessao, /api/auth/google | 200/302 |
| BT-075 | POST de conteúdo com `Origin` de outro site | POST /api/simulados, /api/correcoes, /api/reportes | 403 `origem_invalida` |
| UT-040 | `RequerConta`: conta sem usuário (redireciona com `voltar`), com usuário, livre, indisponível, sessão carregando e com erro | Rotas | Página / apresentação / indisponível / carregando |
| UT-041 | Apresentação: texto, botão com o `voltar` da URL (e `voltar` inválido vira `/`), Privacidade aberta; cabeçalho só com "Entrar" | `ApresentacaoPage`, `Layout` | Textos e links |
| UT-042 | 401 numa query e numa chamada direta (Treino); 503 com o site aberto; cabeçalho com o site indisponível | `services/api`, `criarQueryClient`, `Layout` | Sessão recarregada → apresentação com `voltar` / aviso de indisponível; só o nome no cabeçalho |
| FT-015 | Local com provedor falso: sem login, `/historico` → apresentação → login → `/historico`; API sem cookie → 401; sair → rotas voltam à apresentação; produção sem provedor → indisponível e 503; 360 px; console limpo | E2E (Playwright MCP) | Conforme §8.1–8.2 |

### 8.5 Checklist (CR-006)

- [x] Backend: `modo_de_acesso`, `exigir_acesso`, `acesso` na sessão, routers de conteúdo (+ `Origin` nos POSTs)
- [x] Frontend: `RequerConta`, apresentação, indisponível, cabeçalho, 401/503 em qualquer chamada, textos
- [x] CI: smoke test do Docker confere 503 em produção sem login
- [x] Testes BT-070 a BT-075, UT-040 a UT-042 + FT-015

---

## 9. Vitrine e apresentação (CR-007)

Desde o CR-007 (D1, emenda à D2 do CR-006), a apresentação mostra os números da base, que vêm de um endpoint público só com os totais. Na apresentação, esta seção substitui o "Nenhum dado da base" do §8.2. O catálogo, a geração, as questões, a correção e os reportes continuam exigindo sessão (§8.1).

### 9.1 `GET /api/vitrine`

- Router `app/routers/vitrine.py`, **sem** `exigir_acesso`: público em qualquer modo de acesso (`conta`, `livre`, `indisponivel`), como o `/api/health`. Sem rate limit (duas consultas agregadas leves, como o health). Não lê nem cria cookie.
- Serviço `obter_vitrine(sessao)` em `services/catalogo.py`:
  - `total_questoes`: questões **não anuladas**, o mesmo `total_questoes` do catálogo (e do "270 questões de 3 provas" do início com login)
  - `anos`: anos das provas sincronizadas, em ordem crescente. Cada prova é um ano, então o número de provas é `len(anos)`

```python
class VitrineResponse(BaseModel):
    total_questoes: int
    anos: list[int]
```

```ts
export interface Vitrine { total_questoes: number; anos: number[] }  // api.vitrine(), useVitrine()
```

- Exemplo (produção em 01/10/2026): `{"total_questoes": 270, "anos": [2023, 2024, 2025]}`. Base vazia: `{"total_questoes": 0, "anos": []}`.
- Mais nada: nem ids, nem texto, nem disciplinas ou assuntos. Um campo novo aqui é decisão de produto (emenda à D2), e não detalhe de implementação.

### 9.2 Apresentação (`ApresentacaoPage`)

Protótipo: telas "Apresentação · desktop" e "Apresentação · celular" do canvas "Protótipo Simulado Fuvest". O que elas mostram além dos itens O1.1 a O1.4 fica fora (CR-007 §4.3).

- **Desktop (≥ 1024 px):** duas colunas, com o texto à esquerda (até 520 px) e a `PreviaProduto` à direita. Abaixo, "Quatro jeitos de treinar" em 4 colunas.
- **Abaixo de 1024 px:** uma coluna (texto até 672 px); a prévia vem depois do aviso, e os modos em lista.

**Coluna de texto, na ordem:**
1. `h1` e subtítulo, sem mudança (§8.2).
2. **Números (O1.1)**, por `useVitrine` (`staleTime: Infinity`: os totais só mudam com um deploy), só quando a vitrine responde com `anos.length > 0`. `<dl>` com três pares, o rótulo (`dt`) antes do número (`dd`) no DOM e abaixo dele na tela (`flex-col-reverse`):

   | Número | Rótulo (≥ 640 px) | Rótulo (< 640 px) |
   |--------|-------------------|-------------------|
   | `total_questoes` | "questões reais" | "questões reais" |
   | `anos.length` | "provas completas" ("prova completa" com 1) | "provas" ("prova") |
   | período | "anos na base" ("ano na base" com 1) | "anos" ("ano") |

   Período: `min–max` com meia-risca ("2023–2025"); abaixo de 640 px, o ano final com dois dígitos ("2023–25"); com um ano só, "2025". Números com `tabular-nums`. Abaixo de 640 px, três cartões brancos lado a lado (`repeat(3, 1fr)`: o mínimo de cada um é o conteúdo, e o período não quebra em 320 px); a partir de 640 px, em linha, com divisórias. Enquanto carrega, com erro ou com a base vazia, o bloco não aparece (nunca "0"), e a página não espera a vitrine.
3. Com `?voltar=` diferente de `/`, o aviso "Entre com a sua conta Google para continuar.", como antes.
4. `BotaoGoogle` com 52 px de altura (O1.4). É o mesmo botão da página Conta, que também fica com 52 px.
5. Aviso (O1.4): "É grátis. Guardamos só seu nome, seu e-mail e os resultados dos simulados concluídos." + link Privacidade.

**`PreviaProduto` (O1.2)** (`components/apresentacao/PreviaProduto.tsx`): HTML/CSS com os tokens do site, sem captura de tela nem chamada à API.
- Texto para leitor de tela (`sr-only`): "Prévia da tela de resolução: uma questão de História da FUVEST 2025 com a alternativa B marcada, o cronômetro, a folha de respostas e os botões Anterior, Revisar e Próxima."
- Miniatura (`aria-hidden`): barra do topo com "FUVEST 2025" (só a partir de 1024 px), o cronômetro "04:52:10" e "Folha 12/90"; "Questão 13 de 90" e "História · FUVEST 2025 (questão 13)"; o enunciado da questão 13 de 2025 na fonte de leitura; as alternativas A, B (marcada, como na resolução) e C, cortadas com reticências; e a barra inferior com "‹ Anterior", "Revisar" e "Próxima ›" (azul). O texto vem do pacote `data/provas/2025/prova.yaml`.
- A coluna da prévia tem 616 px de altura entre 1024 e 1279 px e 584 px a partir daí, para o cartão de resultado ficar abaixo da alternativa marcada.
- Cartão de resultado sobreposto (só a partir de 1024 px, embaixo e à esquerda da coluna): "Resultado", "58 de 90 acertos" e as barras de Inglês 40%, História 53%, Geografia 77% e Física 100% (números ilustrativos). Tem o próprio texto para leitor de tela: "Ao lado, o desempenho por disciplina de um resultado."

**Identidade (CR-008):** o `h1` em Fraunces com o círculo de caneta em "reais" (`aria-hidden`; o nome do título não muda); os números da vitrine em `font-titulo`; os cartões dos modos com `CARTAO` (16 px, sem sombra) e os títulos em `font-titulo`; na prévia, o número da questão numa bolinha e o cronômetro em `font-titulo`, como na resolução nova.

**Modos (O1.3):** `h2` "Quatro jeitos de treinar" (como hoje) e os 4 modos em cartões (`li` com borda, fundo branco e cantos arredondados). Cada um tem uma bolinha da folha (letra A–D em `optico-texto`, borda `optico`, `aria-hidden`), o `h3` e a descrição. A partir de 1024 px, 4 colunas, com a bolinha acima do título; abaixo disso, lista, com a bolinha à esquerda.

### 9.3 Casos de borda

| # | Cenário | Comportamento esperado |
|---|---------|------------------------|
| 23 | Vitrine fora do ar ou com erro | Apresentação completa, sem os números |
| 24 | Base vazia (nenhuma prova sincronizada) | Vitrine `{"total_questoes": 0, "anos": []}`; apresentação sem os números |
| 25 | Uma prova só | "1 prova completa" e o período "2025" |
| 26 | Questões anuladas | Ficam fora de `total_questoes`, como no catálogo |
| 27 | Produção sem login configurado (`indisponivel`) | A vitrine responde; o início mostra o aviso de indisponível, e não a apresentação |

### 9.4 Plano de testes

| ID | Cenário | Alvo | Esperado |
|----|---------|------|----------|
| BT-076 | Vitrine com a base sintética | GET /api/vitrine | `total_questoes` igual ao do catálogo (sem anuladas); `anos` em ordem crescente |
| BT-077 | Vitrine pública: com login configurado e sem sessão; em produção sem login | GET /api/vitrine | 200, só os dois campos, sem `Set-Cookie` |
| BT-078 | Vitrine com a base vazia | GET /api/vitrine | `{"total_questoes": 0, "anos": []}` |
| UT-043 | Apresentação com a vitrine: números e rótulos; um ano só; vitrine com erro e base vazia (sem números); aviso "É grátis." | `ApresentacaoPage` | Textos esperados |
| UT-044 | Prévia `aria-hidden` com a descrição para leitor de tela; modos em cartões com as letras A–D | `ApresentacaoPage`, `PreviaProduto` | Estrutura acessível |
| FT-021 | Apresentação em 1440, 1024, 390 e 320 px (números do servidor, prévia, cartões, sem rolagem horizontal nem sobreposição); menu do celular e barra opaca (`specs/03`); console limpo | E2E (Playwright MCP) | Conforme §9.2 e `specs/03` |

### 9.5 Checklist (CR-007)

- [x] Backend: `GET /api/vitrine` + smoke test do CI
- [x] Frontend: `useVitrine` e a apresentação (números, prévia, modos, botão e aviso)
- [x] Testes BT-076 a BT-078, UT-043 e UT-044 + FT-021
