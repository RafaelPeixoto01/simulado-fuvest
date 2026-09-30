"""Rate limit por IP (RNF-004), mesmo padrao do Meu Controle (CR-044).

Instancia unica usada no registro em app.main e nos decorators dos endpoints.
Storage em memoria: producao roda 1 worker uvicorn; reseta a cada deploy.
O IP real vem do X-Forwarded-For (uvicorn --proxy-headers atras do proxy da Railway).
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


def limite_excedido(_request: Request, _erro: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Muitas requisições. Tente novamente em instantes."},
    )
