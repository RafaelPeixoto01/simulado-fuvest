"""BT-092 a BT-096 (CR-011): ids e figuras pelo codigo da prova, vitrine e cortes de 80 pontos."""

import re

import pytest
import yaml

from app.pacote.notas_corte import (
    DIRETORIO_NOTAS_CORTE,
    NotasCorteInvalidas,
    carregar_ano,
    minimo_fuvest,
)
from tests.contas import entrada_historico
from tests.fixtures.gerar_pacotes import notas_corte_sinteticas

ORIGEM = {"Origin": "http://localhost:5173"}


# BT-092 — ids CODIGO-NNN em todas as rotas que recebem id


def test_ids_de_simulado_nas_questoes_correcao_reportes_e_treino(client, base_com_simulado):
    questoes = client.get("/api/questoes", params={"ids": "2099s1-030,2099-030,2099s2-001"}).json()
    assert [q["id"] for q in questoes["questoes"]] == ["2099s1-030", "2099-030"]
    assert questoes["nao_encontradas"] == ["2099s2-001"]
    assert set(questoes["textos_base"]) == {"2099s1-tb02", "2099-tb02"}
    assert questoes["questoes"][0]["origem"] == "Simulado FUVEST 2099 · 1ª edição"

    correcao = client.post(
        "/api/correcoes", json={"respostas": [{"questao_id": "2099s1-001", "resposta": "A"}]}
    )
    assert correcao.status_code == 200 and correcao.json()["itens"][0]["questao_id"] == "2099s1-001"

    reporte = client.post("/api/reportes", json={"questao_id": "2099s1-001", "tipo": "outro"})
    assert reporte.status_code == 201

    treino = client.post(
        "/api/simulados", json={"modo": "treino", "excluir": ["2099s1-001", "2099-001"], "semente": 1}
    )
    assert treino.status_code == 200


def test_formatos_de_id_invalidos_422(client, base_com_simulado):
    for invalido in ("2099S1-001", "2099s0-001", "2099s10-001", "2099s1-01", "s1-001"):
        assert client.get("/api/questoes", params={"ids": invalido}).status_code == 422, invalido
        corpo = {"respostas": [{"questao_id": invalido, "resposta": "A"}]}
        assert client.post("/api/correcoes", json=corpo).status_code == 422, invalido
        assert client.post("/api/reportes", json={"questao_id": invalido, "tipo": "outro"}).status_code == 422


def test_historico_aceita_ids_de_simulado(client_logado):
    entrada = entrada_historico("sim-oficial")
    entrada["questaoIds"] = ["2099s1-001"]
    entrada["resultado"]["itens"][0]["questao_id"] = "2099s1-001"

    resposta = client_logado.post("/api/historico", json={"entradas": [entrada]}, headers=ORIGEM)

    assert resposta.status_code == 200
    assert resposta.json()["rejeitadas"] == []


# BT-093 — figuras pelo codigo


def test_figura_do_simulado_e_codigo_invalido(client, base_com_simulado):
    assert client.get("/figuras/2099s1/q015-1.webp").status_code == 200
    for caminho in ("/figuras/2099S1/q015-1.webp", "/figuras/2099s/q015-1.webp", "/figuras/2099s2/q015-1.webp"):
        assert client.get(caminho).status_code == 404, caminho


# BT-094 — vitrine: questoes dos simulados no total, anos so dos vestibulares


def test_vitrine_conta_as_questoes_do_simulado_mas_nao_o_ano(client, base_com_simulado):
    catalogo = client.get("/api/catalogo").json()

    vitrine = client.get("/api/vitrine").json()

    assert vitrine == {"total_questoes": catalogo["total_questoes"], "anos": [2098, 2099]}


# BT-095 — notas de corte de 80 pontos


def _cortes_de_80(ano: int = 2099) -> dict:
    dados = notas_corte_sinteticas(ano).model_dump(mode="json")
    dados["pontos_prova"] = 80
    for carreira in dados["carreiras"]:
        for chave in ("ac", "ep", "ppi"):
            m = carreira[chave]
            if m["corte"] is not None:
                m["corte"], m["maximo"] = min(m["corte"], 70) - 3, min(m["maximo"], 80)
    return dados


