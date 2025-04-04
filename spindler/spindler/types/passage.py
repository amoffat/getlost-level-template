from dataclasses import dataclass

from lark import ParseTree


@dataclass
class ParsedPassage:
    tree: ParseTree | None
    tags: list[str]


@dataclass
class ConstructPassage:
    name: str
    id: str
    title: str
    init: list[str]
    content: str
