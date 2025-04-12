from dataclasses import dataclass

from lark import ParseTree

from ..utils.name import hash_name

STORY_INIT = "StoryInit"


@dataclass
class TweePassage:
    name: str
    tree: ParseTree | None
    tags: list[str]
    is_start: bool = False

    def __post_init__(self):
        self._id = None

    @property
    def is_init(self):
        return self.name == STORY_INIT

    @property
    def id(self):
        if self.is_init:
            return ">init"
        elif self.is_start:
            return ">start"

        if self._id is None:
            self._id = hash_name(self.name)
        return self._id


@dataclass
class ConstructPassage:
    name: str
    id: str
    init: list[str]
    content: str
    title: str | None = None
    title_id: str | None = None
    is_sign: bool = False
