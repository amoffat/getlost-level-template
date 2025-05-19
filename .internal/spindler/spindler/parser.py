import json
from pathlib import Path
from typing import cast

from lark import Lark, Token
from spindler.types.passage import TweePassage

THIS_DIR = Path(__file__).parent
GRAMMAR_DIR = THIS_DIR / "grammars"
TWEE_GRAMMAR = GRAMMAR_DIR / "twee.lark"
SUGARCUBE_GRAMMAR = GRAMMAR_DIR / "sugarcube.lark"

with open(TWEE_GRAMMAR, "r") as h:
    twee_grammar = Lark(
        strict=True,
        maybe_placeholders=False,
        propagate_positions=True,
        grammar=h,
    )

with open(SUGARCUBE_GRAMMAR, "r") as h:
    sugar_grammar = Lark(
        # ambiguity="explicit",
        strict=True,
        maybe_placeholders=False,
        propagate_positions=True,
        grammar=h,
    )


def parse(text) -> list[TweePassage]:
    passages: list[TweePassage] = []
    parsed_twee = twee_grammar.parse(text)

    story_data_node = next(parsed_twee.find_data("story_data"))
    story_data = json.loads(cast(Token, story_data_node.children[0]).value)
    start_node = story_data["start"]

    for passage_tree in parsed_twee.find_data("passage"):
        name = cast(
            Token, next(passage_tree.find_data("passage_name")).children[0]
        ).value
        body_tree = list(passage_tree.find_data("passage_body"))
        body = None
        if body_tree:
            body = cast(Token, body_tree[0].children[0]).value

        try:
            tags_node = next(passage_tree.find_data("tags"))
            tags = [cast(Token, tag).value for tag in tags_node.children]
        except StopIteration:
            tags = []

        tree = None
        if body:
            try:
                tree = sugar_grammar.parse(body)
            except:  # noqa
                print(f"Error parsing passage '{name}': {body}")
                raise

        passages.append(
            TweePassage(
                name=name,
                tree=tree,
                tags=tags,
                is_start=name == start_node,
            )
        )

    for passage in passages:
        if passage.name == "StoryData":
            pass

    return passages
