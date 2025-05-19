from dataclasses import dataclass, field

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
class TraverseState:
    # The entry point passage ID
    passage_id: str | None = None
    # Children that this passage links to
    children: list[str] = field(default_factory=list)
    # The passage init code
    init: list[str] = field(default_factory=list)
    # async functions that need to be awaited
    async_functions: list[str] = field(default_factory=list)


@dataclass
class ConstructPassage:
    name: str
    id: str
    content: str
    state: TraverseState
    title: str | None = None
    title_id: str | None = None
    is_sign: bool = False
    nice_id: str | None = None
