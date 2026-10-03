"""Notas de corte da 1a fase por carreira: `data/provas/notas_corte/AAAA.yaml` (ADR-014, specs/08).

Conteudo versionado como a taxonomia de assuntos (ADR-009): a CLI (`validar`, CI) usa a carga
estrita; a API usa a carga tolerante, so com os anos publicados e sem problema, com cache pelo
mtime dos arquivos. As notas de corte nao vao para o banco.
"""

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

DIRETORIO_NOTAS_CORTE = "notas_corte"
MINIMO_FUVEST = 27  # menos de 30% da 1a fase elimina (Resolucao FUVEST 2025, art. 11 par. 3)
PONTOS_PROVA = 90
CHAVES_MODALIDADES = ("ac", "ep", "ppi")
PADRAO_FONTE = r"^https://www\.fuvest\.br/\S+\.pdf$"  # PDF do acervo oficial

log = logging.getLogger("notas_corte")


class Modalidade(BaseModel):
    """Uma linha do PDF: ampla concorrencia, escola publica ou escola publica PPI."""

    model_config = ConfigDict(extra="forbid")

    vagas: int = Field(ge=0, le=2000)  # 0: carreira sem vagas nessa modalidade (2020/150, PPI)
    convocados: int = Field(ge=0, le=20000)
    corte: int | None = Field(default=None, ge=MINIMO_FUVEST, le=PONTOS_PROVA)
    maximo: int | None = Field(default=None, ge=MINIMO_FUVEST, le=PONTOS_PROVA)

    @model_validator(mode="after")
    def _c04(self) -> "Modalidade":
        if self.vagas == 0 and self.convocados > 0:
            raise ValueError("C04: convocados sem vagas")
        if self.convocados == 0:
            if self.corte is not None or self.maximo is not None:
                raise ValueError("C04: sem convocados, corte e máximo ficam vazios")
        elif self.corte is None or self.maximo is None:
            raise ValueError("C04: com convocados, corte e máximo são obrigatórios")
        elif self.corte > self.maximo:
            raise ValueError(f"C04: corte {self.corte} maior que o máximo {self.maximo}")
        return self


