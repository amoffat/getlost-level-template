import hashlib
import re


def i18nextify(name: str) -> str:
    """
    Convert a name to an i18next compatible format.
    Replaces $variableName (SugarCube var) with {{variableName}} (i18next).
    """
    # Replace $variableName (SugarCube var) with {{variableName}} (i18next)
    name = re.sub(r"\$(\w+)", r"{{\1}}", name)
    return name


def hash_name(name: str) -> str:
    # Replace $variableName (SugarCube var) with {{variableName}} (i18next)
    return hashlib.sha256(name.encode()).hexdigest()[:8]
