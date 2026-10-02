"""IT-027: comando `cortes` e download do PDF de notas de corte (specs/08-notas-de-corte.md §2.4)."""

import pytest

from app.config import RAIZ_PROJETO
from app.pacote.notas_corte import carregar_ano
from ingestao import notas_corte as extrator
from ingestao.baixar import ErroDownload
from ingestao.cli import main
from tests.fixtures.gerar_pacotes import notas_corte_sinteticas

URL = "https://www.fuvest.br/wp-content/uploads/fuvest_2099_notas_de_corte.pdf"
PDF_FALSO = b"%PDF-1.7\n conteudo"


@pytest.fixture
def data_dir(tmp_path):
    destino = tmp_path / "provas"
    destino.mkdir()
    return destino


@pytest.fixture
def pdf_em_cache(data_dir):
    caminho = data_dir.parent / "_cache" / "2099" / extrator.ARQUIVO_PDF
    caminho.parent.mkdir(parents=True)
    caminho.write_bytes(PDF_FALSO)
    caminho.with_name(f"{caminho.name}.url").write_text(URL, encoding="utf-8")  # baixado desta URL
    return caminho


@pytest.fixture
def extracao_falsa(monkeypatch):
    chamadas = []

    def extrair(pdf, ano, fonte):
        chamadas.append((pdf, ano, fonte))
        notas = notas_corte_sinteticas(ano)
        notas.status = "rascunho"
        notas.pendencias = ["Carreira 102: nome repetido (Medicina) — completar o campus pelo Guia de Carreiras"]
        return notas

    monkeypatch.setattr(extrator, "extrair_notas_corte", extrair)
    return chamadas


def _cortes(data_dir, *extra):
    return main(["cortes", "--ano", "2099", "--url", URL, "--data-dir", str(data_dir), *extra])


def test_grava_o_rascunho_com_as_pendencias(data_dir, pdf_em_cache, extracao_falsa, capsys):
    assert _cortes(data_dir) == 0

    caminho = data_dir / "notas_corte" / "2099.yaml"
    assert b"\r\n" not in caminho.read_bytes()
    notas = carregar_ano(caminho)
    assert notas.status == "rascunho" and len(notas.carreiras) == 4
    assert extracao_falsa == [(pdf_em_cache, 2099, URL)]
    saida = capsys.readouterr().out
    assert "4 carreiras, 1 pendência" in saida and "Carreira 102: nome repetido" in saida


def test_nao_sobrescreve_sem_forcar(data_dir, pdf_em_cache, extracao_falsa, capsys):
    caminho = data_dir / "notas_corte" / "2099.yaml"
    caminho.parent.mkdir()
    caminho.write_text("revisado à mão", encoding="utf-8")

    assert _cortes(data_dir) == 1
    assert caminho.read_text(encoding="utf-8") == "revisado à mão"
    assert "--forcar" in capsys.readouterr().err

    assert _cortes(data_dir, "--forcar") == 0
    assert carregar_ano(caminho).status == "rascunho"


def test_url_fora_da_fuvest_falha_sem_gravar(data_dir, extracao_falsa, capsys):
    codigo = main(["cortes", "--ano", "2099", "--url", "https://exemplo.com/x.pdf", "--data-dir", str(data_dir)])

    assert codigo == 1
    assert "fuvest.br" in capsys.readouterr().err
    assert not (data_dir / "notas_corte").exists() and extracao_falsa == []


def test_layout_desconhecido_falha_sem_gravar(data_dir, pdf_em_cache, monkeypatch, capsys):
    def extrair(pdf, ano, fonte):
        raise extrator.ErroLayout("página 1: cabeçalho da tabela não encontrado (layout desconhecido)")

    monkeypatch.setattr(extrator, "extrair_notas_corte", extrair)

    assert _cortes(data_dir) == 1
    assert "layout desconhecido" in capsys.readouterr().err
    assert not (data_dir / "notas_corte").exists()


def test_baixar_pdf_reaproveita_o_cache(tmp_path):
    urls = []

    def obter(url):
        urls.append(url)
        return PDF_FALSO

    primeiro = extrator.baixar_pdf(2099, URL, tmp_path, obter=obter)
    segundo = extrator.baixar_pdf(2099, URL, tmp_path, obter=obter)

    assert primeiro == segundo == tmp_path / "2099" / extrator.ARQUIVO_PDF
    assert primeiro.read_bytes() == PDF_FALSO and urls == [URL]


def test_baixar_pdf_recusa_conteudo_que_nao_e_pdf(tmp_path):
    with pytest.raises(ErroDownload, match="não é um PDF"):
        extrator.baixar_pdf(2099, URL, tmp_path, obter=lambda url: b"<html>")
    assert not (tmp_path / "2099" / extrator.ARQUIVO_PDF).exists()


# Conferencia com os PDFs reais, quando estao no cache local (data/_cache e gitignored: pulado no CI)
# ano: (carreiras sem treineiros, codigo, modalidade, corte conferido no texto do PDF)
REAIS = {2020: (106, 500, "ppi", 59), 2022: (107, 500, "ac", 80), 2023: (107, 500, "ac", 81),
         2024: (85, 460, "ep", 73), 2025: (75, 111, "ac", 79)}


@pytest.mark.parametrize("ano", sorted(REAIS))
def test_pdfs_reais_em_cache(ano):
    pdf = RAIZ_PROJETO / "data" / "_cache" / str(ano) / extrator.ARQUIVO_PDF
    if not pdf.is_file():
        pytest.skip(f"PDF de notas de corte de {ano} fora do cache local")
    total, codigo, modalidade, corte = REAIS[ano]

    notas = extrator.extrair_notas_corte(pdf, ano, URL)

    assert len(notas.carreiras) == total
    carreira = next(c for c in notas.carreiras if c.codigo == codigo)
    assert getattr(carreira, modalidade).corte == corte


def test_baixar_pdf_com_outra_url_baixa_de_novo(tmp_path):
    """Revisao de codigo: o cache vale para a URL de onde veio, nao so para o ano."""
    outra = URL.replace("fuvest_2099", "fuvest2099")
    urls = []

    def obter(url):
        urls.append(url)
        return PDF_FALSO + url.encode()

    extrator.baixar_pdf(2099, URL, tmp_path, obter=obter)
    caminho = extrator.baixar_pdf(2099, outra, tmp_path, obter=obter)

    assert urls == [URL, outra]
    assert caminho.read_bytes().endswith(outra.encode())


def test_pdf_ilegivel_falha_sem_traceback(data_dir, pdf_em_cache, capsys):
    """Revisao de codigo: PDF corrompido no cache vira erro da CLI, nao excecao."""
    assert _cortes(data_dir) == 1
    assert "Não foi possível extrair as notas de corte" in capsys.readouterr().err
    assert not (data_dir / "notas_corte").exists()
