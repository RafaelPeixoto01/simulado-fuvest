import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao
from app.rate_limit import limite_excedido, limiter
from app.routers import (
    auth,
    catalogo,
    conta,
    correcoes,
    figuras,
    health,
    historico,
    questoes,
    reportes,
    simulados,
    vitrine,
)
from app.security_headers import SecurityHeadersMiddleware
from app.services.google import ProvedorGoogle

log = logging.getLogger(__name__)


def _servir_spa(app: FastAPI, settings: Settings) -> None:
    """Build do SPA: /assets estatico e qualquer rota fora de /api cai no index.html."""
    static = settings.static_dir
    if not (static / "index.html").is_file():
        return  # dev: o Vite serve o frontend
    if (static / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=static / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def spa(caminho: str) -> FileResponse:
        if caminho == "api" or caminho.startswith("api/"):
            raise HTTPException(404)  # API inexistente nao cai no SPA
        arquivo = (static / caminho).resolve()
        if caminho and arquivo.is_file() and arquivo.is_relative_to(static.resolve()):
            return FileResponse(arquivo)  # ex.: favicon
        return FileResponse(static / "index.html")


def _provedor_google(settings: Settings) -> ProvedorGoogle | None:
    """None desliga o login (ADR-010). Em producao, PUBLIC_URL sem https (variavel esquecida
    ou errada) quebraria o redirect_uri e a verificacao de Origin: o login fica desligado e
    o motivo vai para o log, sem derrubar o site."""
    if not settings.login_disponivel:
        return None
    if settings.producao and not settings.public_url.startswith("https://"):
        log.error(
            "Login com Google desligado: PUBLIC_URL precisa ser https em producao (%s)",
            settings.public_url,
        )
        return None
    return ProvedorGoogle(settings.google_client_id, settings.google_client_secret)


def criar_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    sem_docs = {"docs_url": None, "redoc_url": None, "openapi_url": None}
    app = FastAPI(title="Simulado Fuvest", **(sem_docs if settings.producao else {}))

    engine = criar_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.fabrica_sessao = criar_fabrica_sessao(engine)
    # Login com Google (ADR-010): None desliga o login; testes trocam por um provedor falso
    app.state.provedor_google = _provedor_google(settings)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, limite_excedido)

    app.add_middleware(SecurityHeadersMiddleware, producao=settings.producao)
    if not settings.producao:
        # Em producao o SPA e servido pela propria API: sem CORS (ADR-001)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.allowed_origins),
            allow_methods=["GET", "POST", "DELETE"],
            allow_headers=["Content-Type"],
        )

    for modulo in (
        health, vitrine, catalogo, simulados, questoes, correcoes, reportes, auth, conta, historico,
        figuras,
    ):
        app.include_router(modulo.router)
    _servir_spa(app, settings)
    return app


app = criar_app()
