# Serviço único na Railway (ADR-001): o FastAPI serve a API, as figuras e o SPA.

# Stage 1: build do SPA
FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend + build do SPA + pacotes de provas (fonte da verdade, ADR-002)
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DATA_DIR=/app/data/provas \
    STATIC_DIR=/app/backend/static
WORKDIR /app/backend

# Só as dependências de produção: as libs de PDF (ingestão) ficam fora da imagem
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY data/provas /app/data/provas
COPY --from=frontend /app/frontend/dist ./static

EXPOSE 8000

# 1) migrations  2) banco = pacotes publicados do repositório  3) servidor
# --proxy-headers: IP real atrás do proxy da Railway (rate limit por IP). A Railway
# injeta PORT; 8000 é o padrão local.
CMD ["sh", "-c", "python -m alembic upgrade head && python -m app.pacote.sincronizar && exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
