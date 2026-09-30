from app.pacote.leitura import carregar_pacote, salvar_pacote
from ingestao.cli import main
from tests.fixtures.gerar_pacotes import escrever_pacotes


def _quebrar(dir_prova, status):
    pacote = carregar_pacote(dir_prova)
    pacote.status = status
    pacote.questoes[0].disciplina = None
    salvar_pacote(pacote, dir_prova)


def test_todas_validas(tmp_path, capsys):
    escrever_pacotes(tmp_path)

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 0
    saida = capsys.readouterr().out
    assert "2098" in saida and "2099" in saida


def test_publicada_com_pendencia_bloqueante_falha(tmp_path, capsys):
    d2098, _ = escrever_pacotes(tmp_path)
    _quebrar(d2098, "publicada")

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 1
    assert "V05" in capsys.readouterr().out


def test_rascunho_com_pendencia_so_avisa(tmp_path, capsys):
    d2098, _ = escrever_pacotes(tmp_path)
    _quebrar(d2098, "rascunho")

    assert main(["validar", "--ano", "2098", "--data-dir", str(tmp_path)]) == 0
    assert "V05" in capsys.readouterr().out


def test_yaml_invalido_falha_mesmo_em_rascunho(tmp_path):
    escrever_pacotes(tmp_path, anos=(2098,))
    (tmp_path / "2098" / "prova.yaml").write_text("ano: [\n", encoding="utf-8")

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 1


def test_ano_sem_pacote_falha(tmp_path, capsys):
    assert main(["validar", "--ano", "2098", "--data-dir", str(tmp_path)]) == 1
    assert "não encontrado" in capsys.readouterr().err


def test_diretorio_sem_pacotes_passa(tmp_path, capsys):
    assert main(["validar", "--todas", "--data-dir", str(tmp_path / "vazio")]) == 0
    assert "Nenhum pacote" in capsys.readouterr().out
