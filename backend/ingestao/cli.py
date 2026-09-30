"""CLI do curador: `python -m ingestao <comando>` (specs/01-ingestao.md §2.3)."""

import argparse
import sys
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from app.config import Settings
from app.database import criar_engine, criar_fabrica_sessao, normalizar_database_url
from app.pacote.leitura import DIR_FIGURAS, PacoteInvalido, carregar_pacote, listar_pacotes
from app.pacote.sincronizar import formatar_resumo, sincronizar
from app.pacote.validacao import formatar_relatorio, tem_bloqueante, validar_pacote


def _erro(mensagem: str) -> None:
    print(mensagem, file=sys.stderr)


def _validar_um(dir_prova: Path) -> bool:
    """Imprime o relatorio; False se o pacote impede o CI (invalido ou publicado com bloqueio)."""
    try:
        pacote = carregar_pacote(dir_prova)
    except PacoteInvalido as erro:
        print(f"== {dir_prova.name} — YAML INVÁLIDO\n  {erro.detalhe}")
        return False
    pendencias = validar_pacote(pacote, dir_prova / DIR_FIGURAS)
    print(formatar_relatorio(pacote, pendencias))
    return not (pacote.status == "publicada" and tem_bloqueante(pendencias))


def _cmd_validar(args: argparse.Namespace) -> int:
    if args.todas:
        diretorios = listar_pacotes(args.data_dir)
        if not diretorios:
            print(f"Nenhum pacote encontrado em {args.data_dir}")
            return 0
    else:
        dir_prova = args.data_dir / str(args.ano)
        if not dir_prova.is_dir():
            _erro(f"Pacote do ano {args.ano} não encontrado em {args.data_dir}")
            return 1
        diretorios = [dir_prova]
    resultados = [_validar_um(d) for d in diretorios]
    return 0 if all(resultados) else 1


def _cmd_importar(args: argparse.Namespace) -> int:
    settings = Settings.from_env()
    url = normalizar_database_url(settings.database_url)
    if args.incluir_rascunhos and not url.startswith("sqlite"):
        # ADR-008: rascunho so no banco local, nunca em producao
        _erro("--incluir-rascunhos só é aceito com banco SQLite local (DATABASE_URL).")
        return 1
    fabrica = criar_fabrica_sessao(criar_engine(url))
    try:
        with fabrica() as sessao:
            resumo = sincronizar(sessao, args.data_dir, incluir_rascunhos=args.incluir_rascunhos)
    except SQLAlchemyError as erro:
        _erro(f"Falha no banco ({erro.__class__.__name__}). "
              "O schema existe? Rode antes: python -m alembic upgrade head")
        return 1
    print(formatar_resumo(resumo))
    return 0


def _ano(valor: str) -> int:
    ano = int(valor)
    if not 1977 <= ano <= 2100:
        raise argparse.ArgumentTypeError("Ano inválido")
    return ano


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m ingestao", description=__doc__)
    sub = parser.add_subparsers(dest="comando", required=True)

    validar = sub.add_parser("validar", help="Valida pacotes (regras V01-V10)")
    alvo = validar.add_mutually_exclusive_group(required=True)
    alvo.add_argument("--ano", type=_ano)
    alvo.add_argument("--todas", action="store_true")
    validar.set_defaults(func=_cmd_validar)

    importar = sub.add_parser("importar", help="Sincroniza os pacotes com o banco de DATABASE_URL")
    importar.add_argument(
        "--incluir-rascunhos",
        action="store_true",
        help="Inclui rascunhos completos (só com banco SQLite local)",
    )
    importar.set_defaults(func=_cmd_importar)

    for comando in sub.choices.values():
        comando.add_argument(
            "--data-dir",
            type=Path,
            default=Settings.from_env().data_dir,
            help="Diretório dos pacotes (default: DATA_DIR ou data/provas)",
        )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    return args.func(args)
