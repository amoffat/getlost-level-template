---
name: locales
description: Work with the editor shell's UI locale/translation files under .internal/public/locales (the `shell` i18next namespace). Use whenever the user wants to add, change, or remove a shell UI string; translate shell entries into the other languages or keep them in sync; look up what a shell key translates to in a given language; or prune/remove unused (dead) shell i18n keys. Covers the JSONL entry format, the staleness hash, and the lookup / sync / apply / prune helper scripts. Does NOT touch level/locales/**/dialogue.jsonl (the separate in-game dialogue system) — only shell strings.
---

# Shell locales

## Overview

The editor **shell**'s UI strings live in
`.internal/public/locales/<code>/shell.jsonl`, one JSON object per line. `en` is
the **English source of truth**; every other supported language
(`es`, `fr`, `pt-br`, `zh-cn`, `ar`, …) is a translated target. The target
languages are `supportedLangs` minus `en` (see
`.internal/src/constants/locale.ts`).

At runtime only `id -> v` is read (`jsonLinesParse` in
`.internal/src/utils/i18n.ts`); every other field exists to drive translation and
staleness tooling.

> **Scope:** this skill only ever touches shell strings under
> `.internal/public/locales/`. It never reads or writes
> `level/locales/**/dialogue.jsonl` — that is the separate, UUID-keyed in-game
> dialogue system.

### Entry format

**Source** — `.internal/public/locales/en/shell.jsonl`:

```jsonc
{
  "id": "close",
  "v": "Close",
  "ctx": "The text for a button that closes the current dialog or menu.",
}
```

- `id` — the translation key (a human string like `"close"`)
- `v` — the English string
- `ctx` — context for translators (what/where this string is; optional)

**Target** — e.g. `.internal/public/locales/fr/shell.jsonl`:

```jsonc
{ "id": "close", "v": "Fermer", "original": "Close", "ctx": "…", "hash": "…", "lock": false }
```

- `v` — the translated string
- `original` — the source `v` it was translated from (for reference)
- `hash` — staleness marker: an md5 of the source `v` **text only** (not `ctx`),
  mirroring the app's `computeSourceHash` in `.internal/src/utils/locale.ts`
- `lock` — when `true`, the entry is **never** retranslated (protects a manual
  override); tooling skips it

A target entry is **stale** when it is missing, or its `hash` differs from
`hashEntry(en.v)` for the same id. That is the only staleness signal.

## The scripts

All under `.claude/skills/locales/scripts/`, run with `tsx`. `tsx` lives under
`.internal/node_modules`, so invoke it by its path from the repo root (the
scripts are cwd-independent):

```
.internal/node_modules/.bin/tsx .claude/skills/locales/scripts/<name>.ts …
```

(Alternative: `cd .internal && pnpm exec tsx ../.claude/skills/locales/scripts/<name>.ts …`.)

- **lookup.ts** — read one entry's properties without opening the file yourself.
- **sync.ts** — list which target entries are stale for given id(s); emits a
  translation worklist.
- **apply.ts** — write your translations back (recomputing hashes) from stdin.
- **prune.ts** — find/remove shell keys no longer referenced in the code.

## Workflow A — add or update a source string

1. **Edit `.internal/public/locales/en/shell.jsonl`.** Add or change the line for
   the `id`, setting `v` (English) and a helpful `ctx`. To remove a string,
   delete its line here (then prune the targets — see Workflow C).

2. **Find what's stale:**

   ```
   .internal/node_modules/.bin/tsx .claude/skills/locales/scripts/sync.ts --id close
   ```

   (Repeat `--id` for several keys, or use `--all` to reconcile everything.) It
   prints a JSON array of work items:

   ```jsonc
   [
     { "locale": "fr", "langName": "French", "id": "close", "source": "Close", "ctx": "…" },
   ]
   ```

   An empty array means every locale is already in sync — you're done.

