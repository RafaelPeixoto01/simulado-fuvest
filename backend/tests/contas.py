"""Apoio aos testes de conta (CR-005): provedor Google falso, login e entradas de historico."""

from urllib.parse import parse_qs, urlsplit

from app.services.google import ErroLoginGoogle, IdentidadeGoogle

ANA = IdentidadeGoogle(sub="sub-ana", email="ana@exemplo.com", nome="Ana Souza")
BETO = IdentidadeGoogle(sub="sub-beto", email="beto@exemplo.com", nome=None)


class ProvedorFalso:
    """Mesma interface do ProvedorGoogle; o `code` escolhe a identidade."""

    def __init__(self):
        self.identidades = {"codigo-ana": ANA, "codigo-beto": BETO}
        self.trocas: list[tuple[str, str, str]] = []

    def url_autorizacao(self, *, redirect_uri: str, state: str, code_challenge: str) -> str:
        return f"https://google.test/auth?state={state}&code_challenge={code_challenge}"

    def trocar_codigo(self, *, code: str, code_verifier: str, redirect_uri: str):
        self.trocas.append((code, code_verifier, redirect_uri))
        if code not in self.identidades:
            raise ErroLoginGoogle("codigo desconhecido")
        return self.identidades[code]


def iniciar(client, voltar: str | None = "/conta"):
    params = {"voltar": voltar} if voltar is not None else {}
    return client.get("/api/auth/google", params=params, follow_redirects=False)


def state_de(resposta) -> str:
    return parse_qs(urlsplit(resposta.headers["location"]).query)["state"][0]


def entrar(client, code: str = "codigo-ana", voltar: str = "/conta"):
    """Login completo pelo TestClient (o cookie de login fica no cookie jar dele)."""
    state = state_de(iniciar(client, voltar))
    return client.get(
        "/api/auth/google/callback",
        params={"code": code, "state": state},
        follow_redirects=False,
    )


def entrada_historico(
    ident: str = "sim-1", finalizado: int = 1_000_000, *, com_assunto: bool = True
) -> dict:
    """HistoricoEntry como o navegador grava (specs/04 §2.2)."""
    item = {
        "questao_id": "2099-001",
        "resposta": "A",
        "correta": "B",
        "anulada": False,
        "acertou": False,
        "disciplina": "fisica",
    }
    disciplina = {"disciplina": "fisica", "total": 1, "acertos": 0, "percentual": 0.0}
    if com_assunto:
        item["assunto"] = "optica"
        disciplina["assuntos"] = [
            {"assunto": "optica", "nome": "Óptica", "total": 1, "acertos": 0, "percentual": 0.0}
        ]
    return {
        "versao": 1,
        "id": ident,
        "modo": "ano",
        "descricao": "Prova de 2099",
        "iniciadoEm": max(0, finalizado - 60_000),
        "finalizadoEm": finalizado,
        "tempoGastoMs": 60_000,
        "tempoLimiteS": 18_000,
        "finalizadoPorTempo": False,
        "questaoIds": ["2099-001"],
        "resultado": {
            "itens": [item],
            "total": 1,
            "acertos": 0,
            "percentual": 0.0,
            "por_disciplina": [disciplina],
            "ignoradas": [],
        },
    }
