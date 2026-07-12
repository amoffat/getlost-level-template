#!/usr/bin/env python3
"""Find and remove unused keys from .internal/public/locales/en/shell.jsonl."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_LOCALE_FILE = ".internal/public/locales/en/shell.jsonl"
DEFAULT_SEARCH_ROOT = "."
SEARCH_EXTENSIONS = (".ts", ".tsx")
# Any match under a path containing one of these is a false positive: it's the
# locale data itself (or a mirrored translation), not a code reference.
LOCALE_DIR_MARKERS = ("locales/",)


def repo_root() -> Path:
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True,
    )
    return Path(out.stdout.strip())


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--locale-file", default=None,
                    help=f"Path to shell.jsonl (default: repo-root-relative {DEFAULT_LOCALE_FILE})")
    p.add_argument("--search-root", default=None,
                    help=f"Directory to grep for key usage (default: repo-root-relative {DEFAULT_SEARCH_ROOT})")
    p.add_argument("--write", action="store_true",
                    help="Actually rewrite the locale file, removing unused keys. Default is dry-run.")
    p.add_argument("--json", action="store_true",
                    help="Emit machine-readable JSON report instead of human text.")
    return p.parse_args()


def load_lines(locale_file: Path):
    """Return list of (raw_line, key_or_None, error_or_None)."""
    entries = []
    with open(locale_file, "r", encoding="utf-8") as f:
        for raw in f:
            stripped = raw.strip()
            if not stripped:
                entries.append((raw, None, None))
                continue
            try:
                obj = json.loads(stripped)
            except json.JSONDecodeError as e:
                entries.append((raw, None, str(e)))
                continue
            if not isinstance(obj, dict) or "k" not in obj:
                entries.append((raw, None, "missing 'k' field"))
                continue
            entries.append((raw, obj["k"], None))
    return entries


def is_real_match(path: str) -> bool:
    """Filter out false positives: matches in the locale data itself rather
    than actual code references (e.g. shell.jsonl's own "k": "..." line, or a
    per-language mirror of the same file)."""
    if not path.endswith(SEARCH_EXTENSIONS):
        return False
    normalized = path.replace(os.sep, "/")
    return not any(marker in normalized for marker in LOCALE_DIR_MARKERS)


def find_used_keys(keys, search_root: Path) -> set:
    """Single ripgrep invocation across the whole tree for every key at once,
    using Aho-Corasick matching under the hood instead of spawning a
    subprocess per key (or per key per file).

    Patterns are wrapped in \\b word-boundary anchors rather than passed as
    plain fixed strings: many keys are literal prefixes of other keys (e.g.
    "upgradeFailed" / "upgradeFailedMsg"), and with --fixed-strings alternation
    ripgrep's --only-matching reports whichever alternative matches first at a
    given position, silently misattributing the match to the shorter key and
    undercounting usage of the longer one. Word-boundary anchors make each
    pattern match only its exact identifier.
    """
    rg = shutil.which("rg")
    if rg is None:
        print("error: ripgrep ('rg') is required but was not found on PATH", file=sys.stderr)
        sys.exit(1)

    fd, patterns_path = tempfile.mkstemp(prefix="prune_shell_locales_patterns_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            for key in keys:
                f.write(r"\b" + re.escape(key) + r"\b" + "\n")

        result = subprocess.run(
            [
                rg,
                "--only-matching",
                "--no-heading",
                "--line-number",
                "--no-messages",
                "--hidden",
                "-f", patterns_path,
                str(search_root),
            ],
            capture_output=True, text=True,
        )
    finally:
        os.unlink(patterns_path)

    if result.returncode not in (0, 1):  # 1 == no matches at all, still fine
        print(f"error: ripgrep failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    key_set = set(keys)
    used = set()
    for line in result.stdout.splitlines():
        # Format: path:line_number:matched_text
        parts = line.split(":", 2)
        if len(parts) != 3:
            continue
        path, _lineno, matched = parts
        if matched in key_set and is_real_match(path):
            used.add(matched)
    return used


def is_ambiguous(key: str) -> bool:
    return "." in key


def main():
    args = parse_args()
    root = repo_root()
    locale_file = Path(args.locale_file) if args.locale_file else root / DEFAULT_LOCALE_FILE
    search_root = Path(args.search_root) if args.search_root else root / DEFAULT_SEARCH_ROOT

    if not locale_file.is_file():
        print(f"error: locale file not found: {locale_file}", file=sys.stderr)
        sys.exit(1)
    if not search_root.is_dir():
        print(f"error: search root not found: {search_root}", file=sys.stderr)
        sys.exit(1)

    entries = load_lines(locale_file)
    errors = [e for (_, _, e) in entries if e is not None]
    if errors:
        print(f"error: {len(errors)} line(s) in {locale_file} failed to parse:", file=sys.stderr)
        for raw, _, err in entries:
            if err is not None:
                print(f"  {err}: {raw.rstrip()}", file=sys.stderr)
        sys.exit(1)

    keys = [k for (_, k, _) in entries if k is not None]
    used_keys = find_used_keys(keys, search_root)

    unused = []
    ambiguous = []
    used_count = 0
    for key in keys:
        if key in used_keys:
            used_count += 1
            continue
        unused.append(key)
        if is_ambiguous(key):
            ambiguous.append(key)

    if args.json:
        print(json.dumps({
            "total": len(keys),
            "used": used_count,
            "unused": unused,
            "ambiguous": ambiguous,
        }, indent=2))
    else:
        print(f"Scanned {len(keys)} keys in {locale_file}")
        print(f"  Used:          {used_count}")
        print(f"  Unused:        {len(unused)}")
        print(f"  Ambiguous (flagged, still counted unused): {len(ambiguous)}")
        print()
        if unused:
            print("Unused keys (would be removed with --write):")
            for k in unused:
                print(f"  - {k}")
            print()
        if ambiguous:
            print("Ambiguous keys (contain '.' — possible dynamic construction, verify manually):")
            for k in ambiguous:
                print(f"  - {k}")
            print()

    if not args.write:
        if unused:
            print("Dry run only. Re-run with --write to remove these lines from shell.jsonl.")
        else:
            print("Nothing to prune.")
        return

    if not unused:
        print("Nothing to remove; not rewriting file.")
        return

    unused_set = set(unused)
    fd, tmp_path = tempfile.mkstemp(dir=str(locale_file.parent), prefix=".shell_jsonl_tmp_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            kept = 0
            for raw, key, _ in entries:
                if key is not None and key in unused_set:
                    continue
                out.write(raw)
                kept += 1
        os.replace(tmp_path, locale_file)
    except BaseException:
        os.unlink(tmp_path)
        raise

    print(f"Removed {len(unused)} keys. {locale_file.name}: {len(entries)} -> {kept} lines.")


if __name__ == "__main__":
    main()
