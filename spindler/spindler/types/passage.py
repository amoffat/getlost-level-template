from dataclasses import dataclass

from lark import ParseTree


@dataclass
class TweePassage:
    tree: ParseTree | None
    tags: list[str]


@dataclass
class ConstructPassage:
    name: str
    id: str
    init: list[str]
    content: str
    title: str | None = None
    title_id: str | None = None
