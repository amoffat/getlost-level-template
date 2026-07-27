import { defaultSourceLang, mainLocale } from "@/constants";
import { actions as localeActions } from "@/slices/locale";
import type { AppDispatch, RootState } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { computeSourceHash } from "@/utils/locale";
import { describe, expect, it, vi } from "vitest";

import { upsertLocaleEntry } from "./locale";

type Entities = Record<string, LocaleEntry>;

/**
 * A dispatch spy plus a mocked `getState`, wired so `upsertLocaleEntry` reads
 * the active locale, the `main` (source) entry, and the previous entry for the
 * active locale straight out of state — the way the real thunk does.
 */
function makeStore(opts: {
  activeLocale: string;
  /** Entries in the `main` (source) bucket, keyed by id. */
  main?: Entities;
  /** Entries in the active-locale bucket, keyed by id. */
  active?: Entities;
}) {
  const spy = vi.fn((action: any) => action);
  const dispatch = spy as unknown as AppDispatch;

  const bucket = (entities: Entities) => ({
    ids: Object.keys(entities),
    entities,
  });
  const state = {
    locale: {
      activeLocale: opts.activeLocale,
      entries: {
        [mainLocale]: bucket(opts.main ?? {}),
        [opts.activeLocale]: bucket(opts.active ?? {}),
      },
    },
  };
  const getState = (() => state) as unknown as () => RootState;

  const upserts = () =>
    spy.mock.calls
      .filter(([action]) => action.type === localeActions.upsertEntry.type)
      .map(
        ([action]) => action.payload as { locale: string; entry: LocaleEntry },
      );
  const lastUpsert = () => upserts().at(-1);
  /** The most recent upsert targeting a specific locale bucket. */
  const upsertFor = (locale: string) =>
    [...upserts()].reverse().find((u) => u.locale === locale);

  return { spy, dispatch, getState, lastUpsert, upserts, upsertFor };
}

describe("upsertLocaleEntry", () => {
  it("reports \"created\" and stores a hash when creating a source entry", () => {
    // No main entry yet → brand-new source string. The thunk writes `main` and
    // reports "created" so the caller stores the supplied id as the reference.
    const { dispatch, getState, upsertFor } = makeStore({
      activeLocale: defaultSourceLang,
    });
    const result = upsertLocaleEntry({
      id: "new-id",
      v: "Hello",
      ctx: "greeting",
    })(dispatch, getState);

    const main = upsertFor(mainLocale)!;
    expect(result).toBe("created");
    expect(main.entry.id).toBe("new-id");
    expect(main.entry.v).toBe("Hello");
    expect(main.entry.srcLang).toBe(defaultSourceLang);
    expect(main.entry.hash).toBe(computeSourceHash("Hello"));
  });

  it("keeps the id stable and recomputes the hash when editing source text", () => {
    const main: LocaleEntry = {
      id: "stable-id",
      v: "Hello",
      hash: computeSourceHash("Hello"),
    };
    const { dispatch, getState, upsertFor } = makeStore({
      activeLocale: defaultSourceLang,
      main: { "stable-id": main },
      active: { "stable-id": main },
    });
    const result = upsertLocaleEntry({
      id: "stable-id",
      v: "Hi there",
    })(dispatch, getState);

    const up = upsertFor(mainLocale)!;
    expect(result).toBe("unchanged"); // editing an existing entry: reference unchanged
    expect(up.entry.id).toBe("stable-id");
    expect(up.entry.hash).toBe(computeSourceHash("Hi there"));
  });

  it("records original + source hash when writing a translation", () => {
    const main: LocaleEntry = {
      id: "stable-id",
      v: "Hello",
      hash: computeSourceHash("Hello"),
      srcLang: "en",
    };
    const prev: LocaleEntry = {
      id: "stable-id",
      v: "Hola",
      original: "Hello",
      hash: main.hash,
    };
    const { dispatch, getState, lastUpsert } = makeStore({
      activeLocale: "es",
      main: { "stable-id": main },
      active: { "stable-id": prev },
    });
    const result = upsertLocaleEntry({
      id: "stable-id",
      v: "Buenas",
    })(dispatch, getState);

    const up = lastUpsert()!;
    expect(result).toBe("unchanged");
    expect(up.locale).toBe("es");
    expect(up.entry.id).toBe("stable-id");
    expect(up.entry.v).toBe("Buenas");
    expect(up.entry.original).toBe("Hello");
    // Translation records the source version it matches.
    expect(up.entry.hash).toBe(main.hash);
  });

  it("treats an edit in the string's own source language as a source edit", () => {
    // Active language matches the entry's srcLang → edit the source in `main`,
    // recompute the hash, and re-stamp srcLang. Not a translation.
    const main: LocaleEntry = {
      id: "stable-id",
      v: "Bonjour",
      hash: computeSourceHash("Bonjour"),
      srcLang: "fr",
    };
    const prev: LocaleEntry = {
      id: "stable-id",
      v: "Bonjour",
      original: "Bonjour",
      hash: main.hash,
    };
    const { dispatch, getState, upsertFor } = makeStore({
      activeLocale: "fr",
      main: { "stable-id": main },
      active: { "stable-id": prev },
    });
    const result = upsertLocaleEntry({
      id: "stable-id",
      v: "Salut",
    })(dispatch, getState);

    expect(result).toBe("unchanged");
    // The source write lands in `main` with the recomputed hash + srcLang.
    const mainUp = upsertFor(mainLocale)!;
    expect(mainUp.entry.id).toBe("stable-id");
    expect(mainUp.entry.v).toBe("Salut");
    expect(mainUp.entry.srcLang).toBe("fr");
    expect(mainUp.entry.hash).toBe(computeSourceHash("Salut"));
    // …and it is mirrored into the active (source-language) locale so the row
    // reflects immediately, without srcLang (that lives only on `main`).
    const fr = upsertFor("fr")!;
    expect(fr.entry.v).toBe("Salut");
    expect(fr.entry.hash).toBe(computeSourceHash("Salut"));
    expect(fr.entry.srcLang).toBeUndefined();
  });

  it("writes a translation when the active language differs from srcLang", () => {
    const main: LocaleEntry = {
      id: "stable-id",
      v: "Bonjour",
      hash: computeSourceHash("Bonjour"),
      srcLang: "fr",
    };
    const { dispatch, getState, lastUpsert } = makeStore({
      activeLocale: "en",
      main: { "stable-id": main },
    });
    const result = upsertLocaleEntry({
      id: "stable-id",
      v: "Hello",
    })(dispatch, getState);

    const up = lastUpsert()!;
    expect(result).toBe("unchanged");
    expect(up.locale).toBe("en");
    expect(up.entry.original).toBe("Bonjour");
    expect(up.entry.hash).toBe(main.hash);
    // Translations never carry srcLang.
    expect(up.entry.srcLang).toBeUndefined();
  });

  it("reports \"cleared\" without dispatching for empty source text", () => {
    const entry: LocaleEntry = { id: "x", v: "Hello" };
    const { spy, dispatch, getState } = makeStore({
      activeLocale: defaultSourceLang,
      main: { x: entry },
      active: { x: entry },
    });
    const result = upsertLocaleEntry({ id: "x", v: null })(dispatch, getState);
    expect(result).toBe("cleared");
    expect(spy).not.toHaveBeenCalled();
  });
});
