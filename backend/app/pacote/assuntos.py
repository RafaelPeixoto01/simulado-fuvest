"""Taxonomia de assuntos por disciplina: `data/provas/assuntos.yaml` (ADR-009, specs/06).

Conteudo versionado como os pacotes: a validacao (V11), a sincronizacao e a CLI usam
a carga estrita; a API usa a carga tolerante, com cache pelo mtime do arquivo.
"""

import logging
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, RootModel, ValidationError, model_validator

from app.disciplinas import Disciplina

ARQUIVO_TAXONOMIA = "assuntos.yaml"
MAX_ASSUNTOS = 20  # a taxonomia aprovada tem de 11 a 14 (5 em Ingles)

log = logging.getLogger("assuntos")


class Assunto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(pattern=r"^[a-z0-9-]+$", max_length=40)
    nome: str = Field(min_length=1, max_length=60)


class Taxonomia(RootModel[dict[Disciplina, list[Assunto]]]):
    @model_validator(mode="after")
    def _consistente(self) -> "Taxonomia":
        faltando = [d.value for d in Disciplina if d not in self.root]
        if faltando:
            raise ValueError(f"disciplinas sem assuntos: {', '.join(faltando)}")
        for disciplina, assuntos in self.root.items():
            if not 1 <= len(assuntos) <= MAX_ASSUNTOS:
                raise ValueError(f"{disciplina.value}: de 1 a {MAX_ASSUNTOS} assuntos")
            for campo in ("slug", "nome"):
                valores = [getattr(a, campo) for a in assuntos]
                repetidos = sorted({v for v in valores if valores.count(v) > 1})
                if repetidos:
                    raise ValueError(f"{disciplina.value}: {campo} repetido: {', '.join(repetidos)}")
        return self

    def assuntos(self, disciplina: Disciplina) -> list[Assunto]:
        return self.root.get(disciplina, [])

    def nome(self, disciplina: Disciplina | str, slug: str) -> str | None:
        return next((a.nome for a in self.assuntos(Disciplina(disciplina)) if a.slug == slug), None)

    def contem(self, disciplina: Disciplina | str, slug: str) -> bool:
        return self.nome(disciplina, slug) is not None


class TaxonomiaInvalida(Exception):
    """Arquivo ausente, YAML malformado ou fora do schema."""

    def __init__(self, caminho: Path, detalhe: str):
        super().__init__(f"{caminho}: {detalhe}")
        self.caminho = caminho
        self.detalhe = detalhe


def carregar_taxonomia(data_dir: Path) -> Taxonomia:
    caminho = data_dir / ARQUIVO_TAXONOMIA
    try:
        dados = yaml.safe_load(caminho.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as erro:
        raise TaxonomiaInvalida(caminho, str(erro)) from erro
    try:
        return Taxonomia.model_validate(dados)
    except ValidationError as erro:
        raise TaxonomiaInvalida(caminho, str(erro)) from erro


@lru_cache(maxsize=4)
def _carregar_em_cache(caminho: Path, _mtime_ns: int) -> Taxonomia | None:
    try:
        return carregar_taxonomia(caminho.parent)
    except TaxonomiaInvalida as erro:
        log.warning("Taxonomia indisponível: %s", erro)
        return None


def taxonomia_em_uso(data_dir: Path) -> Taxonomia | None:
    """Para a API: None se o arquivo faltar ou for invalido (a sincronizacao ja barra isso)."""
    caminho = data_dir / ARQUIVO_TAXONOMIA
    try:
        mtime = caminho.stat().st_mtime_ns
    except OSError:
        return None
    return _carregar_em_cache(caminho, mtime)
