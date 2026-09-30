"""IT-020: relatorio da classificacao por assunto (specs/06-assuntos-desempenho.md §2.5)."""

from app.pacote.leitura import carregar_pacote, salvar_pacote
from ingestao.cli import main
from tests.fixtures.gerar_pacotes import escrever_pacotes


def _assuntos(data_dir, *extra):
    return main(["assuntos", "--data-dir", str(data_dir), *extra])


def test_relatorio_agrupado_por_disciplina_e_assunto(tmp_path, capsys):
    (d2099,) = escrever_pacotes(tmp_path, anos=(2099,))
    pacote = carregar_pacote(d2099)
    pacote.questoes[0].assunto = None
    pacote.questoes[1].assunto = "inexistente"
    pacote.questoes[2].disciplina = None
    salvar_pacote(pacote, d2099)

    assert _assuntos(tmp_path, "--ano", "2099") == 0

    saida = capsys.readouterr().out
    assert "== 2099 (publicada) — 90 questões, 1 sem assunto" in saida
    assert "Biologia — " in saida and "  Tema A (" in saida
    assert "    Q004 Questão sintética 4 de" in saida
    assert "  Assunto inválido (1)" in saida and "Q002" in saida and "[inexistente]" in saida
    assert "Sem disciplina (1)" in saida
    assert saida.rstrip().splitlines()[-2:][0] == "Sem assunto (1)"


def test_assunto_sem_questoes_e_listado(tmp_path, capsys):
    (d2099,) = escrever_pacotes(tmp_path, anos=(2099,))
    pacote = carregar_pacote(d2099)
    for q in pacote.questoes:
        if q.assunto == "tema-c":
            q.assunto = "tema-a"
    salvar_pacote(pacote, d2099)

    assert _assuntos(tmp_path) == 0

    assert "  Sem questões: Tema C" in capsys.readouterr().out


def test_sem_ano_lista_todos_os_pacotes(tmp_path, capsys):
    escrever_pacotes(tmp_path)

    assert _assuntos(tmp_path) == 0

    saida = capsys.readouterr().out
    assert "== 2098" in saida and "== 2099" in saida


def test_ano_inexistente_ou_taxonomia_invalida_falha(tmp_path, capsys):
    escrever_pacotes(tmp_path)

    assert _assuntos(tmp_path, "--ano", "2050") == 1
    (tmp_path / "assuntos.yaml").write_text("fisica: [", encoding="utf-8")
    assert _assuntos(tmp_path, "--ano", "2098") == 1

    erros = capsys.readouterr().err
    assert "2050" in erros and "Taxonomia" in erros


def test_yaml_invalido_falha(tmp_path, capsys):
    (d2099,) = escrever_pacotes(tmp_path, anos=(2099,))
    (d2099 / "prova.yaml").write_text("ano: [", encoding="utf-8")

    assert _assuntos(tmp_path, "--ano", "2099") == 1
    assert "YAML inválido" in capsys.readouterr().err
