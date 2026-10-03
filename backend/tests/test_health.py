from datetime import UTC, datetime

from app.models import Prova


def test_health_responde_ok_com_zero_provas(client):
    resposta = client.get("/api/health")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "provas": 0}


def test_health_conta_provas_sincronizadas(client, sessao):
    sessao.add(
        Prova(
            codigo="2098",
            ano=2098,
            tipo="vestibular",
            versao="V1",
            url_prova="https://exemplo.test/p.pdf",
            url_gabarito="https://exemplo.test/g.pdf",
            total_questoes=90,
            sincronizado_em=datetime.now(UTC),
        )
    )
    sessao.commit()

    assert client.get("/api/health").json()["provas"] == 1


def test_rota_api_inexistente_retorna_404_json(client):
    resposta = client.get("/api/nao-existe")

    assert resposta.status_code == 404
    assert resposta.headers["content-type"].startswith("application/json")
