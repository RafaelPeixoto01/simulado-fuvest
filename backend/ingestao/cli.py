"""CLI do curador: `python -m ingestao <comando>` (specs/01-ingestao.md §2.3)."""

import argparse
import re
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


NOME_RECORTE = re.compile(r"^(q\d{3}|tb\d{2})-[a-z0-9]+$")
ESCALA_RENDER = 2.0  # 144 dpi (specs/01 §2.4, item 8)


def _dir_cache(args: argparse.Namespace) -> Path:
    return args.data_dir.parent / "_cache" / str(args.ano)


def _pdf_em_cache(args: argparse.Namespace) -> Path | None:
    pdf = _dir_cache(args) / "prova.pdf"
    if not pdf.is_file():
        _erro(f"PDF da prova {args.ano} não está em cache ({pdf}). Rode `baixar` antes.")
        return None
    return pdf


def _pagina_valida(pdf: Path, pagina: int) -> bool:
    from ingestao.pdf_util import numero_paginas

    total = numero_paginas(pdf)
    if not 1 <= pagina <= total:
        _erro(f"Página fora do intervalo 1–{total}")
        return False
    return True


def _cmd_baixar(args: argparse.Namespace) -> int:
    from ingestao.baixar import ErroDownload, baixar

    try:
        destino = baixar(
            args.ano, args.prova_url, args.gabarito_url, args.versao,
            args.data_dir.parent / "_cache",
        )
    except (ErroDownload, OSError) as erro:
        _erro(f"Falha no download: {erro}")
        return 1
    print(f"PDFs e fonte.json gravados em {destino}")
    return 0


def _cmd_preview(args: argparse.Namespace) -> int:
    from PIL import ImageDraw

    from ingestao.pdf_util import renderizar_pagina

    pdf = _pdf_em_cache(args)
    if pdf is None or not _pagina_valida(pdf, args.pagina):
        return 1
    imagem = renderizar_pagina(pdf, args.pagina, ESCALA_RENDER).convert("RGB")
    desenho = ImageDraw.Draw(imagem)
    passo = args.grade * ESCALA_RENDER
    # Grade em pontos PDF: o curador le a bbox direto da imagem para usar em `recortar`
    for i in range(0, int(imagem.width / passo) + 1):
        x = round(i * passo)
        desenho.line([(x, 0), (x, imagem.height)], fill=(255, 0, 0), width=1)
        desenho.text((x + 2, 2), str(i * args.grade), fill=(255, 0, 0))
    for i in range(0, int(imagem.height / passo) + 1):
        y = round(i * passo)
        desenho.line([(0, y), (imagem.width, y)], fill=(0, 0, 255), width=1)
        desenho.text((2, y + 2), str(i * args.grade), fill=(0, 0, 255))
    destino = _dir_cache(args) / f"preview-p{args.pagina:02d}.png"
    imagem.save(destino)
    print(f"Preview gravado em {destino}")
    return 0


def _ler_bbox(texto: str, largura: float, altura: float) -> tuple[float, ...] | None:
    try:
        valores = tuple(float(v) for v in texto.split(","))
    except ValueError:
        return None
    if len(valores) != 4:
        return None
    x0, y0, x1, y1 = valores
    if not (0 <= x0 < x1 <= largura and 0 <= y0 < y1 <= altura):
        return None
    return valores


def _cmd_recortar(args: argparse.Namespace) -> int:
    if not NOME_RECORTE.match(args.nome):
        _erro("Nome inválido: use qNNN-k ou tbNN-k")
        return 1
    pdf = _pdf_em_cache(args)
    if pdf is None or not _pagina_valida(pdf, args.pagina):
        return 1

    from ingestao.figuras import para_webp
    from ingestao.pdf_util import renderizar_regiao, tamanho_pagina

    largura, altura = tamanho_pagina(pdf, args.pagina)
    bbox = _ler_bbox(args.bbox, largura, altura)
    if bbox is None:
        _erro(f"bbox inválida: use x0,y0,x1,y1 dentro de 0–{largura} × 0–{altura}")
        return 1
    imagem = renderizar_regiao(pdf, args.pagina, bbox, ESCALA_RENDER)
    destino = args.data_dir / str(args.ano) / DIR_FIGURAS / f"{args.nome}.webp"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(para_webp(imagem))
    print(f"Figura gravada em {destino}\nCole no prova.yaml:\n- figura: {args.nome}.webp")
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

    baixar = sub.add_parser("baixar", help="Baixa os PDFs de prova e gabarito para data/_cache")
    baixar.add_argument("--ano", type=_ano, required=True)
    baixar.add_argument("--prova-url", required=True)
    baixar.add_argument("--gabarito-url", required=True)
    baixar.add_argument("--versao", default="V1")
    baixar.set_defaults(func=_cmd_baixar)

    preview = sub.add_parser("preview", help="Renderiza uma página com grade de coordenadas")
    preview.add_argument("--ano", type=_ano, required=True)
    preview.add_argument("--pagina", type=int, required=True)
    preview.add_argument("--grade", type=int, default=50, help="Espaço da grade em pontos PDF")
    preview.set_defaults(func=_cmd_preview)

    recortar = sub.add_parser("recortar", help="Recorta uma região da página como figura WebP")
    recortar.add_argument("--ano", type=_ano, required=True)
    recortar.add_argument("--pagina", type=int, required=True)
    recortar.add_argument("--bbox", required=True, help="x0,y0,x1,y1 em pontos PDF")
    recortar.add_argument("--nome", required=True, help="qNNN-k ou tbNN-k (sem extensão)")
    recortar.set_defaults(func=_cmd_recortar)

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