3. **Translate each item yourself**, following the [Translation rules](#translation-rules)
   below. Produce a JSON array of results:

   ```jsonc
   [
     { "locale": "fr", "id": "close", "value": "Fermer" },
     { "locale": "es", "id": "close", "value": "Cerrar" },
   ]
   ```

4. **Apply them** — pipe that array to `apply.ts` (via a file to keep unicode /
   RTL text intact):

   ```
   cat results.json | .internal/node_modules/.bin/tsx .claude/skills/locales/scripts/apply.ts
   ```

   It recomputes each `hash`, fills in `original`/`ctx`, creates the locale
   directory if needed, and upserts the line into the right locale file, skipping
   any `lock: true` entries.

5. **Verify** (optional):

   ```
   .internal/node_modules/.bin/tsx .claude/skills/locales/scripts/lookup.ts --locale all --id close
   ```

   then re-run `sync.ts --id close` — the worklist should now be empty.

## Workflow B — look up a translation

```
.internal/node_modules/.bin/tsx .claude/skills/locales/scripts/lookup.ts --locale fr --id close
.internal/node_modules/.bin/tsx .claude/skills/locales/scripts/lookup.ts --locale all --id close
```

`--locale en` reads the source. `--locale all` shows the key across `en` and
every target at once. This streams the file and returns only the matching entry,
so you never load a whole locale file into context.

## Workflow C — prune unused keys

Removes shell keys whose `id` is no longer referenced anywhere in the `.internal`
code (`t("someKey")` calls). **Run this after any invasive locale manipulation**
— removing or renaming source keys, or bulk edits — so dead keys and their
orphaned translations don't accumulate. Requires `rg` (ripgrep) on `PATH`.

1. **Always dry-run first:**

   ```
   .internal/node_modules/.bin/tsx .claude/skills/locales/scripts/prune.ts
   ```

   It only prints a report (used / unused / ambiguous), never modifies files.

2. **Review the report with the user.** Pay special attention to the
   **ambiguous** section — keys containing a `.` may be built dynamically (e.g.
   `` t(`section.${id}`) ``), so a "0 matches" result can be a false positive.
   For any ambiguous key, read the likely call sites yourself before trusting it.

3. **Confirm before writing.** Do not proceed to `--write` without explicit
   confirmation.

4. **Prune** — this removes each unused `id` from **every** locale file (the `en`
   source and all translated targets), preserving untouched lines verbatim:

   ```
   .internal/node_modules/.bin/tsx .claude/skills/locales/scripts/prune.ts --write
   ```

   (`--json` emits a machine-readable report instead of human text.)

## Translation rules

When you translate a `source` string into the target `langName`, use **modern,
natural language** for that locale and preserve the original meaning and intent.
Use `ctx` to disambiguate. Then, strictly:

- **Preserve numeric tags** like `<1>`, `<2>`, `</1>` exactly as-is — they are
  i18next HTML placeholders. Never translate, renumber, or drop them.
- **Do not translate ICU/interpolation placeholders** inside double curly
  braces: `{{playerName}}`, `{{count}}`, etc. Leave them verbatim, including the
  braces. (The shell uses i18next + ICU.)
- **Do not translate URLs** — leave them unchanged.
- **Translate the entire string** — no leftover English (other than the tokens
  above), no added commentary.

## Checklist

- [ ] Edited only `id`/`v`/`ctx` in `.internal/public/locales/en/shell.jsonl`.
- [ ] Ran `sync.ts --id <id>` (or `--all`) to get the stale worklist.
- [ ] Translated every item per the Translation rules.
- [ ] Preserved `<n>` tags, `{{…}}` placeholders, and URLs untouched.
- [ ] Applied results via `apply.ts` (respecting `lock: true` entries).
- [ ] Confirmed `sync.ts` reports nothing stale afterward.
- [ ] After removing/renaming keys, ran `prune.ts` (dry-run, then `--write`).
- [ ] Never touched `level/locales/**/dialogue.jsonl`.
