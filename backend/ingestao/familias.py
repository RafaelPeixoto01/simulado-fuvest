"""Registro ano -> familia de layout (ADR-003).

Um ano so entra aqui depois que a familia extrai a prova dele sem pendencia
estrutural (V01/V03) — ver T-028 no plano de implementacao.
"""

FAMILIAS: dict[int, str] = {
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
