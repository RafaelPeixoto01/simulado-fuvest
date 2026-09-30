from collections import Counter

from app.disciplinas import Disciplina
from tests.fixtures.gerar_pacotes import escrever_pacotes, gerar_pacote


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
