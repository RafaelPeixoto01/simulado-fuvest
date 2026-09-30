from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao
from app.rate_limit import limite_excedido, limiter
from app.routers import catalogo, correcoes, health, questoes, simulados


def criar_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    app = FastAPI(title="Simulado Fuvest")

    engine = criar_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.fabrica_sessao = criar_fabrica_sessao(engine)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, limite_excedido)

    app.include_router(health.router)
    app.include_router(catalogo.router)
    app.include_router(simulados.router)
    app.include_router(questoes.router)
    app.include_router(correcoes.router)
    return app


app = criar_app()
