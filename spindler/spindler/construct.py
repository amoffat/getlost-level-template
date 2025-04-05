import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Union, cast
import subprocess


import jinja2
from lark import ParseTree, Token, Tree

from .types.passage import ConstructPassage, ParsedPassage

THIS_DIR = Path(__file__).parent
_TMPL_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(THIS_DIR / "templates"),
    undefined=jinja2.StrictUndefined,
)
STORY_INIT = "StoryInit"
INVENTORY_VAR = "inventory"


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
        state_class += f"    {var_name}: {variable.type};\n"
    state_class += "    constructor() {\n"
    for var_name, variable in variable_types.items():
        state_class += f"        this.{var_name} = {variable.value};\n"
    state_class += "    }\n"
    state_class += "}"
    return state_class


def infer_basic_type(value_node: Union[ParseTree, Token]) -> tuple[str, str]:
    if isinstance(value_node, Token):
        if value_node.type == "NUMBER":
            # FIXME
            return ("f32", value_node.value)
        elif value_node.type == "STRING":
            return ("string", value_node.value)
        elif value_node.type in {"TRUE", "FALSE"}:
            return ("bool", value_node.value)

    return ("unknown", "unknown")


def find_state_classes(passages: list[ParsedPassage]) -> dict[str, str]:
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

                        # Generate a class name and state class for the js_object
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
    passages: dict[str, ParsedPassage],
    state_classes: dict[str, str],
) -> dict[str, Variable]:
    """
    Infers variable types by analyzing the ParseTree for variable assignments.
    Returns a mapping of variable names to their inferred types.
    """
    variable_types: dict[str, Variable] = {}

    for passage in passages.values():
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


