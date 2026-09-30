"""BT-014 / BT-015: consulta de questoes por id (retomar simulado)."""


def test_questoes_na_ordem_pedida_com_inexistentes(client, base_sintetica):
    resposta = client.get("/api/questoes", params={"ids": "2099-030,2098-001,2050-001,2099-030"})

    assert resposta.status_code == 200
    dados = resposta.json()
    assert [q["id"] for q in dados["questoes"]] == ["2099-030", "2098-001"]
    assert dados["nao_encontradas"] == ["2050-001"]
    assert set(dados["textos_base"]) == {"2099-tb02"}
    assert "resposta" not in dados["questoes"][0]


def test_ids_invalidos_422(client, base_sintetica):
    ids_demais = ",".join(f"2099-{n:03d}" for n in range(1, 92))
    for ids in ("", "abc", "2099-1", ids_demais):
        assert client.get("/api/questoes", params={"ids": ids}).status_code == 422, ids


def test_sem_parametro_ids_422(client):
    assert client.get("/api/questoes").status_code == 422
