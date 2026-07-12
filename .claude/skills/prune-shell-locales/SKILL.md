---
name: prune-shell-locales
description: Find and remove unused localization keys from .internal/public/locales/en/shell.jsonl (the getlost-editor UI's shell i18next namespace) by grepping the .internal codebase for each key's usage. Use when the user asks to prune, clean up, remove dead, or find unused localization/translation/i18n keys in shell.jsonl. Does NOT touch level/locales/main/dialogue.jsonl (in-game dialogue content) — that is a separate, unrelated system.
---

# Prune shell locales

Removes localization keys from `.internal/public/locales/en/shell.jsonl` that are no
longer referenced anywhere in the `.internal` codebase (`t("someKey")` calls via
react-i18next). Never touches `level/locales/main/dialogue.jsonl` — that's an unrelated,
hash-keyed in-game dialogue system.

The bundled script is `scripts/prune_shell_locales.py`. It uses a single `rg`
(ripgrep) invocation to search the whole repository (including dot-directories like
`.internal`) for every key at once — each key wrapped in `\b` word-boundary anchors so
that keys which are literal prefixes of other keys (e.g. `upgradeFailed` /
`upgradeFailedMsg`) aren't misattributed to each other. Results are then filtered down
to real code references in Python: only `.ts`/`.tsx` matches count, and any match under
a `locales/` directory is discarded as a false positive (it's the locale data itself —
e.g. `shell.jsonl`'s own `"k": "..."` line, or a per-language mirror — not a code
reference). Requires `rg` on `PATH`.

## Workflow

1. **Always dry-run first.** Run the script with no flags:
   ```
   python3 .claude/skills/prune-shell-locales/scripts/prune_shell_locales.py
   ```
   This only prints a report; it never modifies the file.

2. **Review the report with the user.** Show the full list of unused keys. Pay special
   attention to the "ambiguous" section — keys containing a `.` may be built dynamically
   (e.g. `t(\`section.${id}\`)`), so a "0 matches" result can be a false positive. For any
   ambiguous key, read the likely call sites yourself (Grep/Read) before trusting the
   result.

3. **Confirm before writing.** Ask the user to confirm the final list of keys to remove.
   Do not proceed to `--write` without explicit confirmation.

4. **Rewrite only after confirmation:**
   ```
   python3 .claude/skills/prune-shell-locales/scripts/prune_shell_locales.py --write
   ```
   Report the before/after line count the script prints.

5. **Verify the diff** with `git diff .internal/public/locales/en/shell.jsonl` — only the
   confirmed unused lines should be gone; every other line should be byte-identical.

## Flags

- `--locale-file PATH` — override the target file (default: `.internal/public/locales/en/shell.jsonl` from repo root).
- `--search-root PATH` — override the search directory (default: the whole repo root).
- `--write` — actually rewrite the file. Omit for dry-run (the default).
- `--json` — machine-readable report instead of the human-readable text output.
