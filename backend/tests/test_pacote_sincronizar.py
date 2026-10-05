"""IT-004 a IT-007, IT-018, IT-019, IT-030: sincronizacao repositorio -> banco (ADR-002, ADR-009,
ADR-015)."""

import shutil

import pytest
from sqlalchemy import func, select

from app.models import Prova, Questao, Reporte, TextoBase
from app.pacote.assuntos import ARQUIVO_TAXONOMIA, TaxonomiaInvalida
from app.pacote.leitura import carregar_pacote, salvar_pacote
from app.pacote.sincronizar import main, sincronizar
from tests.fixtures.gerar_pacotes import TEMAS, escrever_pacotes


def _contar(sessao, modelo) -> int:
    return sessao.scalar(select(func.count()).select_from(modelo))


def _alterar(dir_prova, **campos):
    pacote = carregar_pacote(dir_prova)
    for campo, valor in campos.items():
        setattr(pacote, campo, valor)
    salvar_pacote(pacote, dir_prova)


def test_sincronizar_duas_vezes_da_o_mesmo_estado(sessao, tmp_path):
    escrever_pacotes(tmp_path)

    primeiro = sincronizar(sessao, tmp_path)
    segundo = sincronizar(sessao, tmp_path)

    assert primeiro.sincronizadas == segundo.sincronizadas == ["2098", "2099"]
    assert _contar(sessao, Prova) == 2
    assert _contar(sessao, Questao) == 180
    assert _contar(sessao, TextoBase) == 4


def test_questao_persistida_com_ids_estaveis_e_blocos_limpos(sessao, tmp_path):
    escrever_pacotes(tmp_path, anos=(2099,))

    sincronizar(sessao, tmp_path)

    q = sessao.get(Questao, "2099-030")
    assert q.texto_base_id == "2099-tb02"
    assert {"figura": "q030-1.webp"} in q.enunciado
    assert q.alternativas["A"] == {"texto": "Alternativa A da questão 30"}
    assert isinstance(q.disciplina, str)
    assert sessao.get(TextoBase, "2099-tb02").conteudo[-1] == {"figura": "tb02-1.webp"}
    assert sessao.get(Prova, "2099").url_prova == "https://exemplo.test/2099/prova.pdf"


def test_rascunho_so_entra_com_incluir_rascunhos(sessao, tmp_path):
    d2098, _ = escrever_pacotes(tmp_path)
    _alterar(d2098, status="rascunho")

    sem = sincronizar(sessao, tmp_path)
    assert sem.sincronizadas == ["2099"]
    assert "2098" in sem.ignoradas

    com = sincronizar(sessao, tmp_path, incluir_rascunhos=True)
    assert com.sincronizadas == ["2098", "2099"]


def test_pacote_removido_sai_do_banco_e_reportes_ficam(sessao, tmp_path):
    d2098, _ = escrever_pacotes(tmp_path)
    sincronizar(sessao, tmp_path)
    sessao.add(Reporte(questao_id="2098-001", tipo="outro"))
    sessao.commit()

    shutil.rmtree(d2098)
    resumo = sincronizar(sessao, tmp_path)

    assert resumo.removidas == ["2098"]
    assert sessao.get(Prova, "2098") is None
    assert sessao.scalar(select(func.count()).where(Questao.prova_codigo == "2098")) == 0
    assert _contar(sessao, Reporte) == 1


def test_publicada_invalida_e_ignorada_e_as_demais_entram(sessao, tmp_path):
    d2098, _ = escrever_pacotes(tmp_path)
    pacote = carregar_pacote(d2098)
    pacote.questoes[0].disciplina = None
    salvar_pacote(pacote, d2098)

    resumo = sincronizar(sessao, tmp_path)

    assert resumo.sincronizadas == ["2099"]
    assert "bloqueante" in resumo.ignoradas["2098"]


def test_yaml_quebrado_e_ignorado(sessao, tmp_path):
    d2098, _ = escrever_pacotes(tmp_path)
    (d2098 / "prova.yaml").write_text("ano: [\n", encoding="utf-8")

    resumo = sincronizar(sessao, tmp_path)

    assert resumo.sincronizadas == ["2099"]
    assert "YAML" in resumo.ignoradas["2098"]


