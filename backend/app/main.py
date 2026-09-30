from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao
from app.rate_limit import limite_excedido, limiter
from app.routers import catalogo, correcoes, figuras, health, questoes, reportes, simulados
from app.security_headers import SecurityHeadersMiddleware


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


def criar_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    sem_docs = {"docs_url": None, "redoc_url": None, "openapi_url": None}
    app = FastAPI(title="Simulado Fuvest", **(sem_docs if settings.producao else {}))

    engine = criar_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.fabrica_sessao = criar_fabrica_sessao(engine)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, limite_excedido)

    app.add_middleware(SecurityHeadersMiddleware, producao=settings.producao)
    if not settings.producao:
        # Em producao o SPA e servido pela propria API: sem CORS (ADR-001)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.allowed_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    for modulo in (health, catalogo, simulados, questoes, correcoes, reportes, figuras):
        app.include_router(modulo.router)
    _servir_spa(app, settings)
    return app


app = criar_app()
