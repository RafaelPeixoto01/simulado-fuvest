from fastapi import FastAPI

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao
from app.routers import catalogo, health


def criar_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    app = FastAPI(title="Simulado Fuvest")

    engine = criar_engine(settings.database_url)
    app.state.settings = settings
    app.state.engine = engine
    app.state.fabrica_sessao = criar_fabrica_sessao(engine)

    app.include_router(health.router)
    app.include_router(catalogo.router)
    return app


app = criar_app()
