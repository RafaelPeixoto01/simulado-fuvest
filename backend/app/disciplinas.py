"""As 8 disciplinas oficiais da 1a fase (Guia de Provas FUVEST 2025)."""

from enum import StrEnum


class Disciplina(StrEnum):
    BIOLOGIA = "biologia"
    FISICA = "fisica"
    GEOGRAFIA = "geografia"
    HISTORIA = "historia"
    INGLES = "ingles"
    MATEMATICA = "matematica"
    PORTUGUES = "portugues"
    QUIMICA = "quimica"


NOMES_DISCIPLINAS: dict[Disciplina, str] = {
    Disciplina.BIOLOGIA: "Biologia",
    Disciplina.FISICA: "Física",
    Disciplina.GEOGRAFIA: "Geografia",
    Disciplina.HISTORIA: "História",
    Disciplina.INGLES: "Inglês",
    Disciplina.MATEMATICA: "Matemática",
    Disciplina.PORTUGUES: "Português",
    Disciplina.QUIMICA: "Química",
}