def test_diretorio_com_nome_diferente_do_codigo_e_ignorado(sessao, tmp_path):
    (d2098,) = escrever_pacotes(tmp_path, anos=(2098,))
    d2098.rename(tmp_path / "2097")

    resumo = sincronizar(sessao, tmp_path)

    assert resumo.sincronizadas == []
    assert "2097" in resumo.ignoradas


def test_simulado_oficial_sincroniza_com_codigo_proprio(sessao, tmp_path):
    """IT-030 (CR-011): o simulado convive com o vestibular do mesmo ano, com ids CODIGO-NNN."""
    escrever_pacotes(tmp_path, anos=(2099,), simulados=((2099, 1),))

    resumo = sincronizar(sessao, tmp_path)

    assert resumo.sincronizadas == ["2099", "2099s1"]
    simulado = sessao.get(Prova, "2099s1")
    assert (simulado.ano, simulado.tipo, simulado.edicao) == (2099, "simulado", 1)
    assert (simulado.versao, simulado.total_questoes) == ("S1", 80)
    assert sessao.get(Prova, "2099").total_questoes == 90
    assert sessao.scalar(select(func.count()).where(Questao.prova_codigo == "2099s1")) == 80
    assert sessao.get(Questao, "2099s1-030").texto_base_id == "2099s1-tb02"
    assert sessao.get(TextoBase, "2099s1-tb02").prova_codigo == "2099s1"


def test_simulado_em_diretorio_com_o_ano_e_ignorado(sessao, tmp_path):
    """O diretorio tem de ser o codigo: um simulado em data/provas/2099 nao entra."""
    (d_simulado,) = escrever_pacotes(tmp_path, anos=(), simulados=((2099, 1),))
    d_simulado.rename(tmp_path / "2099")

    resumo = sincronizar(sessao, tmp_path)

    assert resumo.sincronizadas == []
    assert "código 2099s1" in resumo.ignoradas["2099"]


def test_correcao_no_pacote_atualiza_a_questao(sessao, tmp_path):
    (d2099,) = escrever_pacotes(tmp_path, anos=(2099,))
    sincronizar(sessao, tmp_path)
    pacote = carregar_pacote(d2099)
    pacote.questoes[4].enunciado[0].texto = "Enunciado corrigido"
    salvar_pacote(pacote, d2099)

    sincronizar(sessao, tmp_path)
    sessao.expire_all()

    assert sessao.get(Questao, "2099-005").enunciado[0] == {"texto": "Enunciado corrigido"}


def test_assunto_gravado_em_todas_as_questoes(sessao, tmp_path):
    """IT-018 (CR-004)."""
    escrever_pacotes(tmp_path, anos=(2099,))

    sincronizar(sessao, tmp_path)

    assuntos = set(sessao.scalars(select(Questao.assunto)))
    assert assuntos == set(TEMAS)
    assert sessao.get(Questao, "2099-030").assunto == TEMAS[30 % len(TEMAS)]


@pytest.mark.parametrize("conteudo", [None, "fisica: ["])
def test_taxonomia_invalida_aborta_sem_tocar_o_banco(sessao, tmp_path, conteudo):
    """IT-019: ausente ou quebrada -> TaxonomiaInvalida antes de qualquer escrita."""
    escrever_pacotes(tmp_path)
    sincronizar(sessao, tmp_path)
    taxonomia = tmp_path / ARQUIVO_TAXONOMIA
    if conteudo is None:
        taxonomia.unlink()
    else:
        taxonomia.write_text(conteudo, encoding="utf-8")
    shutil.rmtree(tmp_path / "2098")  # sem a taxonomia, a remocao nao pode acontecer

    with pytest.raises(TaxonomiaInvalida):
        sincronizar(sessao, tmp_path)

    sessao.rollback()
    assert _contar(sessao, Prova) == 2
    assert _contar(sessao, Questao) == 180


def test_main_sai_com_erro_se_a_taxonomia_for_invalida(tmp_path, monkeypatch, caplog):
    """IT-019: o start do container para (ADR-009)."""
    from app.database import criar_engine
    from tests.utils import aplicar_migrations

    url = f"sqlite:///{(tmp_path / 'm.db').as_posix()}"
    aplicar_migrations(criar_engine(url))
    escrever_pacotes(tmp_path / "provas")
    (tmp_path / "provas" / ARQUIVO_TAXONOMIA).write_text("[]", encoding="utf-8")
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "provas"))

    assert main() == 1
    assert "Taxonomia" in caplog.text
