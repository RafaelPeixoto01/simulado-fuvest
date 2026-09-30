"""Headers de seguranca HTTP em todas as respostas (specs/03-SPEC §3.4)."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, producao: bool):
        super().__init__(app)
        self.producao = producao

    async def dispatch(self, request: Request, call_next):
        resposta = await call_next(request)
        resposta.headers["X-Content-Type-Options"] = "nosniff"
        resposta.headers["X-Frame-Options"] = "DENY"
        resposta.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resposta.headers["Content-Security-Policy"] = CSP
        if self.producao:  # HSTS so faz sentido sob HTTPS
            resposta.headers["Strict-Transport-Security"] = "max-age=31536000"
        return resposta
