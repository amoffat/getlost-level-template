import argparse
import json
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
        "--output-code", required=True, help="Path to the output code file"
    )
    parser.add_argument(
        "--output-strings", required=True, help="Path to the output strings file"
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

    with open(args.output_strings, "w") as strings_file:
        json.dump(
            result.strings,
            strings_file,
            ensure_ascii=False,
            indent=2,
        )


if __name__ == "__main__":
    main()