def render(passages: dict[str, ParsedPassage]) -> str:
    """
    Converts a dictionary of Sugarcube parse trees into Typescript code.
    Each passage is converted into a function named by a hash of the passage name.
    """

    name_num = 0

    def hash_name(name: str) -> str:
        return hashlib.sha256(name.encode()).hexdigest()[:8]

    def get_temp_name(prefix: str) -> str:
        nonlocal name_num
        name_num += 1
        return f"{prefix}_{name_num}"

    def escape_string(s: str) -> str:
        return s.replace('"', '\\"')

    def escape_and_quote(s: str) -> str:
        return f'"{escape_string(s)}"'

    cur_passage_id: str | None = None
    passage_init: list[str] = []
    all_strings: dict[str, str] = {}

    def traverse(node: ParseTree | Token, indent: int = 0) -> str:
        nonlocal cur_passage_id

        ind = "    " * indent
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
                traverse(cast(ParseTree, child), indent) for child in node.children
            )
        elif node.data == "link":
            text = traverse(node.children[0])
            target = hash_name(text)
            if len(node.children) > 1:
                target = hash_name(cast(Token, node.children[1]).value)

            choices = f"""\
{ind}// {text}
{ind}choices.push("{target}");\
"""
            return choices
        elif node.data == "if_macro":
            condition = traverse(cast(ParseTree, node.children[0]))
            body = traverse(cast(ParseTree, node.children[1]), indent + 1)
            elseif_blocks = "".join(
                traverse(cast(ParseTree, child), indent)
                for child in node.children[2:-1]
            )
            else_block = (
                traverse(cast(ParseTree, node.children[-1]), indent)
                if len(node.children) > 2
                and cast(ParseTree, node.children[-1]).data == "else_macro"
                else ""
            )
            return (
                f"{ind}if ({condition}) {{\n{body}\n{ind}}}{elseif_blocks}{else_block}"
            )
        elif node.data == "elseif_macro":
            condition = traverse(cast(ParseTree, node.children[0]))
            body = traverse(cast(ParseTree, node.children[1]), indent + 1)
            return f" else if ({condition}) {{\n{body}\n{ind}}}"
        elif node.data == "else_macro":
            body = traverse(cast(ParseTree, node.children[0]), indent + 1)
            return f" else {{\n{body}\n{ind}}}"
        elif node.data == "set_macro":
            var = cast(ParseTree, node.children[0])
            value_node = node.children[1]
            value = traverse(value_node)

            if isinstance(value_node, Tree) and value_node.data == "js_object":
                return ""

            if var.data == "global_var":
                var_name = cast(Token, var.children[0]).value
                return f"{ind}state.{var_name} = {value};"

            elif var.data == "local_var":
                var_name = cast(Token, var.children[0]).value
                return f"{ind}state.{var_name} = {value};"

            else:
                raise ValueError(f"Unknown variable type: {var.data}")

        elif node.data == "text":
            text_expr = cast(Token, node.children[0]).value
            text_id = hash_name(text_expr)
            all_strings[text_id] = escape_and_quote(text_expr)
            text = f"""\
{ind}// {text_expr}
{ind}text = "{text_id}";\
"""
            return text
        elif node.data == "function_call":
            function_name = cast(Token, node.children[0]).value
            if function_name == "visited" and len(node.children) == 1:
                # Special case: hard code self passage as the argument
                return f'{ind}{function_name}("{cur_passage_id}")'

            def resolve_passage(expr: str) -> str:
                return f"passageLookup.get({expr})"

            arguments = ", ".join(
                resolve_passage(traverse(cast(ParseTree, arg)))
                for arg in node.children[1:]
            )
            return f"{ind}{function_name}({arguments})"
        elif node.data == "global_var":
            var_name = cast(Token, node.children[0]).value
            return f"{ind}state.{var_name}"

        elif node.data == "local_var":
            var_name = cast(Token, node.children[0]).value
            return f"{ind}state.{var_name}"

        elif node.data == "pickup_check":
            tags = {}
            for pair in node.children:
                pair = cast(ParseTree, pair)
                tag = cast(Token, pair.children[0]).value
                value = traverse(pair.children[1])
                if value == "null":
                    value = '""'
                tags[tag] = value

            tag_var_name = get_temp_name("pickup_tags")
            passage_init.append(f"let {tag_var_name} = new Map<string, string>();")
            for tag, value in tags.items():
                passage_init.append(f'{tag_var_name}.set("{tag}", {value});')
            return f"{ind}host.pickup.has({tag_var_name})"

        elif node.data == "binary_comparison":
            left = traverse(cast(ParseTree, node.children[0]))
            operator = map_op(cast(Token, node.children[1]).value)
            right = traverse(cast(ParseTree, node.children[2]))
            return f"{left} {operator} {right}"

        elif node.data == "wrapping_macro":
            macro_name = cast(ParseTree, node.children[0])
            if macro_name.data == "widget":
                return ""

        elif node.data == "custom_macro":
            macro_name = cast(Token, node.children[0]).value
            return f"<<macro {macro_name}>>"

        # Add more cases for other constructs...
        data = "\n".join(f"{ind}// {line}" for line in node.pretty().split("\n"))
        return f"{ind}// FIXME: MISSING RULES:\n{data}"

    state_classes = find_state_classes([p for p in passages.values() if p is not None])
    variable_types = infer_variable_types(passages, state_classes)
    state_class = create_state_class("State", variable_types)

    # Create our state definition classes
    state_class_defs = []
    for name, class_def in state_classes.items():
        state_class_defs.append(class_def)
    state_class_defs.append(state_class)

    # Create our macro registry
    macro_registry: dict[str, str] = {}
    for passage in passages.values():
        if passage.tree is None:
            continue
        for node in passage.tree.find_data("wrapping_macro"):
            macro_name = cast(ParseTree, node.children[0])
            if macro_name.data == "widget":
                widget_name = cast(Token, macro_name.children[0]).value
                body = traverse(cast(ParseTree, node.children[1]))
                macro_registry[widget_name] = body

    # Create a mapping from passage names to their hashed names
    passage_name_to_id: dict[str, str] = {}
    for name in passages.keys():
        if name == STORY_INIT:
            continue
        hashed_name = hash_name(name)
        passage_name_to_id[name] = hashed_name

    # Generate our individual passage functions
    passage_functions: list[ConstructPassage] = []
    for name, passage in passages.items():
        if passage.tree is None:
            continue
        if name == STORY_INIT:
            continue
        hashed_name = passage_name_to_id[name]
        cur_passage_id = hashed_name
        content = traverse(passage.tree, indent=1)

        # Using regex, find and replace all <<macro {macro_name}>> with the
        # macro content from macro_registry
        for to_expand, expanded_macro in macro_registry.items():
            content = content.replace(f"<<macro {to_expand}>>", expanded_macro)

        title = escape_and_quote("FIXME")
        passage_functions.append(
            ConstructPassage(
                name=name,
                id=hashed_name,
                title=title,
                init=passage_init.copy(),
                content=content,
            )
        )
        passage_init.clear()

    code_tmpl = _TMPL_ENV.get_template("code.j2")
    output = code_tmpl.render(
        all_strings=all_strings,
        state_classes=state_class_defs,
        passages=passage_functions,
        passage_lookup=passage_name_to_id,
    )
    output = format(output)

    return output
