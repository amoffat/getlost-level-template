// Look up a locale entry's properties by id, without the caller having to read
// the whole file.
//
//   tsx lookup.ts --locale <code|en> --id <id>
//   tsx lookup.ts --locale all --id <id>
//
// Prints the matching entry object as JSON. With `--locale all`, prints an array
// of { locale, entry } across the `en` source + every target locale (handy for
// checking whether a key is in sync everywhere). Missing entries print `null`
// (all) or "not found" and exit 1 (single locale).

import { parseArgs } from "node:util";
import { findEntry, localeFile, SOURCE_LOCALE, targetLocales } from "./lib.ts";

const { values } = parseArgs({
  options: {
    locale: { type: "string" },
    id: { type: "string" },
  },
});

const locale = values.locale;
const id = values.id;

if (!locale || !id) {
  console.error("usage: lookup.ts --locale <code|en|all> --id <id>");
  process.exit(2);
}

if (locale === "all") {
  const locales = [SOURCE_LOCALE, ...targetLocales()];
  const out = [];
  for (const loc of locales) {
    out.push({ locale: loc, entry: await findEntry(localeFile(loc), id) });
  }
  console.log(JSON.stringify(out, null, 2));
} else {
  const entry = await findEntry(localeFile(locale), id);
  if (!entry) {
    console.error(`not found: id="${id}" in locale="${locale}"`);
    process.exit(1);
  }
  console.log(JSON.stringify(entry, null, 2));
}
