from dataclasses import dataclass


@dataclass
class RenderResult:
    code: str
    strings: dict[str, str]
