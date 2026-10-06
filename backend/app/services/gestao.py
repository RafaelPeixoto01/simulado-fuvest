"""Indicadores da area de gestao (CR-013, specs/09 §2.4, RN-020 a RN-022).

So leitura: os contadores sao escritos por `services/estatisticas`. Todo dia e de Brasilia.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.disciplinas import NOMES_DISCIPLINAS, Disciplina
from app.models import (
    EstatisticaDiaria,
    EstatisticaGeracao,
    EstatisticaQuestao,
    Prova,
    Questao,
    Reporte,
    SimuladoConcluido,
    Usuario,
)
from app.pacote.assuntos import Taxonomia
from app.pacote.notas_corte import BaseNotasCorte
from app.pacote.schema import partes_do_codigo, rotulo_da_prova
from app.schemas import (
    AprendizadoResponse,
    AssuntoAprendizado,
    CarreiraEscolhida,
    CartoesUso,
    CortesModalidades,
    DisciplinaAprendizado,
    DisciplinaBase,
    EstudanteGestao,
    EstudantesResponse,
    FaixaUso,
    Marcacoes,
    ModoAprendizado,
    ModoUso,
    PontoSerie,
    ProvaBase,
    ProvaFeita,
    QualidadeResponse,
    QuestaoReportada,
    QuestaoSuspeita,
    ReporteGestao,
    ResumoBase,
    ResumoReportes,
    SeriesUso,
    UsoResponse,
)
from app.services.estatisticas import COLUNA_MARCACAO, como_utc, dia_local, inicio_do_dia
from app.services.notas_corte import resolver_carreira_alvo

MODOS_CONCLUIDOS = ("completa", "personalizado", "ano")
MODOS_GERADOS = (*MODOS_CONCLUIDOS, "treino")
DIAS_DO_PERIODO = {"7": 7, "30": 30, "90": 90}
MAXIMO_DIAS_POR_DIA = 31  # acima disso, as series vao por semana
FAIXAS = (("0", 0, 0), ("1", 1, 1), ("2–5", 2, 5), ("6–20", 6, 20), ("21–50", 21, 50))
LETRAS = ("A", "B", "C", "D", "E")
MINIMO_RESPOSTAS_SUSPEITA = 20  # RN-022
ACERTO_SUSPEITO = 15.0  # %, RN-022
LIMITE_SUSPEITAS = 50
LIMITE_CARREIRAS = 10
LIMITE_RESOLVIDOS = 100
POR_PAGINA = 50


def _percentual(parte: int | float, todo: int | float) -> float | None:
    return round(parte / todo * 100, 1) if todo else None


def _rotulo(codigo: str) -> str:
    return rotulo_da_prova(*partes_do_codigo(codigo))


# --- Periodo ---


@dataclass(frozen=True)
class Periodo:
    nome: str
    inicio: date
    fim: date

    @property
    def dias(self) -> int:
        return (self.fim - self.inicio).days + 1

    @property
    def granularidade(self) -> str:
        return "dia" if self.dias <= MAXIMO_DIAS_POR_DIA else "semana"

    def intervalos(self) -> list[tuple[date, date]]:
        """(primeiro, ultimo dia) de cada coluna: os dias, ou as semanas de segunda a domingo
        (a primeira pode comecar no meio da semana)."""
        if self.granularidade == "dia":
            return [(d, d) for d in (self.inicio + timedelta(days=n) for n in range(self.dias))]
        intervalos = []
        comeco = self.inicio
        while comeco <= self.fim:
            fim = min(comeco + timedelta(days=6 - comeco.weekday()), self.fim)
            intervalos.append((comeco, fim))
            comeco = fim + timedelta(days=1)
        return intervalos


def periodo(sessao: Session, nome: str, agora: datetime) -> Periodo:
    hoje = dia_local(agora)
    if nome in DIAS_DO_PERIODO:
        return Periodo(nome, hoje - timedelta(days=DIAS_DO_PERIODO[nome] - 1), hoje)
    # "tudo": do primeiro dia com algum dado
    primeiros = [
        sessao.scalar(select(func.min(EstatisticaGeracao.dia))),
        sessao.scalar(select(func.min(EstatisticaDiaria.dia))),
    ]
    cadastro = sessao.scalar(select(func.min(Usuario.criado_em)))
    if cadastro is not None:
        primeiros.append(dia_local(como_utc(cadastro)))
    return Periodo(nome, min([d for d in primeiros if d is not None] + [hoje]), hoje)


def _serie(intervalos: list[tuple[date, date]], por_dia: Counter, *, media: bool = False) -> list[PontoSerie]:
    pontos = []
    for comeco, fim in intervalos:
        dias = (fim - comeco).days + 1
        total = sum(por_dia[comeco + timedelta(days=n)] for n in range(dias))
        # Media arredondada para cima a partir de ,5 (o round do Python iria ao par)
        pontos.append(PontoSerie(inicio=comeco, total=int(total / dias + 0.5) if media else total))
    return pontos


def _diarias(sessao: Session, p: Periodo) -> dict[str, Counter]:
    """metrica -> {dia: total} no periodo."""
    por_metrica: dict[str, Counter] = defaultdict(Counter)
    for dia, metrica, total in sessao.execute(
        select(EstatisticaDiaria.dia, EstatisticaDiaria.metrica, EstatisticaDiaria.total)
        .where(EstatisticaDiaria.dia.between(p.inicio, p.fim))
    ):
        por_metrica[metrica][dia] += total
    return por_metrica


def _soma(por_dia: Counter) -> int:
    return sum(por_dia.values())


# --- Uso ---


def _ativos_desde(sessao: Session, dia: date) -> int:
    return sessao.scalar(
        select(func.count()).select_from(Usuario).where(Usuario.ultimo_acesso_em >= inicio_do_dia(dia))
    )


def _distribuicao(sessao: Session, estudantes: int) -> list[FaixaUso]:
    por_conta = sessao.scalars(
        select(func.count()).select_from(SimuladoConcluido).group_by(SimuladoConcluido.usuario_id)
    ).all()
    contagens = [*por_conta, *([0] * (estudantes - len(por_conta)))]
    return [
        FaixaUso(faixa=faixa, estudantes=sum(1 for n in contagens if minimo <= n <= maximo))
        for faixa, minimo, maximo in FAIXAS
    ]


def uso(sessao: Session, nome_periodo: str, agora: datetime) -> UsoResponse:
    p = periodo(sessao, nome_periodo, agora)
    intervalos = p.intervalos()
    diarias = _diarias(sessao, p)

    gerados_por_modo: dict[str, Counter] = defaultdict(Counter)
    for dia, modo, total in sessao.execute(
        select(EstatisticaGeracao.dia, EstatisticaGeracao.modo, EstatisticaGeracao.total)
        .where(EstatisticaGeracao.dia.between(p.inicio, p.fim))
    ):
        gerados_por_modo[modo][dia] += total
    gerados_por_dia: Counter = sum(gerados_por_modo.values(), Counter())
    concluidos_por_dia: Counter = sum((diarias[f"concluido.{m}"] for m in MODOS_CONCLUIDOS), Counter())
    cadastros = Counter(
        dia_local(como_utc(criado))
        for criado in sessao.scalars(select(Usuario.criado_em).where(Usuario.criado_em >= inicio_do_dia(p.inicio)))
    )

    estudantes = sessao.scalar(select(func.count()).select_from(Usuario))
    modos = []
    for modo in MODOS_GERADOS:
        gerados = _soma(gerados_por_modo[modo])
        if modo == "treino":  # nao entra no historico
            modos.append(ModoUso(modo=modo, gerados=gerados, concluidos=None, taxa_conclusao=None))
            continue
        concluidos = _soma(diarias[f"concluido.{modo}"])
        modos.append(ModoUso(
            modo=modo, gerados=gerados, concluidos=concluidos, taxa_conclusao=_percentual(concluidos, gerados)
        ))

    provas = Counter({
        metrica.removeprefix("prova_ano."): _soma(por_dia)
        for metrica, por_dia in diarias.items()
        if metrica.startswith("prova_ano.")
    })
    rotulos = {p.codigo: rotulo_da_prova(p.ano, p.edicao) for p in sessao.scalars(select(Prova))}

    return UsoResponse(
        periodo=p.nome,
        inicio=p.inicio,
        fim=p.fim,
        granularidade=p.granularidade,
        cartoes=CartoesUso(
            estudantes=estudantes,
            novos=_soma(cadastros),
            ativos_hoje=diarias["ativo"][p.fim],
            ativos_media_dia=round(_soma(diarias["ativo"]) / p.dias, 1),
            ativos_7_dias=_ativos_desde(sessao, p.fim - timedelta(days=6)),
            ativos_30_dias=_ativos_desde(sessao, p.fim - timedelta(days=29)),
            logins=_soma(diarias["login"]),
            gerados=_soma(gerados_por_dia),
            concluidos=_soma(concluidos_por_dia),
            contas_excluidas=_soma(diarias["conta_excluida"]),
        ),
        series=SeriesUso(
            cadastros=_serie(intervalos, cadastros),
            logins=_serie(intervalos, diarias["login"]),
            # Somar os ativos de dias diferentes contaria a mesma pessoa varias vezes
            ativos=_serie(intervalos, diarias["ativo"], media=True),
            gerados=_serie(intervalos, gerados_por_dia),
            concluidos=_serie(intervalos, concluidos_por_dia),
        ),
        modos=modos,
        distribuicao=_distribuicao(sessao, estudantes),
        provas_ano=[
            ProvaFeita(codigo=codigo, rotulo=rotulos.get(codigo, codigo), concluidos=total)
            for codigo, total in sorted(provas.items(), key=lambda par: (-par[1], par[0]))
            if total
        ],
    )


# --- Aprendizado ---


def _marcacoes(estatistica: EstatisticaQuestao) -> dict[str | None, int]:
    """Letra (ou None, em branco) -> vezes."""
    return {letra: getattr(estatistica, coluna) for letra, coluna in COLUNA_MARCACAO.items()}


def _respostas_das_questoes(sessao: Session):
    """(questao, marcacoes) das questoes validas com marcacao; o gabarito e o atual (T5).
    So as colunas usadas: o enunciado e as alternativas nao saem do banco."""
    for linha in sessao.execute(
        select(
            Questao.id, Questao.numero, Questao.prova_codigo, Questao.disciplina, Questao.assunto,
            Questao.resposta, EstatisticaQuestao,
        )
        .join(EstatisticaQuestao, EstatisticaQuestao.questao_id == Questao.id)
        .where(Questao.anulada.is_(False), Questao.resposta.is_not(None))
    ):
        yield linha, _marcacoes(linha.EstatisticaQuestao)


def _acerto_por_disciplina(sessao: Session, taxonomia: Taxonomia | None) -> list[DisciplinaAprendizado]:
    disciplinas: dict[str, Counter] = defaultdict(Counter)
    assuntos: dict[str, dict[str, Counter]] = defaultdict(lambda: defaultdict(Counter))
    for questao, marcacoes in _respostas_das_questoes(sessao):
        respostas, acertos = sum(marcacoes.values()), marcacoes[questao.resposta]
        disciplinas[questao.disciplina].update(respostas=respostas, acertos=acertos)
        if questao.assunto:
            assuntos[questao.disciplina][questao.assunto].update(respostas=respostas, acertos=acertos)

    def nome_assunto(disciplina: str, slug: str) -> str:
        return (taxonomia.nome(disciplina, slug) if taxonomia else None) or slug

    linhas = []
    for disciplina, total in disciplinas.items():
        if not total["respostas"]:
            continue
        lista = [
            AssuntoAprendizado(
                assunto=slug,
                nome=nome_assunto(disciplina, slug),
                respostas=c["respostas"],
                acertos=c["acertos"],
                percentual=_percentual(c["acertos"], c["respostas"]),
            )
            for slug, c in assuntos[disciplina].items()
            if c["respostas"]
        ]
        lista.sort(key=lambda a: (a.percentual, a.nome))
        linhas.append(DisciplinaAprendizado(
            disciplina=disciplina,
            respostas=total["respostas"],
            acertos=total["acertos"],
            percentual=_percentual(total["acertos"], total["respostas"]),
            assuntos=lista,
        ))
    linhas.sort(key=lambda d: (d.percentual, NOMES_DISCIPLINAS[Disciplina(d.disciplina)]))
    return linhas


def _pontos_na_escala(acertos: int, total: int, pontos_prova: int) -> float:
    """Nota na escala da lista de corte (RN-018): direta com o mesmo total; senao proporcional."""
    return acertos if total == pontos_prova else round(acertos / total * pontos_prova, 1)


def _ultimas_completas(sessao: Session, usuario_ids: list[int]) -> dict[int, tuple[int, int]]:
    """(acertos, total) do simulado de Prova completa mais recente de cada conta."""
    ultimas: dict[int, tuple[int, int]] = {}
    for usuario_id, dados in sessao.execute(
        select(SimuladoConcluido.usuario_id, SimuladoConcluido.dados)
        .where(SimuladoConcluido.usuario_id.in_(usuario_ids))
        .order_by(SimuladoConcluido.finalizado_em_ms.desc(), SimuladoConcluido.id.desc())
    ):
        resultado = dados["resultado"]
        if usuario_id not in ultimas and dados["modo"] == "completa" and resultado["total"]:
            ultimas[usuario_id] = (resultado["acertos"], resultado["total"])
    return ultimas


def _carreiras(sessao: Session, base: BaseNotasCorte) -> list[CarreiraEscolhida]:
    ano, codigo = Usuario.carreira_alvo_ano, Usuario.carreira_alvo_codigo
    grupos = sessao.execute(
        select(ano, codigo, func.count())
        .where(ano.is_not(None), codigo.is_not(None))
        .group_by(ano, codigo)
        .order_by(func.count().desc(), ano.desc(), codigo)
        .limit(LIMITE_CARREIRAS)
    ).all()
    carreiras = []
    for ano_alvo, codigo_alvo, estudantes in grupos:
        contas = sessao.scalars(select(Usuario).where(ano == ano_alvo, codigo == codigo_alvo)).all()
        alvo = resolver_carreira_alvo(base, contas[0])
        cortes = alvo.carreira.cortes if alvo.carreira else None
        ultimas = _ultimas_completas(sessao, [u.id for u in contas])
        notas = [_pontos_na_escala(a, t, alvo.pontos_prova) for a, t in ultimas.values()]

        def atingiram(corte: int | None, notas=notas) -> int | None:
            return None if corte is None else sum(1 for nota in notas if nota >= corte)

        carreiras.append(CarreiraEscolhida(
            ano=ano_alvo,
            codigo=codigo_alvo,
            nome=alvo.carreira.nome if alvo.carreira else None,
            pontos_prova=alvo.pontos_prova,
            cortes=cortes,
            estudantes=estudantes,
            com_prova_completa=len(notas),
            atingiriam=(
                CortesModalidades(ac=atingiram(cortes.ac), ep=atingiram(cortes.ep), ppi=atingiram(cortes.ppi))
                if cortes
                else None
            ),
        ))
    return carreiras


def aprendizado(
    sessao: Session,
    nome_periodo: str,
    agora: datetime,
    taxonomia: Taxonomia | None,
    notas_corte: BaseNotasCorte,
) -> AprendizadoResponse:
    p = periodo(sessao, nome_periodo, agora)
    diarias = _diarias(sessao, p)
    modos = []
    for modo in MODOS_CONCLUIDOS:
        concluidos = _soma(diarias[f"concluido.{modo}"])
        questoes = _soma(diarias[f"questoes.{modo}"])
        tempo_ms = _soma(diarias[f"tempo_ms.{modo}"])
        modos.append(ModoAprendizado(
            modo=modo,
            concluidos=concluidos,
            acerto_medio=_percentual(_soma(diarias[f"acertos.{modo}"]), questoes),
            por_tempo=_percentual(_soma(diarias[f"por_tempo.{modo}"]), concluidos),
            tempo_medio_questao_s=round(tempo_ms / questoes / 1000) if questoes else None,
        ))
    return AprendizadoResponse(
        periodo=p.nome,
        inicio=p.inicio,
        fim=p.fim,
        modos=modos,
        disciplinas=_acerto_por_disciplina(sessao, taxonomia),
        carreiras=_carreiras(sessao, notas_corte),
    )


# --- Qualidade ---


def _ordem_da_prova(prova: Prova) -> tuple:
    # Do ano mais recente para o mais antigo; no mesmo ano, o vestibular e depois os simulados
    return (-prova.ano, prova.tipo != "vestibular", prova.edicao or 0)


def _suspeitas(sessao: Session, taxonomia: Taxonomia | None) -> list[QuestaoSuspeita]:
    suspeitas = []
    for questao, marcacoes in _respostas_das_questoes(sessao):
        respostas = sum(marcacoes.values())
        if respostas < MINIMO_RESPOSTAS_SUSPEITA:
            continue
        acertos = marcacoes[questao.resposta]
        percentual = _percentual(acertos, respostas)
        motivos = []
        if percentual < ACERTO_SUSPEITO:
            motivos.append("acerto_baixo")
        if any(marcacoes[letra] > acertos for letra in LETRAS if letra != questao.resposta):
            motivos.append("alternativa_atrai")
        if not motivos:
            continue
        suspeitas.append(QuestaoSuspeita(
            questao_id=questao.id,
            prova=_rotulo(questao.prova_codigo),
            numero=questao.numero,
            disciplina=questao.disciplina,
            assunto=(taxonomia.nome(questao.disciplina, questao.assunto) if taxonomia and questao.assunto else None)
            or questao.assunto,
            gabarito=questao.resposta,
            respostas=respostas,
            acertos=acertos,
            percentual=percentual,
            marcacoes=Marcacoes(
                a=marcacoes["A"], b=marcacoes["B"], c=marcacoes["C"], d=marcacoes["D"], e=marcacoes["E"],
                em_branco=marcacoes[None],
            ),
            motivos=motivos,
        ))
    suspeitas.sort(key=lambda s: (s.percentual, s.questao_id))
    return suspeitas[:LIMITE_SUSPEITAS]


def qualidade(sessao: Session, taxonomia: Taxonomia | None) -> QualidadeResponse:
    por_prova: dict[str, Counter] = defaultdict(Counter)
    por_disciplina: Counter = Counter()
    sem_assunto = 0
    for codigo, anulada, disciplina, assunto in sessao.execute(
        select(Questao.prova_codigo, Questao.anulada, Questao.disciplina, Questao.assunto)
    ):
        por_prova[codigo].update(questoes=1, anuladas=int(anulada))
        if not anulada:
            por_disciplina[disciplina] += 1
        sem_assunto += assunto is None

    provas = sorted(sessao.scalars(select(Prova)), key=_ordem_da_prova)
    validas = sum(por_disciplina.values())
    pendentes = sessao.scalar(select(func.count()).select_from(Reporte).where(Reporte.status == "pendente"))
    resolvidos = sessao.scalar(select(func.count()).select_from(Reporte).where(Reporte.status == "resolvido"))
    com_reporte = sessao.scalar(
        select(func.count(func.distinct(Reporte.questao_id))).where(Reporte.status == "resolvido")
    )
    return QualidadeResponse(
        base=ResumoBase(
            provas=len(provas),
            questoes=validas,
            anuladas=sum(c["anuladas"] for c in por_prova.values()),
            sem_assunto=sem_assunto,
            sincronizado_em=max((como_utc(p.sincronizado_em) for p in provas), default=None),
        ),
        provas=[
            ProvaBase(
                codigo=p.codigo,
                rotulo=rotulo_da_prova(p.ano, p.edicao),
                tipo=p.tipo,
                total_questoes=p.total_questoes,
                questoes=por_prova[p.codigo]["questoes"],
                anuladas=por_prova[p.codigo]["anuladas"],
                sincronizado_em=como_utc(p.sincronizado_em),
            )
            for p in provas
        ],
        disciplinas=[
            DisciplinaBase(disciplina=d, questoes=n)
            for d, n in sorted(por_disciplina.items(), key=lambda par: NOMES_DISCIPLINAS[Disciplina(par[0])])
        ],
        reportes=ResumoReportes(
            pendentes=pendentes,
            resolvidos=resolvidos,
            questoes_com_reporte_resolvido=com_reporte,
            indice_resolvidos=_percentual(com_reporte, validas),
        ),
        suspeitas=_suspeitas(sessao, taxonomia),
    )


def reportes(sessao: Session, status: str) -> list[ReporteGestao]:
    """Pendentes: todos, do mais antigo; resolvidos: os 100 mais recentes."""
    consulta = select(Reporte).where(Reporte.status == status)
    if status == "pendente":
        consulta = consulta.order_by(Reporte.criado_em, Reporte.id)
    else:
        consulta = consulta.order_by(Reporte.resolvido_em.desc(), Reporte.id.desc()).limit(LIMITE_RESOLVIDOS)
    lista = list(sessao.scalars(consulta))
    questoes = {
        q.id: q for q in sessao.scalars(select(Questao).where(Questao.id.in_({r.questao_id for r in lista})))
    }
    return [
        ReporteGestao(
            id=r.id,
            questao_id=r.questao_id,
            tipo=r.tipo,
            descricao=r.descricao,
            status=r.status,
            criado_em=como_utc(r.criado_em),
            resolvido_em=como_utc(r.resolvido_em) if r.resolvido_em else None,
            questao=(
                QuestaoReportada(
                    prova=_rotulo(q.prova_codigo), numero=q.numero, disciplina=q.disciplina,
                    gabarito=q.resposta, anulada=q.anulada,
                )
                if (q := questoes.get(r.questao_id))
                else None
            ),
        )
        for r in lista
    ]


# --- Estudantes ---


def _padrao_contem(busca: str) -> str:
    """`%`, `_` e a barra viram literais no LIKE (escape `\\`)."""
    escapado = busca.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escapado}%"


def _nome_carreira(base: BaseNotasCorte, usuario: Usuario) -> str | None:
    alvo = resolver_carreira_alvo(base, usuario)
    if alvo is None:
        return None
    return alvo.carreira.nome if alvo.carreira else f"{alvo.ano} · código {alvo.codigo}"


def estudantes(
    sessao: Session,
    settings: Settings,
    notas_corte: BaseNotasCorte,
    busca: str | None,
    ordem: str,
    pagina: int,
) -> EstudantesResponse:
    filtros = []
    termo = (busca or "").strip()
    if termo:
        padrao = _padrao_contem(termo)
        filtros.append(or_(Usuario.nome.ilike(padrao, escape="\\"), Usuario.email.ilike(padrao, escape="\\")))
    total = sessao.scalar(select(func.count()).select_from(Usuario).where(*filtros))

    simulados = (
        select(SimuladoConcluido.usuario_id, func.count().label("n"))
        .group_by(SimuladoConcluido.usuario_id)
        .subquery()
    )
    coluna = Usuario.criado_em if ordem == "cadastro" else Usuario.ultimo_acesso_em
    linhas = sessao.execute(
        select(Usuario, func.coalesce(simulados.c.n, 0))
        .outerjoin(simulados, simulados.c.usuario_id == Usuario.id)
        .where(*filtros)
        .order_by(coluna.desc(), Usuario.id.desc())
        .offset((pagina - 1) * POR_PAGINA)
        .limit(POR_PAGINA)
    ).all()
    return EstudantesResponse(
        total=total,
        pagina=pagina,
        por_pagina=POR_PAGINA,
        estudantes=[
            EstudanteGestao(
                id=u.id,
                nome=u.nome,
                email=u.email,
                criado_em=como_utc(u.criado_em),
                ultimo_acesso_em=como_utc(u.ultimo_acesso_em),
                simulados=n,
                carreira_alvo=_nome_carreira(notas_corte, u),
                admin=settings.eh_admin(u.google_sub),
            )
            for u, n in linhas
        ],
    )
