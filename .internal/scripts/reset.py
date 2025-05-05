import os
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent.parent
LEVEL_DIR = ROOT_DIR / "level"
TILED_DIR = LEVEL_DIR / "tiled"
ART_DIR = LEVEL_DIR / "art"
SOUNDS_DIR = LEVEL_DIR / "sounds"

PRESERVE_TILED = [
    "blank.tmj",
    "blank.tiled-session",
    "level.tiled-project",
]


def clear_tiled():
    for file in TILED_DIR.iterdir():
        if file.name not in PRESERVE_TILED:
            file.unlink()
    blank_map = TILED_DIR / "blank.tmj"
    if blank_map.exists():
        shutil.copy(blank_map, TILED_DIR / "level.tmj")

    blank_session = TILED_DIR / "blank.tiled-session"
    if blank_session.exists():
        shutil.copy(blank_session, TILED_DIR / "level.tiled-session")


def clear_art():
    if ART_DIR.exists():
        shutil.rmtree(ART_DIR)
    ART_DIR.mkdir()
    (ART_DIR / "restricted").mkdir()


def clear_sounds():
    if SOUNDS_DIR.exists():
        shutil.rmtree(SOUNDS_DIR)
    SOUNDS_DIR.mkdir()
    (SOUNDS_DIR / "restricted").mkdir()


def clear_dialogue():
    # FIXME
    pass


def has_changes():
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())


@contextmanager
def stashed():
    changes = has_changes()

    if has_changes():
        subprocess.run(
            ["git", "stash", "push", "-m", "+before-reset"],
            check=True,
        )

    yield

    if changes:
        subprocess.run(
            ["git", "stash", "pop"],
        )


def commit():
    if has_changes():
        subprocess.run(
            ["git", "add", "-A"],
            check=True,
        )
        subprocess.run(
            ["git", "commit", "-m", "+reset"],
            check=True,
        )
    else:
        print("No changes to commit.")


def main():
    confirm_reset = os.getenv("CONFIRM_RESET")
    if confirm_reset != "yes":
        print("Reset cancelled.")
        return

    with stashed():
        clear_tiled()
        clear_art()
        clear_sounds()
        clear_dialogue()

        commit()


if __name__ == "__main__":
    main()
