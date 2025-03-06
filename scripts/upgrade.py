import shutil
import subprocess
from pathlib import Path
from typing import NoReturn

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_REPO = "https://github.com/amoffat/getlost-level-template.git"


def upgrade_repo(target_path: Path) -> None:
    level_dir = target_path / "level"
    temp_clone_dir = target_path / "_template_update"
    version_file = target_path / "engine_version.txt"

    if not target_path.exists():
        print(f"Error: Target directory '{target_path}' does not exist.")
        exit(1)

    # Move 'level' directory aside
    level_backup = target_path / "_level_backup"
    if level_dir.exists():
        shutil.move(str(level_dir), str(level_backup))

    # Clone the latest template repo
    print("Cloning template repository...")
    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            "main",
            TEMPLATE_REPO,
            str(temp_clone_dir),
        ],
        check=True,
    )

    def should_remove(item: Path) -> bool:
        preserve = [
            level_backup,
            temp_clone_dir,
            target_path / "node_modules",
            target_path / ".git",
        ]
        return item not in preserve

    def should_restore(item: Path) -> bool:
        ignore = [
            temp_clone_dir / "level",
            temp_clone_dir / ".git",
        ]
        return item not in ignore

    # Remove old contents (except 'level_backup')
    for item in target_path.iterdir():
        if should_remove(item):
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

    # Move new contents into place
    for item in temp_clone_dir.iterdir():
        if should_restore(item):
            shutil.move(str(item), str(target_path / item.name))

    # Restore 'level' directory
    if level_backup.exists():
        shutil.move(str(level_backup), str(level_dir))

    # Cleanup
    shutil.rmtree(temp_clone_dir)

    # Read version from engine_version.txt
    if version_file.exists():
        version = version_file.read_text().strip()
    else:
        version = "unknown"

    # Commit changes
    subprocess.run(["git", "add", "-A"], cwd=str(target_path), check=True)
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=str(target_path),
        capture_output=True,
        text=True,
    )

    if result.stdout.strip():  # If there are changes
        subprocess.run(
            ["git", "commit", "-m", f"Upgrade to {version}"],
            cwd=str(target_path),
            check=True,
        )
        print(f"Upgrade complete! Committed as 'Upgrade to {version}'")
    else:
        print("No changes detected. Skipping commit.")


def main() -> NoReturn:
    upgrade_repo(ROOT)
    exit(0)


if __name__ == "__main__":
    main()
