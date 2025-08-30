def escape_string(s: str) -> str:
    return s.replace('"', '\\"').strip().replace("\n", "\\n")


def escape_and_quote(s: str) -> str:
    return f'"{escape_string(s)}"'


def strip_escape(s: str) -> str:
    """Remove escape sequences from a string."""
    return s.replace('\\"', '"').replace("\\n", "\n").strip()


def snake_to_camel_case(snake_str: str) -> str:
    """
    Converts a snake_case string to camelCase.
    """
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])
