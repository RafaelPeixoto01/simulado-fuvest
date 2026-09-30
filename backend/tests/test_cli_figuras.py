"""IT-013: comandos preview e recortar."""

import shutil
from pathlib import Path

import pytest
from PIL import Image

from ingestao.cli import main

P03 = Path(__file__).parent / "fixtures" / "pdfs" / "fuvest2025_v1_p03.pdf"


@pytest.fixture
def dirs(tmp_path):
    data_dir = tmp_path / "provas"
    cache = tmp_path / "_cache" / "2025"
    cache.mkdir(parents=True)
    shutil.copy(P03, cache / "prova.pdf")
    return data_dir, cache


def _recortar(data_dir, bbox, nome="q002-1"):
    return main([
        "recortar", "--ano", "2025", "--pagina", "1", "--bbox", bbox,
        "--nome", nome, "--data-dir", str(data_dir),
    ])


def test_recortar_grava_webp_e_mostra_o_bloco(dirs, capsys):
    data_dir, _ = dirs

    assert _recortar(data_dir, "41,101,276,257") == 0

    figura = data_dir / "2025" / "figuras" / "q002-1.webp"
    assert Image.open(figura).size == (470, 312)
    assert "- figura: q002-1.webp" in capsys.readouterr().out


def test_recortar_bbox_fora_da_pagina(dirs, capsys):
    data_dir, _ = dirs

    assert _recortar(data_dir, "41,101,700,257") == 1
    assert "bbox inválida" in capsys.readouterr().err


def test_recortar_bbox_invertida(dirs, capsys):
    data_dir, _ = dirs

    assert _recortar(data_dir, "276,101,41,257") == 1
    assert "bbox inválida" in capsys.readouterr().err


def test_recortar_nome_invalido(dirs, capsys):
    data_dir, _ = dirs

    assert _recortar(data_dir, "41,101,276,257", nome="../fora") == 1
    assert "Nome inválido" in capsys.readouterr().err


def test_recortar_pagina_fora_do_intervalo(dirs, capsys):
    data_dir, _ = dirs

    codigo = main([
        "recortar", "--ano", "2025", "--pagina", "5", "--bbox", "1,1,10,10",
        "--nome", "q002-1", "--data-dir", str(data_dir),
    ])

    assert codigo == 1
    assert "Página fora do intervalo 1–1" in capsys.readouterr().err


def test_recortar_sem_pdf_em_cache(tmp_path, capsys):
    assert _recortar(tmp_path / "provas", "1,1,10,10") == 1
    assert "baixar" in capsys.readouterr().err


def test_preview_gera_png_com_grade(dirs):
    data_dir, cache = dirs

    assert main(["preview", "--ano", "2025", "--pagina", "1", "--data-dir", str(data_dir)]) == 0

    imagem = Image.open(cache / "preview-p01.png")
    # A4 (595.22 x 842 pt) a 2x; o pdfium arredonda a largura para cima
    assert imagem.size == (1191, 1684)
