"""Configuracao via variaveis de ambiente (02-ARCHITECTURE §9.3).

Nao ha arquivo .env: todo default e local e seguro (SQLite), entao nenhum comando
local atinge producao por acidente (ADR-008, licao do CR-049 do Meu Controle).
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

RAIZ_PROJETO = Path(__file__).resolve().parents[2]
RAIZ_BACKEND = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./local.db"
    data_dir: Path = field(default_factory=lambda: RAIZ_PROJETO / "data" / "provas")
    # Build do SPA (Dockerfile copia frontend/dist para ca); ausente em dev
    static_dir: Path = field(default_factory=lambda: RAIZ_BACKEND / "static")
    environment: str = "development"
    allowed_origins: tuple[str, ...] = ("http://localhost:5173",)
    # Login com Google (CR-005, ADR-010): sem os dois, o login fica desligado
    google_client_id: str | None = None
    google_client_secret: str | None = None  # segredo: so em variavel da Railway
    # Origem publica do site: monta o redirect_uri e e o unico Origin aceito com cookie
    public_url: str = "http://localhost:5173"
    # Area de gestao (CR-013, ADR-016): `sub` das contas Google de administrador. Vazio: a
    # area nao existe. Pelo sub, nunca pelo e-mail (o login nao exige email_verified)
    admin_google_subs: frozenset[str] = frozenset()

    @property
    def producao(self) -> bool:
        return self.environment == "production"

    def eh_admin(self, google_sub: str) -> bool:
        """Administrador pelo `sub` da conta Google, nunca pelo e-mail (RN-020, ADR-016)."""
        return google_sub in self.admin_google_subs

    @property
    def login_disponivel(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        env = os.environ if env is None else env
        padrao = cls()
        origens = env.get("ALLOWED_ORIGINS")
        return cls(
            database_url=env.get("DATABASE_URL", padrao.database_url),
            data_dir=Path(env["DATA_DIR"]) if env.get("DATA_DIR") else padrao.data_dir,
            static_dir=Path(env["STATIC_DIR"]) if env.get("STATIC_DIR") else padrao.static_dir,
            environment=env.get("ENVIRONMENT", padrao.environment),
            allowed_origins=(
                tuple(o.strip() for o in origens.split(",") if o.strip())
                if origens
                else padrao.allowed_origins
            ),
            google_client_id=env.get("GOOGLE_CLIENT_ID") or None,
            google_client_secret=env.get("GOOGLE_CLIENT_SECRET") or None,
            public_url=(env.get("PUBLIC_URL") or padrao.public_url).rstrip("/"),
            admin_google_subs=frozenset(
                sub.strip() for sub in env.get("ADMIN_GOOGLE_SUBS", "").split(",") if sub.strip()
            ),
        )
