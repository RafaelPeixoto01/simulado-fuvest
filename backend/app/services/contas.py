"""Contas, sessoes e exclusao (CR-005, ADR-010, RN-016); login e exclusao contados (CR-013)."""

from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.autenticacao import DURACAO_SESSAO, hash_token, novo_token
from app.models import SessaoUsuario, Usuario
from app.services.estatisticas import dia_local, incrementar, inicio_do_dia
from app.services.google import IdentidadeGoogle


def _utc(momento: datetime) -> datetime:
    # O SQLite devolve datetime sem fuso; o Postgres, com
    return momento if momento.tzinfo else momento.replace(tzinfo=UTC)


def _usuario_do_google(
    sessao: Session, identidade: IdentidadeGoogle, agora: datetime
) -> tuple[Usuario, bool]:
    """(usuario, criado agora)."""
    consulta = select(Usuario).where(Usuario.google_sub == identidade.sub)
    usuario = sessao.scalar(consulta)
    if usuario is not None:
        return usuario, False
    try:
        # Savepoint: dois primeiros logins simultaneos da mesma conta disputam o google_sub
        with sessao.begin_nested():
            usuario = Usuario(
                google_sub=identidade.sub,
                email=identidade.email,
                nome=identidade.nome,
                criado_em=agora,
                ultimo_acesso_em=agora,
            )
            sessao.add(usuario)
    except IntegrityError:
        return sessao.scalar(consulta), False  # o outro login criou primeiro
    return usuario, True


def entrar(
    sessao: Session, identidade: IdentidadeGoogle, agora: datetime, token_anterior: str | None
) -> str:
    """Registra o login e abre uma sessao nova; devolve o token do cookie (nao vai ao banco)."""
    if token_anterior:  # troca de conta no mesmo navegador: a sessao anterior acaba
        _apagar_sessao(sessao, token_anterior)
    usuario, criado = _usuario_do_google(sessao, identidade, agora)
    hoje = dia_local(agora)
    # Conta nova ou primeiro acesso do dia: usuario ativo hoje (RN-021)
    ativo_novo = criado or _utc(usuario.ultimo_acesso_em) < inicio_do_dia(hoje)
    usuario.email = identidade.email
    usuario.nome = identidade.nome
    usuario.ultimo_acesso_em = agora
    sessao.flush()
    for vencida in sessao.scalars(
        select(SessaoUsuario).where(SessaoUsuario.usuario_id == usuario.id)
    ):
        if _utc(vencida.expira_em) <= agora:
            sessao.delete(vencida)
    token = novo_token()
    sessao.add(SessaoUsuario(
        token_hash=hash_token(token),
        usuario_id=usuario.id,
        criado_em=agora,
        expira_em=agora + DURACAO_SESSAO,
    ))
    incrementar(sessao, hoje, {"login": 1, "ativo": int(ativo_novo)})
    sessao.commit()
    return token


def usuario_da_sessao(sessao: Session, token: str, agora: datetime) -> Usuario | None:
    registro = sessao.get(SessaoUsuario, hash_token(token))
    if registro is None:
        return None
    if _utc(registro.expira_em) <= agora:
        sessao.delete(registro)
        sessao.commit()
        return None
    return registro.usuario


def _apagar_sessao(sessao: Session, token: str) -> None:
    sessao.execute(delete(SessaoUsuario).where(SessaoUsuario.token_hash == hash_token(token)))


def sair(sessao: Session, token: str) -> None:
    _apagar_sessao(sessao, token)
    sessao.commit()


def excluir_conta(sessao: Session, usuario_id: int) -> None:
    """Apaga o usuario; sessoes e historico saem por ON DELETE CASCADE (RF-026)."""
    sessao.execute(delete(Usuario).where(Usuario.id == usuario_id))
    incrementar(sessao, dia_local(datetime.now(UTC)), {"conta_excluida": 1})  # anonimo (RN-021)
    sessao.commit()
