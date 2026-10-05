"""BT-001 / BT-002 / BT-088 / BT-089: catalogo e distribuicao da prova completa (RN-003, CR-011)."""

from collections import Counter
from datetime import UTC, datetime

from app.disciplinas import NOMES_DISCIPLINAS
from app.models import Prova, Questao
from app.services.catalogo import distribuicao_completa
from app.services.serializacao import questao_publica
from tests.fixtures.gerar_pacotes import TEMAS, gerar_pacote


def test_distribuicao_maior_resto_com_desempate_alfabetico():
    # medias: fisica 44.5, biologia 45.5 -> pisos 44 + 45 = 89; a unidade que falta
    # vai para o maior resto (empate 0.5/0.5 -> ordem alfabetica: biologia)
    # (provas do mesmo tamanho: a media das proporcoes x 90 e a media das contagens)
    contagens = [{"fisica": 45, "biologia": 45}, {"fisica": 44, "biologia": 46}]

    assert distribuicao_completa(contagens, total=90) == {"biologia": 46, "fisica": 44}


def test_distribuicao_soma_o_total_pedido():
    contagens = [{"fisica": 30, "quimica": 30, "biologia": 30}, {"fisica": 31, "quimica": 29, "biologia": 30}]

    distribuicao = distribuicao_completa(contagens, total=90)

    assert sum(distribuicao.values()) == 90
    assert distribuicao == {"biologia": 30, "fisica": 31, "quimica": 29}


def test_distribuicao_da_completa_soma_80_com_provas_de_90_e_de_80():
    """BT-089 (CR-011, P2): media das proporcoes de todas as provas, vezes 80."""
    noventa = {"portugues": 18, "matematica": 12, "fisica": 30, "biologia": 30}  # 20%, 13,3%, 33,3%, 33,3%
    oitenta = {"portugues": 20, "matematica": 20, "fisica": 20, "biologia": 20}  # 25% cada

    distribuicao = distribuicao_completa([noventa, oitenta])

    # medias x 80: portugues 18, matematica 15,33, fisica 23,33, biologia 23,33 -> 79 nos pisos;
    # a unidade vai ao maior resto (empate de 0,33 -> ordem alfabetica: biologia)
    assert distribuicao == {"biologia": 24, "fisica": 23, "matematica": 15, "portugues": 18}
    assert sum(distribuicao.values()) == 80


def test_distribuicao_sem_provas():
    assert distribuicao_completa([]) == {}


def test_catalogo_com_base_sintetica(client, base_sintetica):
    resposta = client.get("/api/catalogo")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert [p["codigo"] for p in dados["provas"]] == ["2099", "2098"]
    assert dados["provas"][0] == {
        "codigo": "2099", "ano": 2099, "tipo": "vestibular", "edicao": None,
        "rotulo": "FUVEST 2099", "versao": "V1", "total_questoes": 90,
        "url_prova": "https://exemplo.test/2099/prova.pdf",
        "url_gabarito": "https://exemplo.test/2099/gabarito.pdf",
    }

    validas = [q for ano in (2098, 2099) for q in gerar_pacote(ano).questoes if not q.anulada]
    por_disciplina = Counter(q.disciplina.value for q in validas)
    assert dados["total_questoes"] == len(validas)
    assert {d["slug"]: d["total_questoes"] for d in dados["disciplinas"]} == por_disciplina
    assert [d["nome"] for d in dados["disciplinas"]] == sorted(NOMES_DISCIPLINAS.values())
    assert sum(dados["distribuicao_completa"].values()) == 80
    assert dados["completa_disponivel"] is True


def test_catalogo_de_base_vazia(client):
    dados = client.get("/api/catalogo").json()

    assert dados["provas"] == []
    assert dados["total_questoes"] == 0
    assert dados["distribuicao_completa"] == {}
    assert dados["completa_disponivel"] is False
    assert all(d["total_questoes"] == 0 for d in dados["disciplinas"])
    assert all(d["assuntos"] == [] for d in dados["disciplinas"])  # sem taxonomia no DATA_DIR


def _questao_com_figuras(codigo: str, edicao: int | None) -> Questao:
    prova = Prova(
        codigo=codigo, ano=int(codigo[:4]), tipo="vestibular" if edicao is None else "simulado",
        edicao=edicao, versao="V1", url_prova="https://exemplo.test/p.pdf",
        url_gabarito="https://exemplo.test/g.pdf", total_questoes=90, sincronizado_em=datetime.now(UTC),
    )
    return Questao(
        id=f"{codigo}-020", prova_codigo=codigo, prova=prova, numero=20, texto_base_id=None,
        enunciado=[{"texto": "Veja"}, {"figura": "q020-1.webp"}],
        alternativas={"A": {"texto": "a"}, "C": {"figura": "q020-c.webp"}},
        resposta="C", anulada=False, disciplina="fisica", disciplinas_secundarias=[],
    )


def test_serializacao_publica_troca_figura_por_url_e_omite_gabarito():
    publica = questao_publica(_questao_com_figuras("2099", None)).model_dump()

    assert publica["enunciado"][1] == {"texto": None, "figura": "/figuras/2099/q020-1.webp"}
    assert publica["alternativas"]["C"]["figura"] == "/figuras/2099/q020-c.webp"
    assert (publica["prova"], publica["origem"], publica["ano"]) == ("2099", "FUVEST 2099", 2099)
    assert "resposta" not in publica and "anulada" not in publica


def test_serializacao_do_simulado_traz_origem_e_figuras_pelo_codigo():
    """CR-011: a origem e o caminho das figuras vem do codigo da prova (RN-013)."""
    publica = questao_publica(_questao_com_figuras("2027s1", 1)).model_dump()

    assert publica["id"] == "2027s1-020"
    assert (publica["prova"], publica["ano"]) == ("2027s1", 2027)
    assert publica["origem"] == "Simulado FUVEST 2027 · 1ª edição"
    assert publica["enunciado"][1]["figura"] == "/figuras/2027s1/q020-1.webp"


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


def test_catalogo_com_simulado_oficial(client, settings, sessao):
    """BT-088 (CR-011): codigo, rotulo e tipo; ordem por ano e codigo; completa soma 80."""
    from app.pacote.sincronizar import sincronizar
    from tests.fixtures.gerar_pacotes import escrever_pacotes

    escrever_pacotes(settings.data_dir, simulados=((2099, 1),))
    sincronizar(sessao, settings.data_dir)

    dados = client.get("/api/catalogo").json()

    assert [p["codigo"] for p in dados["provas"]] == ["2099s1", "2099", "2098"]
    simulado = dados["provas"][0]
    assert (simulado["tipo"], simulado["edicao"], simulado["total_questoes"]) == ("simulado", 1, 80)
    assert simulado["rotulo"] == "Simulado FUVEST 2099 · 1ª edição"
    pacotes = [gerar_pacote(2098), gerar_pacote(2099), gerar_pacote(2099, 1)]
    assert dados["total_questoes"] == sum(not q.anulada for p in pacotes for q in p.questoes)
    assert sum(dados["distribuicao_completa"].values()) == 80
