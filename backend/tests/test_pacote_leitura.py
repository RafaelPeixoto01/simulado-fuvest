import pytest

from app.pacote.leitura import (
    ARQUIVO_PACOTE,
    PacoteInvalido,
    carregar_pacote,
    listar_pacotes,
    salvar_pacote,
)
from tests.fixtures.gerar_pacotes import gerar_pacote


def test_salvar_e_carregar_preserva_o_pacote(tmp_path):
    """IT-001: ida e volta sem perda."""
    pacote = gerar_pacote(2098)

    salvar_pacote(pacote, tmp_path)

    assert carregar_pacote(tmp_path) == pacote


def test_texto_multilinha_sai_em_bloco_literal(tmp_path):
    pacote = gerar_pacote(2098)
    pacote.questoes[0].enunciado[0].texto = "Linha 1\nLinha 2"

    salvar_pacote(pacote, tmp_path)

    conteudo = (tmp_path / ARQUIVO_PACOTE).read_text(encoding="utf-8")
    assert "texto: |-\n" in conteudo
    assert "Linha 1\n" in conteudo


def test_bloco_salvo_sem_a_chave_nula(tmp_path):
    salvar_pacote(gerar_pacote(2098), tmp_path)

    conteudo = (tmp_path / ARQUIVO_PACOTE).read_text(encoding="utf-8")
    assert "figura: null" not in conteudo
    # campos da questao que o curador precisa ver continuam explicitos
    assert "texto_base: null" in conteudo


def test_yaml_malformado_gera_pacote_invalido(tmp_path):
    (tmp_path / ARQUIVO_PACOTE).write_text("ano: [2098\n", encoding="utf-8")

    with pytest.raises(PacoteInvalido):
        carregar_pacote(tmp_path)


def test_schema_invalido_gera_pacote_invalido(tmp_path):
    (tmp_path / ARQUIVO_PACOTE).write_text("ano: 2098\nversao: V9\n", encoding="utf-8")

    with pytest.raises(PacoteInvalido):
        carregar_pacote(tmp_path)


def test_listar_pacotes_so_diretorios_com_prova_yaml(tmp_path):
    salvar_pacote(gerar_pacote(2099), tmp_path / "2099")
    salvar_pacote(gerar_pacote(2098), tmp_path / "2098")
    (tmp_path / "vazio").mkdir()

    assert listar_pacotes(tmp_path) == [tmp_path / "2098", tmp_path / "2099"]


def test_listar_pacotes_de_diretorio_inexistente(tmp_path):
    assert listar_pacotes(tmp_path / "nao-existe") == []
