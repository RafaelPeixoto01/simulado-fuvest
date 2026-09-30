"""IT-002 / IT-003 / IT-015: regras V01-V11 (specs/01-ingestao.md §2.4)."""

import pytest

from app.disciplinas import Disciplina
from app.pacote.assuntos import Taxonomia
from app.pacote.leitura import DIR_FIGURAS, carregar_pacote
from app.pacote.schema import Alternativa, Bloco
from app.pacote.validacao import tem_bloqueante, validar_pacote
from tests.fixtures.gerar_pacotes import escrever_pacotes, taxonomia_sintetica

TAXONOMIA = taxonomia_sintetica()


@pytest.fixture
def pacote_e_figuras(tmp_path):
    (dir_prova,) = escrever_pacotes(tmp_path, anos=(2099,))
    return carregar_pacote(dir_prova), dir_prova / DIR_FIGURAS


def _codigos(pendencias):
    return {(p.codigo, p.questao, p.bloqueante) for p in pendencias}


def test_pacote_sintetico_valido_nao_tem_pendencias(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras

    pendencias = validar_pacote(pacote, figuras, TAXONOMIA)

    assert pendencias == []
    assert not tem_bloqueante(pendencias)


def test_v01_quantidade_e_numeracao(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes.pop()  # some a 90
    pacote.questoes[1].numero = 1  # 1 repetido, 2 faltando

    codigos = [p for p in validar_pacote(pacote, figuras, TAXONOMIA) if p.codigo == "V01"]

    assert codigos and all(p.bloqueante for p in codigos)
    mensagens = " | ".join(p.mensagem for p in codigos)
    assert "89" in mensagens and "repetido" in mensagens and "2" in mensagens


def test_v02_enunciado_vazio_ou_em_branco(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[0].enunciado = []
    pacote.questoes[1].enunciado = [Bloco(texto="   ")]

    assert {("V02", 1, True), ("V02", 2, True)} <= _codigos(validar_pacote(pacote, figuras, TAXONOMIA))


def test_v03_alternativa_faltando_ou_vazia(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    del pacote.questoes[0].alternativas["E"]
    pacote.questoes[1].alternativas["B"] = Alternativa(texto=" ")

    assert {("V03", 1, True), ("V03", 2, True)} <= _codigos(validar_pacote(pacote, figuras, TAXONOMIA))


def test_v04_resposta_coerente_com_anulada(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[0].anulada = False
    pacote.questoes[0].resposta = None
    pacote.questoes[1].anulada = True
    pacote.questoes[1].resposta = "A"

    assert {("V04", 1, True), ("V04", 2, True)} <= _codigos(validar_pacote(pacote, figuras, TAXONOMIA))


def test_v05_disciplina_obrigatoria(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[4].disciplina = None

    assert ("V05", 5, True) in _codigos(validar_pacote(pacote, figuras, TAXONOMIA))


def test_v06_figura_inexistente_ou_nome_invalido(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[0].enunciado.append(Bloco(figura="q001-9.webp"))  # nao existe
    pacote.questoes[1].enunciado.append(Bloco(figura="../prova.yaml"))  # nome invalido
    pacote.textos_base[0].conteudo.append(Bloco(figura="tb01-9.webp"))  # nao existe

    codigos = _codigos(validar_pacote(pacote, figuras, TAXONOMIA))

    assert {("V06", 1, True), ("V06", 2, True), ("V06", None, True)} <= codigos


def test_v07_texto_base_inexistente_ou_inconsistente(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[0].texto_base = "tb77"  # nao existe
    pacote.textos_base[0].questoes = [10]  # questao 11 tambem o referencia

    codigos = _codigos(validar_pacote(pacote, figuras, TAXONOMIA))

    assert ("V07", 1, True) in codigos
    assert ("V07", None, True) in codigos


def test_v08_pendencia_do_parser_bloqueia(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[36].pendencias = ["Possível figura vetorial na página 12"]

    pendencias = validar_pacote(pacote, figuras, TAXONOMIA)

    assert ("V08", 37, True) in _codigos(pendencias)
    assert any("figura vetorial" in p.mensagem for p in pendencias)


def test_v09_secundarias_duplicadas_ou_com_a_principal(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    q1, q2 = pacote.questoes[0], pacote.questoes[1]
    q1.disciplinas_secundarias = [q1.disciplina]
    q2.disciplinas_secundarias = [Disciplina.INGLES, Disciplina.INGLES]
    if q2.disciplina == Disciplina.INGLES:
        q2.disciplinas_secundarias = [Disciplina.QUIMICA, Disciplina.QUIMICA]

    assert {("V09", 1, True), ("V09", 2, True)} <= _codigos(validar_pacote(pacote, figuras, TAXONOMIA))


def test_v10_figura_orfa_e_so_aviso(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    (figuras / "q099-1.webp").write_bytes(b"RIFF")

    pendencias = validar_pacote(pacote, figuras, TAXONOMIA)

    assert ("V10", None, False) in _codigos(pendencias)
    assert not tem_bloqueante(pendencias)


def test_v11_assunto_obrigatorio(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    pacote.questoes[2].assunto = None

    pendencias = validar_pacote(pacote, figuras, TAXONOMIA)

    assert ("V11", 3, True) in _codigos(pendencias)
    assert any(p.codigo == "V11" and "não definido" in p.mensagem for p in pendencias)


def test_v11_assunto_da_taxonomia_da_disciplina_principal(pacote_e_figuras):
    pacote, figuras = pacote_e_figuras
    # Cada disciplina ganha um assunto exclusivo: o de outra disciplina nao vale
    taxonomia = Taxonomia.model_validate({
        d.value: [*TAXONOMIA.model_dump(mode="json")[d.value], {"slug": f"so-{d.value}", "nome": "Só"}]
        for d in Disciplina
    })
    q1, q2, q3 = pacote.questoes[:3]
    outra = next(d for d in Disciplina if d != q1.disciplina)
    q1.assunto = f"so-{outra.value}"
    q2.assunto = "inexistente"
    q3.assunto = f"so-{q3.disciplina.value}"

    pendencias = [p for p in validar_pacote(pacote, figuras, taxonomia) if p.codigo == "V11"]

    assert {(p.questao, p.bloqueante) for p in pendencias} == {(1, True), (2, True)}
    assert "inexistente" in next(p.mensagem for p in pendencias if p.questao == 2)


def test_v11_sem_taxonomia_so_acusa_a_ausencia(pacote_e_figuras):
    """`extrair`: rascunho recem-extraido, sem taxonomia carregada."""
    pacote, figuras = pacote_e_figuras
    pacote.questoes[0].assunto = None
    pacote.questoes[1].assunto = "qualquer-coisa"

    codigos = _codigos(validar_pacote(pacote, figuras, None))

    assert ("V11", 1, True) in codigos
    assert not any(c[0] == "V11" and c[1] == 2 for c in codigos)
