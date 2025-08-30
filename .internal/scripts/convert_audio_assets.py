#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "tqdm",
# ]
# ///

"""
Recursively ensure each audio asset under the provided sounds directory has both
.ogg and .m4a variants.
If only one exists for a base filename, convert the missing one using ffmpeg.
Uses tqdm to display progress and write messages.

Usage:
  python3 .internal/scripts/convert_audio_assets.py /path/to/level/sounds

Notes:
  - Requires `ffmpeg` on PATH.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from tqdm import tqdm


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Ensure each audio asset under the provided sounds directory has both .ogg "
            "and .m4a variants."
        )
    )
    parser.add_argument(
        "sounds_dir",
        type=Path,
        help="Path to the sounds directory containing .ogg/.m4a assets",
    )
    return parser.parse_args()


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        tqdm.write(
            "Error: ffmpeg not found on PATH. Please install ffmpeg.",
            file=sys.stderr,
        )
        sys.exit(1)


def collect_assets(root: Path):
    """Return a mapping: base_path_str -> {"ogg": Path|None, "m4a": Path|None}.

    base_path_str is the absolute path (without extension) as a string.
    """
    bases: dict[str, dict[str, Path | None]] = {}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        if ext not in {".ogg", ".m4a"}:
            continue
        base_key = str(p.with_suffix(""))
        entry = bases.setdefault(base_key, {"ogg": None, "m4a": None})
        if ext == ".ogg":
            entry["ogg"] = p
        elif ext == ".m4a":
            entry["m4a"] = p
    return bases


def run_ffmpeg_m4a_to_ogg(src: Path, dst: Path) -> bool:
    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(src),
        "-c:a",
        "libvorbis",
        "-q:a",
        "5",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr or "Unknown ffmpeg error converting to ogg\n")
        return False
    return True


def run_ffmpeg_ogg_to_m4a(src: Path, dst: Path) -> bool:
    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(src),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr or "Unknown ffmpeg error converting to m4a\n")
        return False
    return True


def main() -> int:
    args = parse_args()
    sounds_dir: Path = args.sounds_dir.resolve()

    if not sounds_dir.exists() or not sounds_dir.is_dir():
        tqdm.write(
            f"Error: sounds_dir does not exist or is not a directory: {sounds_dir}",
            file=sys.stderr,
        )
        return 1

    ensure_ffmpeg()

    bases = collect_assets(sounds_dir)
    total = len(bases)

    converted = 0
    existing = 0
    errors = 0

    pbar = tqdm(total=total, desc="Audio assets", unit="file", dynamic_ncols=True)

    # Sort for stable progress order
    for base_key in sorted(bases.keys()):
        entry = bases[base_key]
        base_path = Path(base_key)
        try:
            rel = base_path.relative_to(sounds_dir)
        except ValueError:
            rel = base_path

        has_ogg = entry["ogg"] is not None
        has_m4a = entry["m4a"] is not None

        if has_ogg and has_m4a:
            tqdm.write(f"✔ Both exist: {rel}.{{ogg,m4a}}")
            existing += 1
            pbar.update(1)
            continue

        if not has_ogg and has_m4a:
            src = entry["m4a"]
            dst = base_path.with_suffix(".ogg")
            tqdm.write(f"→ Converting m4a → ogg: {rel}.m4a → {rel}.ogg")
            assert src is not None  # for type checkers
            if run_ffmpeg_m4a_to_ogg(src, dst):
                converted += 1
                tqdm.write(f"           ✓ Wrote {rel}.ogg")
            else:
                errors += 1
                tqdm.write(
                    f"           ✗ Failed converting {rel}.m4a to .ogg",
                    file=sys.stderr,
                )
            pbar.update(1)
            continue

        if not has_m4a and has_ogg:
            src = entry["ogg"]
            dst = base_path.with_suffix(".m4a")
            tqdm.write(f"→ Converting ogg → m4a: {rel}.ogg → {rel}.m4a")
            assert src is not None  # for type checkers
            if run_ffmpeg_ogg_to_m4a(src, dst):
                converted += 1
                tqdm.write(f"           ✓ Wrote {rel}.m4a")
            else:
                errors += 1
                tqdm.write(
                    f"           ✗ Failed converting {rel}.ogg to .m4a",
                    file=sys.stderr,
                )
            pbar.update(1)
            continue

        # If neither present (unlikely due to collection), skip with warning
        tqdm.write(
            f"! Skipping unexpected entry: {rel}",
            file=sys.stderr,
        )
        errors += 1
        pbar.update(1)

    pbar.close()

    tqdm.write(f"Done. Converted: {converted}, Existing: {existing}, Errors: {errors}")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
