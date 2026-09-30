"""CLI do curador: `python -m ingestao <comando>` (specs/01-ingestao.md §2.3)."""

import argparse
import sys
from pathlib import Path

from app.config import Settings
from app.pacote.leitura import DIR_FIGURAS, PacoteInvalido, carregar_pacote, listar_pacotes
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
