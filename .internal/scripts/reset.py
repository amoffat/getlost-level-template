import os
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent.parent
INTERNAL_DIR = ROOT_DIR / ".internal"
LEVEL_DIR = ROOT_DIR / "level"
TILED_DIR = LEVEL_DIR / "tiled"
ART_DIR = LEVEL_DIR / "art"
SOUNDS_DIR = LEVEL_DIR / "sounds"
LOCALES_DIR = ROOT_DIR / "locales"
RESET_DIR = INTERNAL_DIR / "reset" / "level"


def dir_clean(dir_path: Path):
    """Ensure the directory exists and is empty."""
    if dir_path.exists():
        shutil.rmtree(dir_path)
    shutil.copytree(RESET_DIR / dir_path.stem, dir_path, dirs_exist_ok=True)


def clear_tiled():
    dir_clean(TILED_DIR)


def clear_art():
    dir_clean(ART_DIR)


def clear_sounds():
    dir_clean(SOUNDS_DIR)


def clean_locales():
    dir_clean(LOCALES_DIR)


def clear_dialogue():
    # FIXME
    pass


def copy_toplevel():
    """Copy the top-level files from the reset directory to the root."""
    for item in RESET_DIR.iterdir():
        if item.is_file():
            shutil.copy(item, LEVEL_DIR / item.name)


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
        clean_locales()
        copy_toplevel()

        commit()


if __name__ == "__main__":
    main()
