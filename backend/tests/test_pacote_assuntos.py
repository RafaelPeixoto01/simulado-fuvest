"""IT-014: taxonomia de assuntos (specs/06-assuntos-desempenho.md §2.2, ADR-009)."""

import os

import pytest
import yaml

from app.config import RAIZ_PROJETO
from app.disciplinas import Disciplina
from app.pacote.assuntos import (
    ARQUIVO_TAXONOMIA,
    TaxonomiaInvalida,
    carregar_taxonomia,
    taxonomia_em_uso,
)
from tests.fixtures.gerar_pacotes import escrever_taxonomia, taxonomia_sintetica


def _dados_validos() -> dict:
    return taxonomia_sintetica().model_dump(mode="json")


def _gravar(diretorio, dados) -> None:
    (diretorio / ARQUIVO_TAXONOMIA).write_text(
        yaml.safe_dump(dados, allow_unicode=True), encoding="utf-8"
    )


def test_taxonomia_do_repositorio_e_valida():
    taxonomia = carregar_taxonomia(RAIZ_PROJETO / "data" / "provas")

    assert set(taxonomia.root) == set(Disciplina)
    assert taxonomia.contem(Disciplina.FISICA, "optica")
    assert taxonomia.nome("biologia", "genetica") == "Genética e hereditariedade"


def test_consultas_por_disciplina(tmp_path):
    escrever_taxonomia(tmp_path)

    taxonomia = carregar_taxonomia(tmp_path)

    assert [a.slug for a in taxonomia.assuntos(Disciplina.QUIMICA)] == ["tema-a", "tema-b", "tema-c"]
    assert taxonomia.nome(Disciplina.QUIMICA, "tema-b") == "Tema B"
    assert taxonomia.nome(Disciplina.QUIMICA, "genetica") is None
    assert not taxonomia.contem("quimica", "genetica")


@pytest.mark.parametrize(
    ("alterar", "trecho"),
    [
        (lambda d: d.pop("ingles"), "ingles"),
        (lambda d: d.update(artes=[{"slug": "x", "nome": "X"}]), "artes"),
        (lambda d: d["fisica"].append({"slug": "tema-a", "nome": "Outro"}), "tema-a"),
        (lambda d: d["fisica"].append({"slug": "outro", "nome": "Tema A"}), "Tema A"),
        (lambda d: d["fisica"].append({"slug": "Com Espaco", "nome": "Y"}), "slug"),
        (lambda d: d["fisica"].append({"slug": "vazio", "nome": ""}), "nome"),
        (lambda d: d["fisica"][0].update(extra=1), "extra"),
        (lambda d: d.update(fisica=[]), "fisica"),
    ],
)
def test_taxonomia_invalida(tmp_path, alterar, trecho):
    dados = _dados_validos()
    alterar(dados)
    _gravar(tmp_path, dados)

    with pytest.raises(TaxonomiaInvalida) as erro:
        carregar_taxonomia(tmp_path)

    assert trecho in erro.value.detalhe


def test_arquivo_ausente_ou_yaml_quebrado(tmp_path):
    with pytest.raises(TaxonomiaInvalida):
        carregar_taxonomia(tmp_path)

    (tmp_path / ARQUIVO_TAXONOMIA).write_text("fisica: [", encoding="utf-8")
    with pytest.raises(TaxonomiaInvalida):
        carregar_taxonomia(tmp_path)


def test_taxonomia_em_uso_e_tolerante_e_recarrega_quando_o_arquivo_muda(tmp_path):
    assert taxonomia_em_uso(tmp_path) is None  # ausente

    escrever_taxonomia(tmp_path)
    assert taxonomia_em_uso(tmp_path).nome("fisica", "tema-a") == "Tema A"

    dados = _dados_validos()
    dados["fisica"][0]["nome"] = "Cinemática"
    _gravar(tmp_path, dados)
    arquivo = tmp_path / ARQUIVO_TAXONOMIA
    stat = arquivo.stat()
    os.utime(arquivo, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))
    assert taxonomia_em_uso(tmp_path).nome("fisica", "tema-a") == "Cinemática"

    arquivo.write_text("lixo: [", encoding="utf-8")
    os.utime(arquivo, ns=(stat.st_atime_ns, stat.st_mtime_ns + 2_000_000_000))
    assert taxonomia_em_uso(tmp_path) is None  # invalida
