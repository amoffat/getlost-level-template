from spindler.construct import render
from spindler.parser import parse


class ParseException(Exception):
    pass


class RenderException(Exception):
    pass


def process(text: str) -> str:
    try:
        parsed = parse(text)
    except Exception as e:
        raise ParseException(str(e)) from e

    try:
        assemblyscript = render(parsed)
    except Exception as e:
        raise RenderException(str(e)) from e
    return assemblyscript


def main():
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="Process a Twee file.")
    parser.add_argument("input_file", help="Path to the input Twee file")
    args = parser.parse_args()

    with open(args.input_file, "r") as h:
        text = h.read()

    try:
        assemblyscript = process(text)
    except ParseException as e:
        sys.stderr.write(f"Error parsing Twine dialogue file: {e}")
        sys.exit(1)
    except RenderException as e:
        sys.stderr.write(
            f"Error rendering Assemblyscript dialogue file from Twine: {e}"
        )
        sys.exit(1)

    print(assemblyscript)


if __name__ == "__main__":
    main()
