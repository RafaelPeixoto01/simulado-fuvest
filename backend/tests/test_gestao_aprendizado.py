"""BT-106: aba Aprendizado da area de gestao (CR-013, specs/09-gestao.md §2.4)."""

from datetime import UTC, date, datetime

from app.models import EstatisticaDiaria, EstatisticaQuestao, Questao, SimuladoConcluido, Usuario
from app.pacote.assuntos import taxonomia_em_uso
from app.pacote.notas_corte import notas_corte_em_uso
from app.services import gestao

AGORA = datetime(2026, 10, 6, 15, 0, tzinfo=UTC)
HOJE = date(2026, 10, 6)


def _aprendizado(sessao, settings, periodo="7"):
    return gestao.aprendizado(
        sessao, periodo, AGORA, taxonomia_em_uso(settings.data_dir), notas_corte_em_uso(settings.data_dir)
    )


def _marcar(sessao, questao_id, **marcadas):
    sessao.add(EstatisticaQuestao(questao_id=questao_id, **{
        "marcadas_a": 0, "marcadas_b": 0, "marcadas_c": 0, "marcadas_d": 0, "marcadas_e": 0, "em_branco": 0,
        **marcadas,
    }))


def test_modos_no_periodo(sessao, settings, base_sintetica):
    contagens = {
        "concluido.completa": 2,
        "questoes.completa": 160,
        "acertos.completa": 80,
        "tempo_ms.completa": 160 * 120_000,
        "por_tempo.completa": 1,
    }
    sessao.add_all(EstatisticaDiaria(dia=HOJE, metrica=m, total=n) for m, n in contagens.items())
    sessao.add(EstatisticaDiaria(dia=date(2026, 9, 1), metrica="concluido.ano", total=4))  # fora
    sessao.commit()

    modos = {m.modo: m for m in _aprendizado(sessao, settings).modos}

    assert modos["completa"].model_dump() == {
        "modo": "completa", "concluidos": 2, "acerto_medio": 50.0, "por_tempo": 50.0, "tempo_medio_questao_s": 120,
    }
    assert modos["ano"].model_dump() == {
        "modo": "ano", "concluidos": 0, "acerto_medio": None, "por_tempo": None, "tempo_medio_questao_s": None,
    }
    assert _aprendizado(sessao, settings, "tudo").modos[2].concluidos == 4


def test_acerto_por_disciplina_e_assunto_com_o_gabarito_atual(sessao, settings, base_sintetica):
    _marcar(sessao, "2099-001", marcadas_a=1, marcadas_c=3, em_branco=1)  # gabarito C (biologia)
    _marcar(sessao, "2099-006", marcadas_a=1, marcadas_b=3)  # gabarito A (geografia)
    _marcar(sessao, "2099-009", marcadas_a=10)  # anulada: fora
    _marcar(sessao, "2097-001", marcadas_a=5)  # saiu da base: fora
    sessao.commit()
    taxonomia = taxonomia_em_uso(settings.data_dir)

    disciplinas = _aprendizado(sessao, settings).disciplinas

    assert [(d.disciplina, d.respostas, d.acertos, d.percentual) for d in disciplinas] == [
        ("geografia", 4, 1, 25.0),  # do pior para o melhor
        ("biologia", 5, 3, 60.0),
    ]
    assert [a.model_dump() for a in disciplinas[1].assuntos] == [{
        "assunto": "tema-b", "nome": taxonomia.nome("biologia", "tema-b"), "respostas": 5, "acertos": 3,
        "percentual": 60.0,
    }]

    # Gabarito corrigido: a estatistica acompanha (T5)
    sessao.get(Questao, "2099-001").resposta = "A"
    sessao.commit()
    disciplinas = _aprendizado(sessao, settings).disciplinas
    assert [(d.disciplina, d.percentual) for d in disciplinas] == [("biologia", 20.0), ("geografia", 25.0)]


def _simulado(usuario: Usuario, ident: str, finalizado: int, modo: str, acertos: int, total: int):
    return SimuladoConcluido(
        usuario_id=usuario.id, id=ident, finalizado_em_ms=finalizado,
        dados={"modo": modo, "resultado": {"acertos": acertos, "total": total}},
    )


def test_carreiras_alvo_com_cortes_e_quem_atingiria(sessao, settings, base_sintetica):
    contas = [
        Usuario(google_sub=s, email=f"{s}@x.com", carreira_alvo_ano=ano, carreira_alvo_codigo=codigo)
        for s, ano, codigo in [("ana", 2099, 102), ("beto", 2099, 102), ("dani", 2099, 102), ("caio", 2098, 999)]
    ]
    sessao.add_all([*contas, Usuario(google_sub="sem", email="sem@x.com")])
    sessao.flush()
    ana, beto = contas[0], contas[1]
    sessao.add_all([
        _simulado(ana, "a1", 1, "completa", 10, 80),  # antiga
        _simulado(ana, "a2", 5, "completa", 72, 80),  # 72/80 de 90 = 81,0: atinge os tres
        _simulado(ana, "a3", 9, "ano", 0, 90),  # mais recente, mas nao e Prova completa
        _simulado(beto, "b1", 3, "completa", 70, 90),  # mesma escala: so a PPI (62)
    ])
    sessao.commit()

    medicina, fora = _aprendizado(sessao, settings).carreiras

    assert medicina.model_dump() == {
        "ano": 2099,
        "codigo": 102,
        "nome": "Medicina (São Paulo, Ribeirão Preto)",
        "pontos_prova": 90,
        "cortes": {"ac": 81, "ep": 73, "ppi": 62},
        "estudantes": 3,
        "com_prova_completa": 2,
        "atingiriam": {"ac": 1, "ep": 1, "ppi": 2},
    }
    assert (fora.ano, fora.codigo, fora.nome, fora.cortes, fora.atingiriam, fora.estudantes) == (
        2098, 999, None, None, None, 1,
    )


def test_http_aprendizado(client_admin, base_sintetica):
    resposta = client_admin.get("/api/gestao/aprendizado", params={"periodo": "90"})

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert [m["modo"] for m in corpo["modos"]] == ["completa", "personalizado", "ano"]
    assert corpo["disciplinas"] == [] and corpo["carreiras"] == []
