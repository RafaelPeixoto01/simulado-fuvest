import json

import pytest

from ingestao.baixar import ErroDownload, baixar

PDF_FALSO = b"%PDF-1.7\n conteudo"


def _obter_fixo(conteudos: dict[str, bytes]):
    def obter(url: str) -> bytes:
        return conteudos[url]

    return obter


def test_baixar_grava_pdfs_e_fonte(tmp_path):
    urls = {"https://f.test/p.pdf": PDF_FALSO, "https://f.test/g.pdf": PDF_FALSO + b"g"}

    dir_cache = baixar(
        2025, "https://f.test/p.pdf", "https://f.test/g.pdf", "V1", tmp_path, obter=_obter_fixo(urls)
    )

    assert (dir_cache / "prova.pdf").read_bytes() == PDF_FALSO
    assert (dir_cache / "gabarito.pdf").read_bytes() == PDF_FALSO + b"g"
    fonte = json.loads((dir_cache / "fonte.json").read_text(encoding="utf-8"))
    assert fonte == {
        "ano": 2025,
        "versao": "V1",
        "url_prova": "https://f.test/p.pdf",
        "url_gabarito": "https://f.test/g.pdf",
    }


def test_conteudo_que_nao_e_pdf_e_recusado(tmp_path):
    urls = {"https://f.test/p.pdf": b"<html>erro</html>", "https://f.test/g.pdf": PDF_FALSO}

    with pytest.raises(ErroDownload, match="não é um PDF"):
        baixar(2025, "https://f.test/p.pdf", "https://f.test/g.pdf", "V1", tmp_path,
               obter=_obter_fixo(urls))

    assert not (tmp_path / "2025" / "fonte.json").exists()


def test_url_sem_https_e_recusada(tmp_path):
    with pytest.raises(ErroDownload, match="https"):
        baixar(2025, "http://f.test/p.pdf", "https://f.test/g.pdf", "V1", tmp_path,
               obter=_obter_fixo({}))
