"""Contas, sessoes e exclusao (CR-005, ADR-010, RN-016)."""

from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.autenticacao import DURACAO_SESSAO, hash_token, novo_token
from app.models import SessaoUsuario, Usuario
from app.services.google import IdentidadeGoogle


def _utc(momento: datetime) -> datetime:
    # O SQLite devolve datetime sem fuso; o Postgres, com
    return momento if momento.tzinfo else momento.replace(tzinfo=UTC)


def entrar(
    sessao: Session, identidade: IdentidadeGoogle, agora: datetime, token_anterior: str | None
) -> str:
    """Registra o login e abre uma sessao nova; devolve o token do cookie (nao vai ao banco)."""
    if token_anterior:  # troca de conta no mesmo navegador: a sessao anterior acaba
        _apagar_sessao(sessao, token_anterior)
    usuario = sessao.scalar(select(Usuario).where(Usuario.google_sub == identidade.sub))
    if usuario is None:
        usuario = Usuario(google_sub=identidade.sub, criado_em=agora)
        sessao.add(usuario)
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
    sessao.commit()