def _gravar(data_dir, dados):
    caminho = data_dir / DIRETORIO_NOTAS_CORTE / f"{dados['ano']}.yaml"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(yaml.safe_dump(dados, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return caminho


def test_minimo_da_fuvest_e_30_por_cento_dos_pontos():
    assert (minimo_fuvest(90), minimo_fuvest(80)) == (27, 24)


def test_cortes_de_80_pontos_aceitam_de_24_a_80(tmp_path):
    dados = _cortes_de_80()
    dados["carreiras"][0]["ac"].update(corte=24, maximo=80)

    assert carregar_ano(_gravar(tmp_path, dados)).pontos_prova == 80


def test_cortes_fora_da_faixa_do_ano_sao_recusados(tmp_path):
    abaixo = _cortes_de_80()
    abaixo["carreiras"][0]["ac"]["corte"] = 23  # abaixo de 24 (30% de 80)
    acima = _cortes_de_80()
    acima["carreiras"][0]["ac"]["maximo"] = 81
    noventa = notas_corte_sinteticas(2099).model_dump(mode="json")
    noventa["carreiras"][0]["ac"]["corte"] = 25  # valido em 80, abaixo de 27 em 90
    for dados in (abaixo, acima, noventa):
        with pytest.raises(NotasCorteInvalidas, match="C04"):
            carregar_ano(_gravar(tmp_path, dados))


# BT-096 — pontos_prova na API e na carreira-alvo da sessao


def test_api_e_sessao_trazem_os_pontos_da_prova(client_logado, base_sintetica):
    _gravar(base_sintetica, _cortes_de_80())  # 2099 passa a ser de 80 pontos

    notas = client_logado.get("/api/notas-corte").json()
    assert (notas["ano"], notas["pontos_prova"]) == (2099, 80)
    assert client_logado.get("/api/notas-corte", params={"ano": 2098}).json()["pontos_prova"] == 90

    resposta = client_logado.put(
        "/api/conta/carreira-alvo", json={"ano": 2099, "codigo": 102}, headers=ORIGEM
    )
    assert resposta.status_code == 200 and resposta.json()["pontos_prova"] == 80
    assert client_logado.get("/api/sessao").json()["usuario"]["carreira_alvo"]["pontos_prova"] == 80


def test_pontos_da_prova_coerentes_com_o_ano(tmp_path):
    """Revisao de codigo do CR-011: de 2027 em diante o arquivo declara a escala (um ano de 80
    nunca e lido como de 90 por falta da chave); ate 2026 so vale 90."""
    sem_chave = notas_corte_sinteticas(2027).model_dump(mode="json")
    del sem_chave["pontos_prova"]
    with pytest.raises(NotasCorteInvalidas, match="informe pontos_prova"):
        carregar_ano(_gravar(tmp_path, sem_chave))

    oitenta_em_2025 = _cortes_de_80(2025)
    with pytest.raises(NotasCorteInvalidas, match="até 2026 a 1ª fase vale 90"):
        carregar_ano(_gravar(tmp_path, oitenta_em_2025))

    assert carregar_ano(_gravar(tmp_path, _cortes_de_80(2027))).pontos_prova == 80


def test_questoes_de_varias_provas_sem_consulta_extra_da_prova(client, app, base_com_simulado):
    """Revisao de codigo do CR-011: a origem vem da prova carregada junto (joinedload), sem uma
    consulta a `provas` por prova."""
    from sqlalchemy import event

    comandos: list[str] = []

    def registrar(_conn, _cursor, comando, *_args):
        comandos.append(comando)

    event.listen(app.state.engine, "before_cursor_execute", registrar)
    try:
        resposta = client.get("/api/questoes", params={"ids": "2098-001,2099-001,2099s1-001"})
    finally:
        event.remove(app.state.engine, "before_cursor_execute", registrar)

    assert resposta.status_code == 200
    assert {q["origem"] for q in resposta.json()["questoes"]} == {
        "FUVEST 2098", "FUVEST 2099", "Simulado FUVEST 2099 · 1ª edição",
    }
    # A carga preguicosa seria um "SELECT ... FROM provas WHERE provas.codigo = ?" por prova
    so_da_prova = [c for c in comandos if re.search(r"FROM provas\s+WHERE", c)]
    assert so_da_prova == []
