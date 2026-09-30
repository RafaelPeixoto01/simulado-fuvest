import pytest
from pydantic import ValidationError

from app.disciplinas import NOMES_DISCIPLINAS, Disciplina
from app.pacote.schema import Alternativa, Bloco, PacoteProva, Questao, TextoBase


def test_oito_disciplinas_oficiais_com_nome():
    assert {d.value for d in Disciplina} == {
        "biologia", "fisica", "geografia", "historia",
        "ingles", "matematica", "portugues", "quimica",
    }
    assert NOMES_DISCIPLINAS[Disciplina.MATEMATICA] == "Matemática"
    assert set(NOMES_DISCIPLINAS) == set(Disciplina)


@pytest.mark.parametrize("dados", [{}, {"texto": "a", "figura": "q001-1.webp"}])
def test_bloco_exige_exatamente_texto_ou_figura(dados):
    with pytest.raises(ValidationError):
        Bloco(**dados)


def test_alternativa_exige_texto_ou_figura():
    with pytest.raises(ValidationError):
        Alternativa()
    assert Alternativa(texto="x", figura="q001-b.webp").figura == "q001-b.webp"


def test_campo_desconhecido_e_rejeitado():
    # erro de digitacao do curador no YAML nao pode passar em silencio
    with pytest.raises(ValidationError):
        Questao(numero=1, disiplina="fisica", enunciado=[{"texto": "x"}], alternativas={})


@pytest.mark.parametrize("numero", [0, 91])
def test_numero_da_questao_entre_1_e_90(numero):
    with pytest.raises(ValidationError):
        Questao(numero=numero, enunciado=[{"texto": "x"}], alternativas={})


def test_id_do_texto_base_no_formato_tbNN():
    with pytest.raises(ValidationError):
        TextoBase(id="texto1", questoes=[1], conteudo=[{"texto": "x"}])


@pytest.mark.parametrize("versao", ["V5", "v1", "unico"])
def test_versao_invalida(versao):
    with pytest.raises(ValidationError):
        PacoteProva(
            ano=2098,
            versao=versao,
            fonte={
                "url_prova": "https://e.test/p.pdf",
                "url_gabarito": "https://e.test/g.pdf",
                "familia_layout": "familia_2025",
            },
            questoes=[],
        )
