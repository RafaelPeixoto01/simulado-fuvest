"""Registro codigo da prova -> familia de layout (ADR-003; codigo da prova: ADR-015).

Uma prova so entra aqui depois que a familia extrai a prova dela sem pendencia
estrutural (V01/V03) — ver T-028 no plano de implementacao e o CR-011.

2021 nao esta registrado: o PDF usa fontes sem mapeamento de caracteres (o texto
sai como `(cid:N)`) e so seria extraivel com OCR, fora da decisao "sem IA".
A prova real da FUVEST 2027 (01/11/2026) entra depois de testada na familia 2027.
"""

FAMILIAS: dict[str, str] = {
    # layout de 2025: duas colunas, numero da questao em 13pt, "(A)".."(E)"
    "2020": "familia_2025",
    "2022": "familia_2025",
    "2023": "familia_2025",
    "2024": "familia_2025",
    "2025": "familia_2025",
    # simulados oficiais da FUVEST 2027 (CR-011): o layout de 2025 com o numero em 14pt,
    # 80 questoes e, na 1a edicao, o espaco como o glifo (cid:172)
    "2027s1": "familia_2027",
    "2027s2": "familia_2027",
}


class FamiliaNaoRegistrada(Exception):
    def __init__(self, codigo: str):
        suportadas = ", ".join(sorted(FAMILIAS)) or "nenhuma"
        super().__init__(f"Prova {codigo} sem família de layout registrada (provas suportadas: {suportadas})")
        self.codigo = codigo


def familia_da_prova(codigo: str) -> str:
    try:
        return FAMILIAS[codigo]
    except KeyError:
        raise FamiliaNaoRegistrada(codigo) from None
