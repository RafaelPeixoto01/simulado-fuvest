"""CLI do curador: `python -m ingestao <comando>` (specs/01-ingestao.md §2.3)."""

import argparse
import json
import re
import shutil
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


PENDENCIAS_ESTRUTURAIS = {"V02", "V03", "V06", "V08"}


def _cmd_extrair(args: argparse.Namespace) -> int:
    from app.pacote.leitura import ARQUIVO_PACOTE, salvar_pacote
    from app.pacote.schema import Fonte, PacoteProva
    from ingestao.familias import FamiliaNaoRegistrada, familia_do_ano
    from ingestao.gabarito import obter_parser_gabarito
    from ingestao.gabarito.familia_2025 import ErroGabarito
    from ingestao.layouts import obter_parser_layout

    cache = _dir_cache(args)
    if not (cache / "fonte.json").is_file():
        _erro(f"Sem PDFs em cache para {args.ano} ({cache}). Rode `baixar` antes.")
        return 1
    try:
        familia = familia_do_ano(args.ano)
    except FamiliaNaoRegistrada as erro:
        _erro(str(erro))
        return 1
    dir_prova = args.data_dir / str(args.ano)
    if (dir_prova / ARQUIVO_PACOTE).exists() and not args.forcar:
        _erro(f"{dir_prova / ARQUIVO_PACOTE} já existe e pode ter revisão manual. "
              "Use --forcar para sobrescrever.")
        return 1

    fonte = json.loads((cache / "fonte.json").read_text(encoding="utf-8"))
    try:
        gabarito = obter_parser_gabarito(args.ano).extrair(cache / "gabarito.pdf", fonte["versao"])
    except ErroGabarito as erro:
        _erro(f"Gabarito: {erro}")
        return 1
    resultado = obter_parser_layout(args.ano).extrair(cache / "prova.pdf")

    for q in resultado.questoes:
        marcacao = gabarito.get(q.numero)
        if marcacao == "anulada":
            q.anulada = True
        elif marcacao is None:
            q.pendencias.append("Marcação de gabarito não reconhecida: conferir no PDF")
        else:
            q.resposta = marcacao

    pacote = PacoteProva(
        ano=args.ano,
        versao=fonte["versao"],
        status="rascunho",
        fonte=Fonte(url_prova=fonte["url_prova"], url_gabarito=fonte["url_gabarito"],
                    familia_layout=familia),
        textos_base=resultado.textos_base,
        questoes=resultado.questoes,
    )
    figuras = dir_prova / DIR_FIGURAS
    if figuras.is_dir():
        shutil.rmtree(figuras)  # com --forcar: figuras antigas virariam orfas
    figuras.mkdir(parents=True)
    for nome, dados in resultado.figuras.items():
        (figuras / nome).write_bytes(dados)
    salvar_pacote(pacote, dir_prova)

    pendencias = validar_pacote(pacote, figuras)
    print(formatar_relatorio(pacote, pendencias))
    com_problema = {
        p.questao for p in pendencias if p.codigo in PENDENCIAS_ESTRUTURAIS and p.questao
    }
    limpas = len(pacote.questoes) - len(com_problema)
    print(f"\n{limpas}/{len(pacote.questoes)} questões sem pendência estrutural "
          f"({len(resultado.figuras)} figuras). Próximo passo: classificar as disciplinas (V05).")
    return 0


def _descrever_banco(url: str) -> str:
    """host/banco sem usuario nem senha (a URL publica da Railway tem a senha)."""
    from sqlalchemy.engine import make_url

    u = make_url(normalizar_database_url(url))
    return f"{u.host or 'local'}/{u.database}"


def _executar_reportes(args: argparse.Namespace) -> int:
    from app.services.reportes import listar_reportes, resolver_reportes

    fabrica = criar_fabrica_sessao(criar_engine(args.database_url))
    with fabrica() as sessao:
        if args.acao == "listar":
            status = None if args.status == "todos" else args.status
            reportes = listar_reportes(sessao, status)
            if not reportes:
                print(f"Nenhum reporte ({args.status}).")
            for r in reportes:
                data = r.criado_em.strftime("%Y-%m-%d %H:%M") if r.criado_em else "?"
                print(f"{r.id:>5} | {r.questao_id} | {r.tipo:<9} | {r.status:<9} | {data} | "
                      f"{r.descricao or ''}")
            return 0
        resultado = resolver_reportes(sessao, args.ids)
        print(f"Resolvidos: {resultado.resolvidos or 'nenhum'}")
        if resultado.ja_resolvidos:
            print(f"Já estavam resolvidos: {resultado.ja_resolvidos}")
        if resultado.inexistentes:
            print(f"Inexistentes: {resultado.inexistentes}")
            return 1
        return 0


def _cmd_reportes(args: argparse.Namespace) -> int:
    # Sempre mostra o banco alvo antes de agir (ADR-008)
    print(f"Banco: {_descrever_banco(args.database_url)}")
    try:
        return _executar_reportes(args)
    except SQLAlchemyError as erro:
        _erro(f"Falha no banco ({erro.__class__.__name__}).")
        return 1


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

    extrair = sub.add_parser("extrair", help="Extrai a prova em cache para um pacote rascunho")
    extrair.add_argument("--ano", type=_ano, required=True)
    extrair.add_argument("--forcar", action="store_true",
                         help="Sobrescreve prova.yaml existente (perde a revisão manual)")
    extrair.set_defaults(func=_cmd_extrair)

    reportes = sub.add_parser("reportes", help="Reportes de erro enviados pelos estudantes")
    acoes = reportes.add_subparsers(dest="acao", required=True)
    for nome, ajuda in (("listar", "Lista os reportes"), ("resolver", "Marca reportes como resolvidos")):
        acao = acoes.add_parser(nome, help=ajuda)
        # Obrigatoria e nunca lida do ambiente: comando local contra producao (ADR-008)
        acao.add_argument("--database-url", required=True,
                          help="URL do banco (produção: DATABASE_PUBLIC_URL da Railway)")
        acao.set_defaults(func=_cmd_reportes)
    acoes.choices["listar"].add_argument(
        "--status", choices=["pendente", "resolvido", "todos"], default="pendente"
    )
    acoes.choices["resolver"].add_argument("ids", type=int, nargs="+")

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
