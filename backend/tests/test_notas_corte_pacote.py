"""IT-021 a IT-023: notas de corte como conteudo versionado (specs/08-notas-de-corte.md §2.3, §2.7)."""

import logging
import os

import pytest
import yaml

from app.config import RAIZ_PROJETO
from app.pacote.notas_corte import (
    DIRETORIO_NOTAS_CORTE,
    NotasCorteInvalidas,
    arquivos_de_notas_corte,
    carregar_ano,
    notas_corte_em_uso,
    problemas_de_publicacao,
    salvar_ano,
)
from tests.fixtures.gerar_pacotes import escrever_notas_corte, notas_corte_sinteticas


def _dados(ano: int = 2099) -> dict:
    return notas_corte_sinteticas(ano).model_dump(mode="json")


def _gravar(data_dir, dados, nome: str | None = None):
    diretorio = data_dir / DIRETORIO_NOTAS_CORTE
    diretorio.mkdir(parents=True, exist_ok=True)
    caminho = diretorio / (nome or f"{dados['ano']}.yaml")
    caminho.write_text(yaml.safe_dump(dados, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return caminho


# IT-021 — schema e carga estrita (C01)


def test_arquivo_valido_carrega(tmp_path):
    caminho = _gravar(tmp_path, _dados())

    notas = carregar_ano(caminho)

    assert notas.ano == 2099 and notas.status == "publicada"
    carreira = next(c for c in notas.carreiras if c.codigo == 101)
    assert carreira.vagas == carreira.ac.vagas + carreira.ep.vagas + carreira.ppi.vagas
    assert problemas_de_publicacao(notas) == []


def test_ano_diferente_do_nome_do_arquivo_e_recusado(tmp_path):
    caminho = _gravar(tmp_path, _dados(), nome="2098.yaml")

    with pytest.raises(NotasCorteInvalidas, match="C01"):
        carregar_ano(caminho)


def test_yaml_malformado_e_recusado(tmp_path):
    caminho = _gravar(tmp_path, _dados())
    caminho.write_text("ano: [", encoding="utf-8")

    with pytest.raises(NotasCorteInvalidas):
        carregar_ano(caminho)


@pytest.mark.parametrize(
    ("alterar", "trecho"),
    [
        (lambda d: d.update(extra=1), "extra"),
        (lambda d: d["carreiras"][0].update(campus="x"), "campus"),
        (lambda d: d["carreiras"][0]["ac"].update(inscritos=10), "inscritos"),
        (lambda d: d.update(status="aprovada"), "status"),
        (lambda d: d.update(fonte="https://exemplo.com/x.pdf"), "fonte"),
        (lambda d: d["carreiras"][0].update(codigo=99), "codigo"),
        (lambda d: d["carreiras"][0].update(nome=""), "nome"),
        (lambda d: d["carreiras"][0].update(nome="Medicina "), "nome"),
        (lambda d: d["carreiras"][0].pop("ppi"), "ppi"),
        (lambda d: d.update(carreiras=[]), "carreiras"),
    ],
)
def test_fora_do_schema_e_recusado(tmp_path, alterar, trecho):
    dados = _dados()
    alterar(dados)
    caminho = _gravar(tmp_path, dados)

    with pytest.raises(NotasCorteInvalidas, match=trecho):
        carregar_ano(caminho)


def test_salvar_e_carregar_preservam_o_conteudo(tmp_path):
    notas = notas_corte_sinteticas(2099)
    caminho = tmp_path / DIRETORIO_NOTAS_CORTE / "2099.yaml"

    salvar_ano(notas, caminho)

    bruto = caminho.read_bytes()
    assert b"\r\n" not in bruto
    assert bruto.startswith("# Notas de corte da 1ª fase — FUVEST 2099".encode())
    assert b"ac: {vagas: " in bruto  # uma modalidade por linha
    assert carregar_ano(caminho) == notas


# IT-022 — regras C02 a C05


@pytest.mark.parametrize(
    "modalidade",
    [
        {"vagas": 10, "convocados": 30, "corte": 26, "maximo": 60},  # abaixo do minimo da FUVEST
        {"vagas": 10, "convocados": 30, "corte": 61, "maximo": 60},  # corte acima do maximo
        {"vagas": 10, "convocados": 30, "corte": 50, "maximo": 91},  # acima de 90
        {"vagas": 10, "convocados": 0, "corte": 30, "maximo": 40},  # corte sem convocados
        {"vagas": 10, "convocados": 30, "corte": None, "maximo": None},  # convocados sem corte
        {"vagas": 0, "convocados": 3, "corte": 40, "maximo": 50},  # convocados sem vagas
    ],
)
def test_c04_vale_ate_no_rascunho(tmp_path, modalidade):
    dados = _dados()
    dados["status"] = "rascunho"
    dados["carreiras"][0]["ep"] = modalidade
    caminho = _gravar(tmp_path, dados)

    with pytest.raises(NotasCorteInvalidas):
        carregar_ano(caminho)


def test_modalidade_sem_convocados_aceita_corte_vazio(tmp_path):
    notas = carregar_ano(_gravar(tmp_path, _dados()))

    sem_convocados = [c for c in notas.carreiras if c.ppi.convocados == 0]
    assert sem_convocados and sem_convocados[0].ppi.corte is None


def test_modalidade_sem_vagas_e_aceita(tmp_path):
    """2020/150 e 2022/185: PPI sem vagas, celulas "−−−" no PDF."""
    dados = _dados()
    dados["carreiras"][0]["ppi"] = {"vagas": 0, "convocados": 0, "corte": None, "maximo": None}

    notas = carregar_ano(_gravar(tmp_path, dados))

    assert notas.carreiras[0].ppi.vagas == 0


def _problemas(alterar) -> list[str]:
    notas = notas_corte_sinteticas(2099)
    alterar(notas)
    return problemas_de_publicacao(notas)


def test_c02_codigo_e_nome_repetidos_e_treineiro():
    def repetir(notas):
        notas.carreiras[1].codigo = notas.carreiras[0].codigo
        notas.carreiras[2].nome = notas.carreiras[0].nome.upper()
        notas.carreiras[3].nome = "Treinamento E (Exatas)"

    problemas = _problemas(repetir)

    assert any(p.startswith("C02: código repetido") for p in problemas)
    assert any(p.startswith("C02: nome repetido") for p in problemas)
    assert any(p.startswith("C02: carreira de treineiro") for p in problemas)


@pytest.mark.parametrize("nome", ["Engenharia Agronômica; Engenharia Bioquímica; Engenharia de...", "Física / Meteor…"])
def test_c03_nome_cortado(nome):
    def cortar(notas):
        notas.carreiras[0].nome = nome

    assert any(p.startswith("C03") for p in _problemas(cortar))


def test_c05_pendencia_em_aberto():
    def pendente(notas):
        notas.pendencias = ["Carreira 101: nome repetido"]

    assert _problemas(pendente) == ["C05: 1 pendência em aberto"]


def test_rascunho_com_problemas_de_publicacao_carrega(tmp_path):
    dados = _dados()
    dados["status"] = "rascunho"
    dados["carreiras"][1]["nome"] = dados["carreiras"][0]["nome"]
    dados["pendencias"] = ["Carreira 102: nome repetido"]

    notas = carregar_ano(_gravar(tmp_path, dados))

    assert len(problemas_de_publicacao(notas)) == 2


# IT-023 — carga tolerante para a API


def test_em_uso_so_publicados_e_validos(tmp_path, caplog):
    escrever_notas_corte(tmp_path, anos=(2097, 2098, 2099))
    rascunho = _dados(2097)
    rascunho["status"] = "rascunho"
    _gravar(tmp_path, rascunho)
    _gravar(tmp_path, {"ano": 2096}, nome="2096.yaml")  # invalido
    com_problema = _dados(2095)
    com_problema["pendencias"] = ["algo"]
    _gravar(tmp_path, com_problema)

    with caplog.at_level(logging.WARNING):
        base = notas_corte_em_uso(tmp_path)

    assert base.anos == [2099, 2098]
    assert base.recente == 2099
    assert base.ano(2097) is None
    assert base.carreira(2099, 101).codigo == 101
    assert base.carreira(2099, 999) is None
    assert base.carreira(2050, 101) is None
    assert "2096.yaml" in caplog.text and "2095.yaml" in caplog.text


def test_em_uso_sem_diretorio(tmp_path):
    base = notas_corte_em_uso(tmp_path)

    assert base.anos == [] and base.recente is None
    assert arquivos_de_notas_corte(tmp_path) == []


def test_em_uso_reflete_troca_do_arquivo(tmp_path):
    escrever_notas_corte(tmp_path, anos=(2099,))
    assert notas_corte_em_uso(tmp_path).carreira(2099, 101).nome != "Nome novo"

    caminho = tmp_path / DIRETORIO_NOTAS_CORTE / "2099.yaml"
    dados = yaml.safe_load(caminho.read_text(encoding="utf-8"))
    dados["carreiras"][0]["nome"] = "Nome novo"
    caminho.write_text(yaml.safe_dump(dados, allow_unicode=True), encoding="utf-8")
    stat = caminho.stat()
    os.utime(caminho, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000_000))

    assert notas_corte_em_uso(tmp_path).carreira(2099, 101).nome == "Nome novo"


def test_notas_corte_do_repositorio_sao_validas():
    data_dir = RAIZ_PROJETO / "data" / "provas"
    for caminho in arquivos_de_notas_corte(data_dir):
        notas = carregar_ano(caminho)
        if notas.status == "publicada":
            assert problemas_de_publicacao(notas) == [], caminho.name
