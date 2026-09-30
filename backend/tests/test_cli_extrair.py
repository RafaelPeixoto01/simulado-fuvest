"""IT-011: comando extrair (gabarito + layout -> pacote rascunho)."""

import json
import shutil
from pathlib import Path

import pytest

from app.pacote.leitura import carregar_pacote
from ingestao.cli import main

PDFS = Path(__file__).parent / "fixtures" / "pdfs"


@pytest.fixture
def data_dir(tmp_path):
    cache = tmp_path / "_cache" / "2025"
    cache.mkdir(parents=True)
    shutil.copy(PDFS / "fuvest2025_v1_p03.pdf", cache / "prova.pdf")
    shutil.copy(PDFS / "fuvest2025_gabarito.pdf", cache / "gabarito.pdf")
    (cache / "fonte.json").write_text(
        json.dumps({
            "ano": 2025,
            "versao": "V1",
            "url_prova": "https://www.fuvest.br/p.pdf",
            "url_gabarito": "https://www.fuvest.br/g.pdf",
        }),
        encoding="utf-8",
    )
    return tmp_path / "provas"


def _extrair(data_dir, *extra):
    return main(["extrair", "--ano", "2025", "--data-dir", str(data_dir), *extra])


def test_extrair_gera_pacote_rascunho_com_gabarito(data_dir, capsys):
    assert _extrair(data_dir) == 0

    pacote = carregar_pacote(data_dir / "2025")
    assert pacote.status == "rascunho"
    assert pacote.fonte.familia_layout == "familia_2025"
    assert [q.numero for q in pacote.questoes] == [2, 3, 4]
    assert [q.resposta for q in pacote.questoes] == ["B", "B", "C"]  # gabarito oficial V1
    assert all(q.disciplina is None for q in pacote.questoes)
    assert all(q.assunto is None for q in pacote.questoes)
    assert "assunto: null" in (data_dir / "2025" / "prova.yaml").read_text(encoding="utf-8")
    assert (data_dir / "2025" / "figuras" / "q002-1.webp").exists()
    saida = capsys.readouterr().out
    assert "V05" in saida and "V11" in saida and "sem pendência estrutural" in saida


def test_extrair_recusa_sobrescrever_revisao(data_dir, capsys):
    assert _extrair(data_dir) == 0
    yaml = data_dir / "2025" / "prova.yaml"
    yaml.write_text(yaml.read_text(encoding="utf-8") + "# revisado\n", encoding="utf-8")

    assert _extrair(data_dir) == 1
    assert "--forcar" in capsys.readouterr().err
    assert yaml.read_text(encoding="utf-8").endswith("# revisado\n")

    assert _extrair(data_dir, "--forcar") == 0
    assert not yaml.read_text(encoding="utf-8").endswith("# revisado\n")


def test_extrair_sem_baixar_antes(tmp_path, capsys):
    assert main(["extrair", "--ano", "2025", "--data-dir", str(tmp_path / "provas")]) == 1
    assert "baixar" in capsys.readouterr().err


def test_extrair_ano_sem_familia(tmp_path, capsys):
    cache = tmp_path / "_cache" / "1990"
    cache.mkdir(parents=True)
    (cache / "fonte.json").write_text("{}", encoding="utf-8")

    assert main(["extrair", "--ano", "1990", "--data-dir", str(tmp_path / "provas")]) == 1
    assert "sem família" in capsys.readouterr().err