class CarreiraCorte(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: int = Field(ge=100, le=999)
    nome: str = Field(min_length=1, max_length=250)  # o mais longo, 2026/313 (Física... com três campi), passa de 200
    ac: Modalidade
    ep: Modalidade
    ppi: Modalidade

    @field_validator("nome")
    @classmethod
    def _sem_espacos_nas_pontas(cls, nome: str) -> str:
        if nome != nome.strip():
            raise ValueError("nome com espaço no começo ou no fim")
        return nome

    @property
    def vagas(self) -> int:
        return self.ac.vagas + self.ep.vagas + self.ppi.vagas


class NotasCorteAno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ano: int = Field(ge=2000, le=2100)
    status: Literal["rascunho", "publicada"]
    fonte: str = Field(pattern=PADRAO_FONTE)
    pendencias: list[str] = Field(default_factory=list)
    carreiras: list[CarreiraCorte] = Field(min_length=1, max_length=300)


class NotasCorteInvalidas(Exception):
    """Arquivo ilegivel, YAML malformado, fora do schema (C01, C04) ou com o ano trocado."""

    def __init__(self, caminho: Path, detalhe: str):
        super().__init__(f"{caminho}: {detalhe}")
        self.caminho = caminho
        self.detalhe = detalhe


def carregar_ano(caminho: Path) -> NotasCorteAno:
    try:
        dados = yaml.safe_load(caminho.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as erro:
        raise NotasCorteInvalidas(caminho, str(erro)) from erro
    try:
        notas = NotasCorteAno.model_validate(dados)
    except ValidationError as erro:
        raise NotasCorteInvalidas(caminho, str(erro)) from erro
    if caminho.stem != str(notas.ano):
        raise NotasCorteInvalidas(caminho, f"C01: ano {notas.ano} diferente do nome do arquivo")
    return notas


def problemas_de_publicacao(notas: NotasCorteAno) -> list[str]:
    """C02, C03 e C05: bloqueiam so o arquivo publicado; no rascunho sao o relatorio do curador."""
    problemas = []
    codigos = [c.codigo for c in notas.carreiras]
    for codigo in sorted({c for c in codigos if codigos.count(c) > 1}):
        problemas.append(f"C02: código repetido: {codigo}")
    por_nome: dict[str, list[CarreiraCorte]] = {}
    for carreira in notas.carreiras:
        por_nome.setdefault(carreira.nome.casefold(), []).append(carreira)
    for repetidas in por_nome.values():
        if len(repetidas) > 1:
            codigos_do_nome = ", ".join(str(c.codigo) for c in repetidas)
            problemas.append(f"C02: nome repetido: {repetidas[0].nome} ({codigos_do_nome})")
    for carreira in notas.carreiras:
        if carreira.nome.startswith("Treinamento"):
            problemas.append(f"C02: carreira de treineiro: {carreira.codigo} {carreira.nome}")
        if "..." in carreira.nome or "…" in carreira.nome:
            problemas.append(f"C03: nome cortado: {carreira.codigo} {carreira.nome}")
    if notas.pendencias:
        n = len(notas.pendencias)
        problemas.append(f"C05: {n} pendência{'s' if n > 1 else ''} em aberto")
    return problemas


class _Dumper(yaml.SafeDumper):
    pass


class _Fluxo(dict):
    """Modalidade numa linha so: `ac: {vagas: 147, convocados: 586, corte: 79, maximo: 88}`."""


_Dumper.add_representer(
    _Fluxo, lambda d, dados: d.represent_mapping("tag:yaml.org,2002:map", dados, flow_style=True)
)


def salvar_ano(notas: NotasCorteAno, caminho: Path) -> None:
    """Grava em UTF-8 com LF (no Windows o write_text traduziria para CRLF)."""
    dados = notas.model_dump(mode="json")
    for carreira in dados["carreiras"]:
        for chave in CHAVES_MODALIDADES:
            carreira[chave] = _Fluxo(carreira[chave])
    cabecalho = (
        f"# Notas de corte da 1ª fase — FUVEST {notas.ano} (CR-010, specs/08).\n"
        "# Corte = menor nota entre os convocados para a 2ª fase, por carreira e modalidade.\n"
    )
    corpo = yaml.dump(dados, Dumper=_Dumper, allow_unicode=True, sort_keys=False, width=120)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes((cabecalho + corpo).encode("utf-8"))


def arquivos_de_notas_corte(data_dir: Path) -> list[Path]:
    diretorio = data_dir / DIRETORIO_NOTAS_CORTE
    if not diretorio.is_dir():
        return []
    return sorted(p for p in diretorio.glob("*.yaml") if p.is_file())


@dataclass(frozen=True)
class BaseNotasCorte:
    """Os anos publicados e sem problema, como a API os ve."""

    por_ano: dict[int, NotasCorteAno] = field(default_factory=dict)

    @property
    def anos(self) -> list[int]:
        return sorted(self.por_ano, reverse=True)

    @property
    def recente(self) -> int | None:
        return max(self.por_ano, default=None)

    def ano(self, ano: int) -> NotasCorteAno | None:
        return self.por_ano.get(ano)

    def carreira(self, ano: int, codigo: int) -> CarreiraCorte | None:
        notas = self.por_ano.get(ano)
        if notas is None:
            return None
        return next((c for c in notas.carreiras if c.codigo == codigo), None)


@lru_cache(maxsize=4)
def _base_em_cache(diretorio: Path, chave: tuple[tuple[str, int], ...]) -> BaseNotasCorte:
    por_ano = {}
    for nome, _mtime in chave:
        caminho = diretorio / nome
        try:
            notas = carregar_ano(caminho)
        except NotasCorteInvalidas as erro:
            log.warning("Notas de corte ignoradas: %s", erro)
            continue
        if notas.status != "publicada":
            continue
        problemas = problemas_de_publicacao(notas)
        if problemas:
            log.warning("Notas de corte ignoradas: %s: %s", caminho, "; ".join(problemas))
            continue
        por_ano[notas.ano] = notas
    return BaseNotasCorte(por_ano)


def notas_corte_em_uso(data_dir: Path) -> BaseNotasCorte:
    """Para a API: arquivo invalido, em rascunho ou com problema fica fora (o CI barra antes)."""
    chave = []
    for caminho in arquivos_de_notas_corte(data_dir):
        try:
            chave.append((caminho.name, caminho.stat().st_mtime_ns))
        except OSError:
            continue
    return _base_em_cache(data_dir / DIRETORIO_NOTAS_CORTE, tuple(chave))
