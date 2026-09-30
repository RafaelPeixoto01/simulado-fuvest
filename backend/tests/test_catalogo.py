"""BT-001 / BT-002: catalogo e distribuicao da prova completa (RN-003)."""

from collections import Counter

from app.disciplinas import NOMES_DISCIPLINAS
from app.models import Questao
from app.services.catalogo import distribuicao_completa
from app.services.serializacao import questao_publica
from tests.fixtures.gerar_pacotes import TEMAS, gerar_pacote


def test_distribuicao_maior_resto_com_desempate_alfabetico():
    # medias: fisica 44.5, biologia 45.5 -> pisos 44 + 45 = 89; a unidade que falta
    # vai para o maior resto (empate 0.5/0.5 -> ordem alfabetica: biologia)
    contagens = [{"fisica": 45, "biologia": 45}, {"fisica": 44, "biologia": 46}]

    assert distribuicao_completa(contagens) == {"biologia": 46, "fisica": 44}


def test_distribuicao_sempre_soma_90():
    contagens = [{"fisica": 30, "quimica": 30, "biologia": 30}, {"fisica": 31, "quimica": 29, "biologia": 30}]

    distribuicao = distribuicao_completa(contagens)

    assert sum(distribuicao.values()) == 90
    assert distribuicao == {"biologia": 30, "fisica": 31, "quimica": 29}


def test_distribuicao_sem_provas():
    assert distribuicao_completa([]) == {}


def test_catalogo_com_base_sintetica(client, base_sintetica):
    resposta = client.get("/api/catalogo")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert [p["ano"] for p in dados["provas"]] == [2099, 2098]
    assert dados["provas"][0]["url_prova"] == "https://exemplo.test/2099/prova.pdf"

    validas = [q for ano in (2098, 2099) for q in gerar_pacote(ano).questoes if not q.anulada]
    por_disciplina = Counter(q.disciplina.value for q in validas)
    assert dados["total_questoes"] == len(validas)
    assert {d["slug"]: d["total_questoes"] for d in dados["disciplinas"]} == por_disciplina
    assert [d["nome"] for d in dados["disciplinas"]] == sorted(NOMES_DISCIPLINAS.values())
    assert sum(dados["distribuicao_completa"].values()) == 90
    assert dados["completa_disponivel"] is True


def test_catalogo_de_base_vazia(client):
    dados = client.get("/api/catalogo").json()

    assert dados["provas"] == []
    assert dados["total_questoes"] == 0
    assert dados["distribuicao_completa"] == {}
    assert dados["completa_disponivel"] is False
    assert all(d["total_questoes"] == 0 for d in dados["disciplinas"])
    assert all(d["assuntos"] == [] for d in dados["disciplinas"])  # sem taxonomia no DATA_DIR


def test_serializacao_publica_troca_figura_por_url_e_omite_gabarito():
    q = Questao(
        id="2099-020", prova_ano=2099, numero=20, texto_base_id=None,
        enunciado=[{"texto": "Veja"}, {"figura": "q020-1.webp"}],
        alternativas={"A": {"texto": "a"}, "C": {"figura": "q020-c.webp"}},
        resposta="C", anulada=False, disciplina="fisica", disciplinas_secundarias=[],
    )

    publica = questao_publica(q).model_dump()

    assert publica["enunciado"][1] == {"texto": None, "figura": "/figuras/2099/q020-1.webp"}
    assert publica["alternativas"]["C"]["figura"] == "/figuras/2099/q020-c.webp"
    assert "resposta" not in publica and "anulada" not in publica


def test_catalogo_traz_os_assuntos_de_cada_disciplina(client, base_sintetica):
    """BT-025 (CR-004): ordem da taxonomia, totais sem anuladas, inclusive assunto com 0."""
    validas = [q for ano in (2098, 2099) for q in gerar_pacote(ano).questoes if not q.anulada]
    esperado = Counter((q.disciplina.value, q.assunto) for q in validas)

    dados = client.get("/api/catalogo").json()

    for disciplina in dados["disciplinas"]:
        assuntos = disciplina["assuntos"]
        assert [a["slug"] for a in assuntos] == list(TEMAS)
        assert [a["nome"] for a in assuntos] == ["Tema A", "Tema B", "Tema C"]
        assert {a["slug"]: a["total_questoes"] for a in assuntos} == {
            t: esperado[(disciplina["slug"], t)] for t in TEMAS
        }
        assert sum(a["total_questoes"] for a in assuntos) == disciplina["total_questoes"]


def test_catalogo_lista_assunto_sem_questoes_com_zero(client, base_sintetica):
    import yaml

    arquivo = base_sintetica / "assuntos.yaml"
    dados = yaml.safe_load(arquivo.read_text(encoding="utf-8"))
    dados["fisica"].append({"slug": "novo", "nome": "Assunto novo"})
    arquivo.write_text(yaml.safe_dump(dados, allow_unicode=True), encoding="utf-8")

    fisica = next(
        d for d in client.get("/api/catalogo").json()["disciplinas"] if d["slug"] == "fisica"
    )

    assert fisica["assuntos"][-1] == {"slug": "novo", "nome": "Assunto novo", "total_questoes": 0}
