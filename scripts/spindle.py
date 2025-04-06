"""
Helps debug spindler
"""

from pathlib import Path
from spindler import process

THIS_DIR = Path(__file__).parent
REPO_DIR = THIS_DIR.parent
LEVEL_DIR = REPO_DIR / "level"
STORY_FILE = LEVEL_DIR / "story" / "Level.twee"

with open(STORY_FILE, "r") as h:
    text = h.read()
print(process(text))
