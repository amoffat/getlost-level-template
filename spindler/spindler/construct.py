import subprocess
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Union, cast

import jinja2
from lark import ParseTree, Token, Tree

from .types.passage import ConstructPassage, TweePassage
from .utils.name import hash_name

THIS_DIR = Path(__file__).parent
_TMPL_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(THIS_DIR / "templates"),
    undefined=jinja2.StrictUndefined,
)

INVENTORY_VAR = "inventory"

# Tags that should not control the dialogue title
SPECIAL_TAGS = {"widget"}


@dataclass
class Variable:
    name: str
    type: str
    value: str


def format(code: str) -> str:
    result = subprocess.run(
        [
            "npx",
            "prettier",
            "--parser",
            "typescript",
            "--trailing-comma",
            "all",
        ],
        input=code.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Prettier error: {result.stderr.decode()}")
    return result.stdout.decode()


def make_state_class_name(suffix: str) -> str:
    return f"State_{suffix}"


def map_op(op: str) -> str:
    """
    Maps SugarCube operators to their corresponding AS operators.
    """
    operator_map = {
        "is": "===",
        "===": "===",
        "isnot": "!==",
        "!==": "!==",
        "eq": "==",
        "==": "==",
        "neq": "!=",
        "!=": "!=",
        "gt": ">",
        ">": ">",
        "gte": ">=",
        ">=": ">=",
        "lt": "<",
        "<": "<",
        "lte": "<=",
        "<=": "<=",
        "and": "&&",
        "&&": "&&",
        "or": "||",
        "||": "||",
        "not": "!",
        "!": "!",
    }
    return operator_map.get(op, op)


def create_state_class(name: str, variable_types: dict[str, Variable]) -> str:
    """
    Generates the TypeScript State class definition based on the inferred
    variable types.
    """
    state_class = f"class {name} {{\n"
    for var_name, variable in variable_types.items():
        state_class += f"{var_name}: {variable.type};\n"
    state_class += "constructor() {\n"
    for var_name, variable in variable_types.items():
        state_class += f"this.{var_name} = {variable.value};\n"
    state_class += "}\n"
    state_class += "}"
    return state_class


def infer_basic_type(value_node: Union[ParseTree, Token]) -> tuple[str, str]:
    if isinstance(value_node, Token):
        if value_node.type == "NUMBER":
            # FIXME not everything is a float...
            return ("f32", value_node.value)
        elif value_node.type == "STRING":
            return ("string", value_node.value)
        elif value_node.type in {"TRUE", "FALSE"}:
            return ("bool", value_node.value)

    return ("unknown", "unknown")


def find_state_classes(passages: list[TweePassage]) -> dict[str, str]:
    """
    Finds all state classes in the given passages and returns a mapping of class
    names to their definitions.
    """
    state_classes: dict[str, str] = {}

    for passage in passages:
        parse_tree = passage.tree
        if parse_tree is None:
            continue

        for set_macro in parse_tree.find_data("set_macro"):
            var_node = cast(ParseTree, set_macro.children[0])
            value_node = cast(ParseTree, set_macro.children[1])
            if var_node.data in {"global_var", "local_var"}:
                var_name = cast(Token, var_node.children[0]).value

                # Skip the inventory variable, since it's only for Twine
                if var_name == INVENTORY_VAR:
                    continue

                if isinstance(value_node, Tree):
                    if value_node.data == "js_object":
                        class_name = make_state_class_name(var_name)
                        if var_name in state_classes:
                            continue

                        # Recursively infer types for js_object
                        prop_types = {}
                        for pair in value_node.find_data("pair"):
                            key = cast(Token, pair.children[0]).value
                            value = pair.children[1]
                            prop_types[key] = infer_basic_type(value)

                        # Generate a class name and state class for the
                        # js_object
                        state_class = create_state_class(
                            class_name,
                            {
                                key: Variable(name=key, type=type_, value=val)
                                for key, (type_, val) in prop_types.items()
                            },
                        )
                        state_classes[var_name] = state_class

    return state_classes


def infer_variable_types(
    passages: list[TweePassage],
    state_classes: dict[str, str],
) -> dict[str, Variable]:
    """
    Infers variable types by analyzing the ParseTree for variable assignments.
    Returns a mapping of variable names to their inferred types.
    """
    variable_types: dict[str, Variable] = {}

    for passage in passages:
        parse_tree = passage.tree

        if parse_tree is None:
            continue

        for set_macro in parse_tree.find_data("set_macro"):
            var_node = cast(ParseTree, set_macro.children[0])

            value_node = cast(ParseTree, set_macro.children[1])
            if var_node.data in {"global_var", "local_var"}:
                var_name = cast(Token, var_node.children[0]).value

                # Skip the inventory variable, since it's only for Twine
                if var_name == INVENTORY_VAR:
                    continue

                # Don't include variables with dots in their names
                if "." not in var_name:
                    obj_class = state_classes.get(var_name)
                    if obj_class:
                        cls_name = make_state_class_name(var_name)
                        variable_types[var_name] = Variable(
                            name=var_name,
                            type=cls_name,
                            value="new " + cls_name + "()",
                        )
                    else:
                        vtype, value = infer_basic_type(value_node)
                        # Only add the variable if it doesn't already exist, so that
                        # it only gets set the first time to the initial value
                        if var_name not in variable_types:
                            variable_types[var_name] = Variable(
                                name=var_name,
                                type=vtype,
                                value=value,
                            )

    return variable_types


def topological_sort(
    passage_to_children: dict[str, set[str]],
) -> list[str]:
    """
    Perform a topological sort of passages based on their dependencies. Returns
    a list of passage IDs in topological order.
    """
    visited = set()
    stack = []

    def visit(passage_id: str):
        if passage_id in visited:
            return
        visited.add(passage_id)
        for child_id in passage_to_children.get(passage_id, set()):
            visit(child_id)
        stack.append(passage_id)

    for passage_id in passage_to_children:
        visit(passage_id)

    return stack[::-1]  # Reverse the stack to get the topological order


@dataclass
class TraverseState:
    # The entry point passage ID
    passage_id: str | None = None
    # Children that this passage links to
    children: list[str] = field(default_factory=list)


def render(passages: list[TweePassage]) -> str:
    """
    Converts a dictionary of Sugarcube parse trees into Typescript code.
    Each passage is converted into a function named by a hash of the passage name.
    """

    name_num = 0

    def get_temp_name(prefix: str) -> str:
        nonlocal name_num
        name_num += 1
        return f"{prefix}_{name_num}"

    def escape_string(s: str) -> str:
        return s.replace('"', '\\"')

    def escape_and_quote(s: str) -> str:
        return f'"{escape_string(s)}"'

    passage_init: list[str] = []
    all_strings: dict[str, str] = {}

    def traverse(
        *,
        state: TraverseState,
        node: ParseTree | Token,
    ) -> str:

        if isinstance(node, Token):
            if node.type == "TRUE":
                return "true"
            elif node.type == "FALSE":
                return "false"
            elif node.type == "NUMBER":
                return node.value
            elif node.type == "NULL":
                return "null"
            elif node.type == "ESCAPED_STRING":
                s = node.value
                all_strings[hash_name(s)] = s
                return s
            elif node.type == "LINK_TEXT":
                s = node.value
                all_strings[hash_name(s)] = escape_and_quote(s)
                return s
            elif node.type == "TEXT":
                s = node.value
                all_strings[hash_name(s)] = escape_and_quote(s)
                return s

            return node.value

        if node.data == "body":
            return "\n".join(
                traverse(state=state, node=cast(ParseTree, child))
                for child in node.children
            )
        elif node.data == "link":
            text = traverse(state=state, node=node.children[0])
            target_id = hash_name(text)
            if len(node.children) > 1:
                # This is counterintuitive, but the string id is of the link
                # target, but it's value is the text of the link. This is
                # because we want to use the target id in our code, but render
                # the text of the link as the string.
                target_name = cast(Token, node.children[1]).value
                target_id = hash_name(target_name)
                all_strings[target_id] = escape_and_quote(text)

            state.children.append(target_id)
            choices = f'// {text}\nchoices.push("{target_id}");'
            return choices
        elif node.data == "if_macro":
            condition = traverse(state=state, node=cast(ParseTree, node.children[0]))
            body = traverse(state=state, node=cast(ParseTree, node.children[1]))
            elseif_blocks = "".join(
                traverse(state=state, node=cast(ParseTree, child))
                for child in node.children[2:-1]
            )
            else_block = (
                traverse(state=state, node=cast(ParseTree, node.children[-1]))
                if len(node.children) > 2
                and cast(ParseTree, node.children[-1]).data == "else_macro"
                else ""
            )
            return f"if ({condition}) {{\n{body}\n}}{elseif_blocks}{else_block}"
        elif node.data == "elseif_macro":
            condition = traverse(state=state, node=cast(ParseTree, node.children[0]))
            body = traverse(state=state, node=cast(ParseTree, node.children[1]))
            return f" else if ({condition}) {{\n{body}\n}}"
        elif node.data == "else_macro":
            body = traverse(state=state, node=cast(ParseTree, node.children[0]))
            return f" else {{\n{body}\n}}"
        elif node.data == "set_macro":
            var = cast(ParseTree, node.children[0])
            value_node = node.children[1]
            value = traverse(state=state, node=value_node)

            if isinstance(value_node, Tree) and value_node.data == "js_object":
                return ""

            if var.data == "global_var":
                var_name = cast(Token, var.children[0]).value
                return f"state.{var_name} = {value};"

            elif var.data == "local_var":
                var_name = cast(Token, var.children[0]).value
                return f"state.{var_name} = {value};"

            else:
                raise ValueError(f"Unknown variable type: {var.data}")

        elif node.data == "text":
            text_expr = cast(Token, node.children[0]).value
            text_id = hash_name(text_expr)
            all_strings[text_id] = escape_and_quote(text_expr)
            text = f'// {text_expr}\ntext = "{text_id}";'
            return text
        elif node.data == "function_call":
            function_name = cast(Token, node.children[0]).value
            if function_name == "visited":
                if len(node.children) == 1:
                    # Special case: hard code self passage as the argument
                    return f'{function_name}("{state.passage_id}")'

                def resolve_passage(expr: str) -> str:
                    return f"passageLookup.get({expr})"

                arguments = ", ".join(
                    resolve_passage(traverse(state=state, node=cast(ParseTree, arg)))
                    for arg in node.children[1:]
                )
            else:
                arguments = ", ".join(
                    traverse(state=state, node=cast(ParseTree, arg))
                    for arg in node.children[1:]
                )
            return f"{function_name}({arguments})"
        elif node.data == "global_var":
            var_name = cast(Token, node.children[0]).value
            return f"state.{var_name}"

        elif node.data == "local_var":
            var_name = cast(Token, node.children[0]).value
            return f"state.{var_name}"

        elif node.data == "pickup_check":
            tags = {}
            for pair in node.children:
                pair = cast(ParseTree, pair)
                tag = cast(Token, pair.children[0]).value
                value = traverse(state=state, node=pair.children[1])
                if value == "null":
                    value = '""'
                tags[tag] = value

            tag_var_name = get_temp_name("pickup_tags")
            passage_init.append(f"let {tag_var_name} = new Map<string, string>();")
            for tag, value in tags.items():
                passage_init.append(f'{tag_var_name}.set("{tag}", {value});')
            return f"host.pickup.has({tag_var_name})"

        elif node.data == "binary_comparison":
            left = traverse(state=state, node=cast(ParseTree, node.children[0]))
            operator = map_op(cast(Token, node.children[1]).value)
            right = traverse(state=state, node=cast(ParseTree, node.children[2]))
            return f"{left} {operator} {right}"

        elif node.data == "wrapping_macro":
            macro_name = cast(ParseTree, node.children[0])
            if macro_name.data == "widget":
                return ""

        elif node.data == "custom_macro":
            macro_name = cast(Token, node.children[0]).value
            return f"<<macro {macro_name}>>"

        # Add more cases for other constructs...
        data = "\n".join(f"// {line}" for line in node.pretty().split("\n"))
        return f"// FIXME: MISSING RULES:\n{data}"

    # Create a mapping from passage names to their hashed names
    passage_id_to_passage: dict[str, TweePassage] = {}
    passage_name_to_id: dict[str, str] = {}
    start_passage: TweePassage | None = None
    init_passage: TweePassage | None = None
    for passage in passages:
        if passage.is_start:
            start_passage = passage
        elif passage.is_init:
            init_passage = passage

        passage_id_to_passage[passage.id] = passage
        passage_name_to_id[passage.name] = passage.id

    assert start_passage is not None, "No start passage found"
    assert init_passage is not None, "No init passage found"

    passage_to_children: dict[str, set[str]] = defaultdict(set)

    # Create our macro registry. We'll replace all invocations of the macro with
    # the macro body
    macro_registry: dict[str, tuple[str, TraverseState]] = {}
    for passage in passages:
        if passage.tree is None:
            continue
        for node in passage.tree.find_data("wrapping_macro"):
            macro_name = cast(ParseTree, node.children[0])
            if macro_name.data == "widget":
                widget_name = cast(Token, macro_name.children[0]).value
                state = TraverseState()
                body = traverse(state=state, node=cast(ParseTree, node.children[1]))
                macro_registry[widget_name] = (body, state)

    # Generate our individual passage functions
    passage_functions: list[ConstructPassage] = []
    for passage in passages:

        # If we're the root node passage, we only need to traverse the tree to
        # populate links, but otherwise we don't treat it like a normal passage.
        if passage.is_start and passage.tree:
            state = TraverseState()
            traverse(state=state, node=passage.tree)
            passage_to_children[passage.id].update(state.children)
            continue

        if passage.is_init:
            continue

        if passage.tree is None:
            continue

        state = TraverseState(passage_id=passage.id)
        content = traverse(state=state, node=passage.tree)

        # Merge our mapping of passage IDs to their children
        passage_to_children[passage.id].update(state.children)

        # Using regex, find and replace all <<macro {macro_name}>> with the
        # macro content from macro_registry
        for to_expand, (expanded_macro, state) in macro_registry.items():
            to_replace = f"<<macro {to_expand}>>"
            if to_replace in content:
                content = content.replace(to_replace, expanded_macro)
                passage_to_children[passage.id].update(state.children)

        passage_functions.append(
            ConstructPassage(
                name=passage.name,
                id=passage.id,
                title=None,
                init=passage_init.copy(),
                content=content,
            )
        )
        passage_init.clear()

    # Walk our passage links to propagate the tag names
    passage_to_title: dict[str | None, str | None] = {}

    tag_node_visited = set()

    def propagate_tags(passage_id: str, tag: str | None = None):
        tag_node_visited.add(passage_id)
        passage = passage_id_to_passage[passage_id]
        children = passage_to_children.get(passage_id, set())

        for cand_tag in passage.tags:
            if cand_tag not in SPECIAL_TAGS:
                tag = cand_tag
                break

        passage_to_title[passage_id] = tag
        for child_id in children:
            if child_id in tag_node_visited:
                continue

            if child_id:
                propagate_tags(child_id, tag)

    propagate_tags(start_passage.id)

    # Now backfill our titles
    for cons_passage in passage_functions:
        title = passage_to_title.get(cons_passage.id) or "???"
        title_id = hash_name(title)
        cons_passage.title = escape_and_quote(title)
        all_strings[title_id] = cons_passage.title
        cons_passage.title_id = title_id

    # Perform a topological sort of our passages so that when we start deriving
    # our state classes below, variables are initialized with the value that
    # they were first set to.
    passage_order = topological_sort(passage_to_children)
    passages = [passage_id_to_passage[passage_id] for passage_id in passage_order]

    # Insert the init passage at the start of the list because it often contains var
    # initializations
    passages.insert(0, init_passage)

    state_classes = find_state_classes([p for p in passages if p is not None])
    variable_types = infer_variable_types(passages, state_classes)
    state_class = create_state_class("State", variable_types)

    # Create our state definition classes
    state_class_defs = []
    for name, class_def in state_classes.items():
        state_class_defs.append(class_def)
    state_class_defs.append(state_class)

    code_tmpl = _TMPL_ENV.get_template("code.j2")
    output = code_tmpl.render(
        all_strings=all_strings,
        state_classes=state_class_defs,
        passages=passage_functions,
        passage_lookup=passage_name_to_id,
    )
    output = format(output)

    return output
