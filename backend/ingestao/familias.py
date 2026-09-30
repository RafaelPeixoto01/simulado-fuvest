"""Registro ano -> familia de layout (ADR-003).

Um ano so entra aqui depois que a familia extrai a prova dele sem pendencia
estrutural (V01/V03) — ver T-028 no plano de implementacao.

2021 nao esta registrado: o PDF usa fontes sem mapeamento de caracteres (o texto
sai como `(cid:N)`) e so seria extraivel com OCR, fora da decisao "sem IA".
"""

FAMILIAS: dict[int, str] = {
    # layout de 2025: duas colunas, numero da questao em 13pt, "(A)".."(E)"
    2020: "familia_2025",
    2022: "familia_2025",
    2023: "familia_2025",
    2024: "familia_2025",
    2025: "familia_2025",
}


class FamiliaNaoRegistrada(Exception):
    def __init__(self, ano: int):
        suportados = ", ".join(map(str, sorted(FAMILIAS))) or "nenhum"
        super().__init__(f"Ano {ano} sem família de layout registrada (anos suportados: {suportados})")
        self.ano = ano


def familia_do_ano(ano: int) -> str:
    try:
        return FAMILIAS[ano]
    except KeyError:
        raise FamiliaNaoRegistrada(ano) from None
