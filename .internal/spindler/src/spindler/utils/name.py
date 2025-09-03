import hashlib
import re

from .strings import snake_to_camel_case


def i18nextify(name: str) -> str:
    """
    Convert a name to an i18next compatible format.
    Replaces $variableName (SugarCube var) with {{variableName}} (i18next).
    """
    # Replace $variableName (SugarCube var) with {{variableName}} (i18next)
    name = re.sub(r"\$(\w+)", r"{{vars.\1}}", name)
    return name


def hash_name(name: str) -> str:
    # Replace $variableName (SugarCube var) with {{variableName}} (i18next)
    return hashlib.sha256(name.encode()).hexdigest()[:8]


def make_nice_name(tag: str) -> str | None:
    """
    Converts a tag into a nice identifier by replacing spaces with underscores
    and removing special characters. Suitable for an AS function name.
    """
    tag = tag.strip().replace(" ", "_")
    tag = re.sub(r"[^a-zA-Z0-9_]", "", tag)
    tag = snake_to_camel_case(tag)
    return tag or None
