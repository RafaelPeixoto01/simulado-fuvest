from collections import Counter

from app.disciplinas import Disciplina
from app.pacote.assuntos import carregar_taxonomia
from app.pacote.leitura import carregar_pacote
from tests.fixtures.gerar_pacotes import TEMAS, escrever_pacotes, gerar_pacote


def test_pacote_sintetico_e_deterministico():
    assert gerar_pacote(2098) == gerar_pacote(2098)
    assert gerar_pacote(2098) != gerar_pacote(2099)


def test_pacote_sintetico_cobre_os_casos_da_base():
    p = gerar_pacote(2099)

    assert [q.numero for q in p.questoes] == list(range(1, 91))
    assert set(Counter(q.disciplina for q in p.questoes)) == set(Disciplina)
    assert any(q.anulada for q in p.questoes)
    assert any(q.texto_base for q in p.questoes)
    assert any(q.disciplinas_secundarias for q in p.questoes)
    assert any(b.figura for q in p.questoes for b in q.enunciado)
    assert any(a.figura for q in p.questoes for a in q.alternativas.values())
    assert p.status == "publicada"


def test_escrever_pacotes_grava_yaml_e_figuras(tmp_path):
    escrever_pacotes(tmp_path, anos=(2098,))

    figuras = {
        b.figura
        for q in gerar_pacote(2098).questoes
        for b in [*q.enunciado, *q.alternativas.values()]
        if b.figura
    }
    assert (tmp_path / "2098" / "prova.yaml").exists()
    assert figuras
    for nome in figuras:
        assert (tmp_path / "2098" / "figuras" / nome).read_bytes()[:4] == b"RIFF"


def test_assunto_em_todas_as_questoes_e_taxonomia_gravada(tmp_path):
    """IT-017 (CR-004): a ida e volta do YAML preserva o assunto."""
    (dir_prova,) = escrever_pacotes(tmp_path, anos=(2099,))

    pacote = carregar_pacote(dir_prova)
    taxonomia = carregar_taxonomia(tmp_path)

    assert pacote == gerar_pacote(2099)
    assert {q.assunto for q in pacote.questoes} == set(TEMAS)
    assert all(taxonomia.contem(q.disciplina, q.assunto) for q in pacote.questoes)
