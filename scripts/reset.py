import os
import shutil
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
LEVEL_DIR = ROOT_DIR / "level"
TILED_DIR = LEVEL_DIR / "tiled"
ART_DIR = LEVEL_DIR / "art"
SOUNDS_DIR = LEVEL_DIR / "sounds"

PRESERVE_TILED = ["blank.tmj", "level.tiled-project", "level.tiled-session"]


def clear_tiled():
    for file in TILED_DIR.iterdir():
        if file.name not in PRESERVE_TILED:
            file.unlink()
    blank = TILED_DIR / "blank.tmj"
    if blank.exists():
        shutil.copy(blank, TILED_DIR / "level.tmj")


def clear_art():
    if ART_DIR.exists():
        shutil.rmtree(ART_DIR)
    ART_DIR.mkdir()


def clear_sounds():
    if SOUNDS_DIR.exists():
        shutil.rmtree(SOUNDS_DIR)
    SOUNDS_DIR.mkdir()


def main():
    confirm_reset = os.getenv("CONFIRM_RESET")
    if confirm_reset != "yes":
        print("Reset cancelled.")
        return
    clear_tiled()
    clear_art()
    clear_sounds()


if __name__ == "__main__":
    main()
