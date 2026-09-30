"""Configuracao via variaveis de ambiente (02-ARCHITECTURE §9.3).

Nao ha arquivo .env: todo default e local e seguro (SQLite), entao nenhum comando
local atinge producao por acidente (ADR-008, licao do CR-049 do Meu Controle).
"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

RAIZ_PROJETO = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./local.db"
    data_dir: Path = field(default_factory=lambda: RAIZ_PROJETO / "data" / "provas")
    environment: str = "development"
    allowed_origins: tuple[str, ...] = ("http://localhost:5173",)

    @property
    def producao(self) -> bool:
        return self.environment == "production"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        env = os.environ if env is None else env
        padrao = cls()
        origens = env.get("ALLOWED_ORIGINS")
        return cls(
            database_url=env.get("DATABASE_URL", padrao.database_url),
            data_dir=Path(env["DATA_DIR"]) if env.get("DATA_DIR") else padrao.data_dir,
            environment=env.get("ENVIRONMENT", padrao.environment),
            allowed_origins=(
                tuple(o.strip() for o in origens.split(",") if o.strip())
                if origens
                else padrao.allowed_origins
            ),
        )
