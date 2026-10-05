"""IT-028, IT-029, IT-031 (CR-011): simulado oficial e total de questoes no pacote (ADR-015)."""

import pytest
from pydantic import ValidationError

from app.pacote.leitura import ARQUIVO_PACOTE, DIR_FIGURAS, carregar_pacote, salvar_pacote
from app.pacote.schema import PacoteProva, codigo_da_prova, rotulo_da_prova
from app.pacote.validacao import validar_pacote
from tests.fixtures.gerar_pacotes import escrever_pacotes, gerar_pacote, taxonomia_sintetica

TAXONOMIA = taxonomia_sintetica()


def _dados(**campos) -> dict:
    dados = gerar_pacote(2099).model_dump(mode="json")
    dados.update(campos)
    return dados


def test_simulado_oficial_valido(tmp_path):
    """IT-028: tipo, edicao, 80 questoes e versao S1; o codigo e o diretorio."""
    (dir_simulado,) = escrever_pacotes(tmp_path, anos=(), simulados=((2027, 1),))
    pacote = carregar_pacote(dir_simulado)

    assert dir_simulado.name == pacote.codigo == "2027s1"
    assert (pacote.tipo, pacote.edicao, pacote.versao, pacote.total_questoes) == ("simulado", 1, "S1", 80)
    assert validar_pacote(pacote, dir_simulado / DIR_FIGURAS, TAXONOMIA) == []


@pytest.mark.parametrize(
    "campos",
    [
        {"tipo": "simulado"},  # simulado sem edicao
        {"edicao": 1},  # edicao em vestibular
        {"tipo": "simulado", "edicao": 0},
        {"tipo": "simulado", "edicao": 10},
        {"total_questoes": 85},
        {"tipo": "prova"},
        {"versao": "S5"},
    ],
)
def test_pacote_invalido_no_schema(campos):
    """IT-028: so 80 ou 90 questoes; edicao (1-9) existe so no simulado."""
    with pytest.raises(ValidationError):
        PacoteProva.model_validate(_dados(**campos))


def test_codigo_e_rotulo_da_prova():
    assert codigo_da_prova(2025, None) == "2025"
    assert codigo_da_prova(2027, 2) == "2027s2"
    assert rotulo_da_prova(2025, None) == "FUVEST 2025"
    assert rotulo_da_prova(2027, 1) == "Simulado FUVEST 2027 · 1ª edição"


def test_v01_confere_o_total_do_pacote(tmp_path):
    """IT-029: o simulado de 80 acusa a 81 e a falta de uma; o mesmo pacote com 90 acusa as 10."""
    (dir_simulado,) = escrever_pacotes(tmp_path, anos=(), simulados=((2027, 1),))
    pacote = carregar_pacote(dir_simulado)
    figuras = dir_simulado / DIR_FIGURAS
    pacote.questoes[-1].numero = 81

    mensagens = [p.mensagem for p in validar_pacote(pacote, figuras, TAXONOMIA) if p.codigo == "V01"]
    assert mensagens == ["Faltam as questões: 80", "Questões além do total de 80: 81"]

    pacote.questoes[-1].numero = 80
    pacote.total_questoes = 90
    mensagens = [p.mensagem for p in validar_pacote(pacote, figuras, TAXONOMIA) if p.codigo == "V01"]
    assert mensagens[0] == "Esperadas 90 questões, encontradas 80"


def test_pacote_de_vestibular_sem_os_campos_novos_continua_valido(tmp_path):
    """IT-031: os 5 pacotes publicados nao tem tipo, edicao nem total_questoes (padroes);
    regravados, continuam sem essas chaves."""
    (dir_prova,) = escrever_pacotes(tmp_path, anos=(2099,))
    texto = (dir_prova / ARQUIVO_PACOTE).read_text(encoding="utf-8")
    assert not {"tipo:", "edicao:", "total_questoes:"} & {linha.split(" ")[0] for linha in texto.splitlines()}

    pacote = carregar_pacote(dir_prova)
    assert (pacote.tipo, pacote.edicao, pacote.total_questoes, pacote.codigo) == ("vestibular", None, 90, "2099")

    salvar_pacote(pacote, dir_prova)
    assert (dir_prova / ARQUIVO_PACOTE).read_text(encoding="utf-8") == texto


def test_simulado_salvo_traz_os_campos_explicitos(tmp_path):
    (dir_simulado,) = escrever_pacotes(tmp_path, anos=(), simulados=((2027, 2),))

    inicio = (dir_simulado / ARQUIVO_PACOTE).read_text(encoding="utf-8").splitlines()[:5]

    assert inicio == ["ano: 2027", "tipo: simulado", "edicao: 2", "versao: S1", "total_questoes: 80"]
