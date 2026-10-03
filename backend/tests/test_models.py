from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Prova, Questao, TextoBase


def _prova(codigo: str = "2098") -> Prova:
    return Prova(
        codigo=codigo,
        ano=int(codigo[:4]),
        tipo="simulado" if "s" in codigo else "vestibular",
        edicao=int(codigo[5:]) if "s" in codigo else None,
        versao="V1",
        url_prova="https://exemplo.test/prova.pdf",
        url_gabarito="https://exemplo.test/gabarito.pdf",
        total_questoes=90,
        sincronizado_em=datetime.now(UTC),
    )


def _questao(codigo: str, numero: int, **extra) -> Questao:
    return Questao(
        id=f"{codigo}-{numero:03d}",
        prova_codigo=codigo,
        numero=numero,
        enunciado=[{"texto": "Enunciado"}],
        alternativas={letra: {"texto": letra} for letra in "ABCDE"},
        resposta="A",
        disciplina="fisica",
        **extra,
    )


def test_questao_guarda_campos_json(sessao):
    sessao.add(_prova())
    sessao.add(_questao("2098", 1, disciplinas_secundarias=["matematica"]))
    sessao.commit()

    q = sessao.get(Questao, "2098-001")

    assert q.enunciado == [{"texto": "Enunciado"}]
    assert q.alternativas["E"] == {"texto": "E"}
    assert q.disciplinas_secundarias == ["matematica"]
    assert q.anulada is False


def test_numero_unico_por_prova(sessao):
    sessao.add(_prova())
    sessao.add(_questao("2098", 1))
    sessao.commit()

    duplicada = _questao("2098", 1)
    duplicada.id = "2098-999"  # outro id, mesmo (prova_codigo, numero)
    sessao.add(duplicada)

    with pytest.raises(IntegrityError):
        sessao.commit()


def test_apagar_prova_apaga_questoes_e_textos_base(sessao):
    sessao.add(_prova())
    sessao.add(TextoBase(id="2098-tb01", prova_codigo="2098", conteudo=[{"texto": "Base"}]))
    sessao.add(_questao("2098", 1, texto_base_id="2098-tb01"))
    sessao.commit()

    sessao.delete(sessao.get(Prova, "2098"))
    sessao.commit()

    assert sessao.scalars(select(Questao)).all() == []
    assert sessao.scalars(select(TextoBase)).all() == []


def test_simulado_tem_codigo_proprio_e_ids_de_12_caracteres(sessao):
    """CR-011: duas edicoes do mesmo ano convivem com a prova do ano, com ids distintos."""
    sessao.add_all([_prova("2027"), _prova("2027s1"), _prova("2027s2")])
    sessao.add_all([_questao("2027", 1), _questao("2027s1", 1), _questao("2027s2", 1)])
    sessao.add(TextoBase(id="2027s2-tb01", prova_codigo="2027s2", conteudo=[{"texto": "Base"}]))
    sessao.commit()

    assert sorted(sessao.scalars(select(Questao.id))) == ["2027-001", "2027s1-001", "2027s2-001"]
    assert sessao.get(Prova, "2027s2").edicao == 2
