def test_health_responde_ok(client):
    resposta = client.get("/api/health")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "ok"


def test_rota_api_inexistente_retorna_404_json(client):
    resposta = client.get("/api/nao-existe")

    assert resposta.status_code == 404
    assert resposta.headers["content-type"].startswith("application/json")
