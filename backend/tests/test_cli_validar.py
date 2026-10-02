import yaml

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


def test_taxonomia_ausente_ou_invalida_falha(tmp_path, capsys):
    """IT-016 (CR-004)."""
    escrever_pacotes(tmp_path)
    taxonomia = tmp_path / "assuntos.yaml"

    taxonomia.write_text("fisica: [", encoding="utf-8")
    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 1
    taxonomia.unlink()
    assert main(["validar", "--ano", "2098", "--data-dir", str(tmp_path)]) == 1
    assert "Taxonomia" in capsys.readouterr().err


def test_publicada_sem_assunto_falha_com_v11(tmp_path, capsys):
    """IT-015 pela CLI: o CI barra pacote publicado sem assunto."""
    d2098, _ = escrever_pacotes(tmp_path)
    pacote = carregar_pacote(d2098)
    pacote.questoes[0].assunto = None
    salvar_pacote(pacote, d2098)

    assert main(["validar", "--ano", "2098", "--data-dir", str(tmp_path)]) == 1
    assert "V11" in capsys.readouterr().out


# IT-024 (CR-010): validar tambem as notas de corte (specs/08 §2.4)


def _cortes(data_dir, ano):
    return data_dir / "notas_corte" / f"{ano}.yaml"


def _alterar_cortes(caminho, alterar):
    dados = yaml.safe_load(caminho.read_text(encoding="utf-8"))
    alterar(dados)
    caminho.write_text(yaml.safe_dump(dados, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_todas_valida_as_notas_de_corte(tmp_path, capsys):
    escrever_pacotes(tmp_path)

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 0
    saida = capsys.readouterr().out
    assert "== cortes 2098 — publicada" in saida and "== cortes 2099 — publicada" in saida


def test_cortes_publicados_com_problema_falham(tmp_path, capsys):
    escrever_pacotes(tmp_path)
    _alterar_cortes(_cortes(tmp_path, 2099), lambda d: d["carreiras"][1].update(nome=d["carreiras"][0]["nome"]))

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 1
    assert "C02: nome repetido" in capsys.readouterr().out


def test_cortes_em_rascunho_com_problema_so_avisam(tmp_path, capsys):
    escrever_pacotes(tmp_path)
    _alterar_cortes(_cortes(tmp_path, 2099), lambda d: d.update(status="rascunho", pendencias=["conferir"]))

    assert main(["validar", "--ano", "2099", "--data-dir", str(tmp_path)]) == 0
    saida = capsys.readouterr().out
    assert "== cortes 2099 — rascunho" in saida and "C05" in saida and "conferir" in saida


def test_cortes_invalidos_falham_mesmo_em_rascunho(tmp_path, capsys):
    escrever_pacotes(tmp_path)
    _alterar_cortes(
        _cortes(tmp_path, 2098),
        lambda d: d.update(status="rascunho") or d["carreiras"][0]["ac"].update(corte=20),
    )

    assert main(["validar", "--todas", "--data-dir", str(tmp_path)]) == 1
    assert "== cortes 2098 — ARQUIVO INVÁLIDO" in capsys.readouterr().out


def test_ano_valida_so_os_cortes_do_ano(tmp_path, capsys):
    escrever_pacotes(tmp_path)
    _cortes(tmp_path, 2099).write_text("ano: [", encoding="utf-8")

    assert main(["validar", "--ano", "2098", "--data-dir", str(tmp_path)]) == 0
    saida = capsys.readouterr().out
    assert "== cortes 2098" in saida and "cortes 2099" not in saida


def test_ano_so_com_notas_de_corte(tmp_path, capsys):
    """Revisao de codigo: cortes de um ano sem pacote de prova (ex.: 2021, que exige OCR)."""
    from tests.fixtures.gerar_pacotes import escrever_notas_corte

    escrever_pacotes(tmp_path)
    escrever_notas_corte(tmp_path, anos=(2097,))

    assert main(["validar", "--ano", "2097", "--data-dir", str(tmp_path)]) == 0
    saida = capsys.readouterr().out
    assert "== cortes 2097 — publicada" in saida and "== 2098" not in saida
