import argparse
import json
import pathlib
import sys

from .construct import render
from .parser import parse
from .types.render import RenderResult


class ParseException(Exception):
    pass


class RenderException(Exception):
    pass


def process(text: str) -> RenderResult:
    try:
        parsed = parse(text)
    except Exception as e:
        raise ParseException(str(e)) from e

    try:
        res = render(parsed)
    except Exception as e:
        raise RenderException(str(e)) from e

    return res


def main():

    parser = argparse.ArgumentParser(description="Process a Twee file.")
    parser.add_argument("input_file", help="Path to the input Twee file")
    parser.add_argument(
        "--output-code",
        type=pathlib.Path,
        required=True,
        help="Path to the output code file",
    )
    parser.add_argument(
        "--output-strings",
        type=pathlib.Path,
        required=True,
        help="Path to the output strings file",
    )
    args = parser.parse_args()

    with open(args.input_file, "r") as h:
        text = h.read()

    try:
        result = process(text)
    except ParseException as e:
        sys.stderr.write(f"Error parsing Twine dialogue file: {e}")
        sys.exit(1)
    except RenderException as e:
        sys.stderr.write(
            f"Error rendering Assemblyscript dialogue file from Twine: {e}"
        )
        sys.exit(1)

    with open(args.output_code, "w") as code_file:
        code_file.write(result.code)

    preserved_context = {}
    if args.output_strings.exists():
        with open(args.output_strings, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    key = entry.get("k")
                    context = entry.get("ctx")
                    if key is not None and context is not None:
                        preserved_context[key] = context
                except Exception:
                    continue

    args.output_strings.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output_strings, "w") as strings_file:
        for k in sorted(result.strings.keys()):
            val = result.strings[k]
            ctx = preserved_context.get(k, None)
            entry = {
                "ctx": ctx,
                "k": k,
                "v": val,
            }
            strings_file.write(json.dumps(entry, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
