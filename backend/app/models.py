"""Models (02-ARCHITECTURE §4). Tabelas criadas so via migration Alembic."""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Prova(Base):
    """Derivada do repositorio (data/provas/CODIGO/prova.yaml) pela sincronizacao."""

    __tablename__ = "provas"

    # "2025" (vestibular) ou "2027s1" (simulado oficial, 1a edicao) — ADR-015, CR-011
    codigo: Mapped[str] = mapped_column(String(8), primary_key=True)
    ano: Mapped[int] = mapped_column(Integer, index=True)  # ano FUVEST de referencia
    tipo: Mapped[str] = mapped_column(String(10))  # "vestibular" | "simulado"
    edicao: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    versao: Mapped[str] = mapped_column(String(10))
    url_prova: Mapped[str] = mapped_column(Text)
    url_gabarito: Mapped[str] = mapped_column(Text)
    total_questoes: Mapped[int] = mapped_column(Integer)
    sincronizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    questoes: Mapped[list["Questao"]] = relationship(
        back_populates="prova", cascade="all, delete-orphan", passive_deletes=True
    )
    textos_base: Mapped[list["TextoBase"]] = relationship(
        back_populates="prova", cascade="all, delete-orphan", passive_deletes=True
    )


class TextoBase(Base):
    __tablename__ = "textos_base"

    id: Mapped[str] = mapped_column(String(12), primary_key=True)  # "CODIGO-tbNN" (ADR-006)
    prova_codigo: Mapped[str] = mapped_column(
        ForeignKey("provas.codigo", ondelete="CASCADE"), index=True
    )
    conteudo: Mapped[list] = mapped_column(JSON)

    prova: Mapped[Prova] = relationship(back_populates="textos_base")


class Questao(Base):
    __tablename__ = "questoes"
    __table_args__ = (
        UniqueConstraint("prova_codigo", "numero", name="uq_questoes_prova_numero"),
    )

    id: Mapped[str] = mapped_column(String(12), primary_key=True)  # "CODIGO-NNN" (ADR-006)
    prova_codigo: Mapped[str] = mapped_column(
        ForeignKey("provas.codigo", ondelete="CASCADE"), index=True
    )
    numero: Mapped[int] = mapped_column(Integer)
    texto_base_id: Mapped[str | None] = mapped_column(
        ForeignKey("textos_base.id", ondelete="SET NULL"), nullable=True
    )
    enunciado: Mapped[list] = mapped_column(JSON)
    alternativas: Mapped[dict] = mapped_column(JSON)
    resposta: Mapped[str | None] = mapped_column(String(1), nullable=True)
    anulada: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    disciplina: Mapped[str] = mapped_column(String(12), index=True)
    disciplinas_secundarias: Mapped[list] = mapped_column(JSON, default=list)
    # Slug da taxonomia (CR-004). Nullable so pela ordem migration -> sincronizacao (V11)
    assunto: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)

    prova: Mapped[Prova] = relationship(back_populates="questoes")
    # Sem este relationship o ORM pode inserir a questao antes do texto-base (FK)
    texto_base: Mapped[TextoBase | None] = relationship()


class Reporte(Base):
    """Escrito em runtime (RF-021). Sem FK para sobreviver a ressincronizacoes (ADR-006)."""

    __tablename__ = "reportes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    questao_id: Mapped[str] = mapped_column(String(12), index=True)  # "CODIGO-NNN"
    tipo: Mapped[str] = mapped_column(String(20))
    descricao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="pendente", server_default="pendente")
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    resolvido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EstatisticaGeracao(Base):
    """Contador anonimo de simulados gerados por dia e modo (PRD §2)."""

    __tablename__ = "estatisticas_geracao"

    dia: Mapped[date] = mapped_column(Date, primary_key=True)
    modo: Mapped[str] = mapped_column(String(12), primary_key=True)
    total: Mapped[int] = mapped_column(Integer, default=0)


class EstatisticaDiaria(Base):
    """Contagens anonimas por dia de Brasilia e metrica (CR-013, ADR-016, RN-021): `login`,
    `ativo`, `conta_excluida`, `concluido.<modo>`, `prova_ano.<codigo>`... Sem nada de quem."""

    __tablename__ = "estatisticas_diarias"

    dia: Mapped[date] = mapped_column(Date, primary_key=True)
    metrica: Mapped[str] = mapped_column(String(40), primary_key=True)
    total: Mapped[int] = mapped_column(BigInteger, default=0)  # o tempo em ms passa de 32 bits


class EstatisticaQuestao(Base):
    """Marcacoes de cada questao nos simulados concluidos, sem saber de quem (CR-013).
    Sem FK, como `reportes`: sobrevive a ressincronizacao (ADR-006)."""

    __tablename__ = "estatisticas_questoes"

    questao_id: Mapped[str] = mapped_column(String(12), primary_key=True)  # "CODIGO-NNN"
    marcadas_a: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    marcadas_b: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    marcadas_c: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    marcadas_d: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    marcadas_e: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    em_branco: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class Usuario(Base):
    """Conta opcional, criada ao entrar com o Google (CR-005, ADR-010)."""

    __tablename__ = "usuarios"
    __table_args__ = (UniqueConstraint("google_sub", name="uq_usuarios_google_sub"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    google_sub: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(320))
    nome: Mapped[str | None] = mapped_column(String(200), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # No login e no primeiro pedido de cada dia de Brasilia (CR-013, RN-021)
    ultimo_acesso_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Carreira-alvo das notas de corte (CR-010): so a carreira, nunca a modalidade (D4).
    # Gravados e apagados juntos; o ano e o da lista de onde a carreira foi escolhida
    carreira_alvo_ano: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    carreira_alvo_codigo: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)


class SessaoUsuario(Base):
    """Sessao de login. Guarda so o SHA-256 do token do cookie (ADR-010)."""

    __tablename__ = "sessoes"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    usuario: Mapped[Usuario] = relationship()


class SimuladoConcluido(Base):
    """Entrada do historico da conta (ADR-011): o HistoricoEntry como o navegador o montou."""

    __tablename__ = "simulados_concluidos"
    __table_args__ = (
        Index("ix_simulados_concluidos_usuario_finalizado", "usuario_id", "finalizado_em_ms"),
    )

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # id do simulado (UUID)
    finalizado_em_ms: Mapped[int] = mapped_column(BigInteger)
    dados: Mapped[dict] = mapped_column(JSON)
    recebido_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
