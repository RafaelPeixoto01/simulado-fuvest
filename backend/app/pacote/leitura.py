"""Leitura e escrita do pacote `prova.yaml`, legivel e editavel a mao pelo curador."""

from pathlib import Path

import yaml
from pydantic import ValidationError

from app.pacote.schema import PacoteProva

ARQUIVO_PACOTE = "prova.yaml"
DIR_FIGURAS = "figuras"


class PacoteInvalido(Exception):
    """YAML malformado ou fora do schema."""

    def __init__(self, caminho: Path, detalhe: str):
        super().__init__(f"{caminho}: {detalhe}")
        self.caminho = caminho
        self.detalhe = detalhe


# libyaml (C) quando disponivel: ~10x mais rapido; a sincronizacao le todos os
# pacotes a cada start do container
_Loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)


class _Dumper(getattr(yaml, "CSafeDumper", yaml.SafeDumper)):
    pass


def _representar_str(dumper: yaml.SafeDumper, valor: str) -> yaml.ScalarNode:
    # Texto com quebra de linha vira bloco literal "|": legivel ao editar
    estilo = "|" if "\n" in valor else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", valor, style=estilo)


_Dumper.add_representer(str, _representar_str)


def _sem_nulos(bloco: dict) -> dict:
    return {chave: valor for chave, valor in bloco.items() if valor is not None}


def _para_dict(pacote: PacoteProva) -> dict:
    dados = pacote.model_dump(mode="json")
    # Campos do CR-011 so aparecem fora do padrao: os pacotes de vestibular de 90
    # questoes continuam com as mesmas chaves de antes ao serem regravados
    if dados["tipo"] == "vestibular":
        del dados["tipo"], dados["edicao"]
    if dados["total_questoes"] == 90:
        del dados["total_questoes"]
    # Em blocos e alternativas so aparece a chave usada (texto ou figura);
    # nos demais campos o null fica explicito para o curador preencher
    for texto_base in dados["textos_base"]:
        texto_base["conteudo"] = [_sem_nulos(b) for b in texto_base["conteudo"]]
    for questao in dados["questoes"]:
        questao["enunciado"] = [_sem_nulos(b) for b in questao["enunciado"]]
        questao["alternativas"] = {
            letra: _sem_nulos(alt) for letra, alt in questao["alternativas"].items()
        }
    return dados


def salvar_pacote(pacote: PacoteProva, dir_prova: Path) -> None:
    dir_prova.mkdir(parents=True, exist_ok=True)
    texto = yaml.dump(
        _para_dict(pacote),
        Dumper=_Dumper,
        allow_unicode=True,
        sort_keys=False,
        width=100,
    )
    (dir_prova / ARQUIVO_PACOTE).write_text(texto, encoding="utf-8")


def carregar_pacote(dir_prova: Path) -> PacoteProva:
    caminho = dir_prova / ARQUIVO_PACOTE
    try:
        dados = yaml.load(caminho.read_text(encoding="utf-8"), Loader=_Loader)
    except (OSError, yaml.YAMLError) as erro:
        raise PacoteInvalido(caminho, str(erro)) from erro
    try:
        return PacoteProva.model_validate(dados)
    except ValidationError as erro:
        raise PacoteInvalido(caminho, str(erro)) from erro


def listar_pacotes(data_dir: Path) -> list[Path]:
    """Diretorios de prova (os que tem prova.yaml), em ordem de nome."""
    if not data_dir.is_dir():
        return []
    return sorted(d for d in data_dir.iterdir() if (d / ARQUIVO_PACOTE).is_file())
