import { defaultLocale } from "@/constants";
import { actions as localeActions } from "@/slices/locale";
import type { AppDispatch } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { describe, expect, it, vi } from "vitest";
import {
  computeSourceHash,
  resolveLocaleText,
  syncLocaleField,
} from "./locale";

/** A dispatch spy plus a helper to read back the last upsertEntry payload. */
function makeDispatch() {
  const spy = vi.fn((action: any) => action);
  const dispatch = spy as unknown as AppDispatch;
  const lastUpsert = () => {
    const call = [...spy.mock.calls]
      .reverse()
      .find(([action]) => action.type === localeActions.upsertEntry.type);
    return call?.[0].payload as
      | { locale: string; entry: LocaleEntry }
      | undefined;
  };
  return { spy, dispatch, lastUpsert };
}

describe("syncLocaleField", () => {
  it("mints a new stable id and hash when creating a main entry", () => {
    const { dispatch, lastUpsert } = makeDispatch();
    const ref = syncLocaleField({
      locale: defaultLocale,
      dispatch,
      updates: { v: "Hello", ctx: "greeting" },
    });

    const up = lastUpsert()!;
    expect(typeof ref).toBe("string");
    expect(ref).toBe(up.entry.id);
    expect(up.locale).toBe(defaultLocale);
    expect(up.entry.v).toBe("Hello");
    expect(up.entry.hash).toBe(computeSourceHash("Hello"));
  });

  it("keeps the id stable and recomputes the hash when editing main text", () => {
    const { dispatch, lastUpsert } = makeDispatch();
    const prev: LocaleEntry = {
      id: "stable-id",
      v: "Hello",
      hash: computeSourceHash("Hello"),
    };
    const ref = syncLocaleField({
      locale: defaultLocale,
      prevEntry: prev,
      defaultEntry: prev,
      dispatch,
      updates: { v: "Hi there" },
    });

    const up = lastUpsert()!;
    expect(ref).toBeUndefined(); // editing an existing entry: reference unchanged
    expect(up.entry.id).toBe("stable-id");
    expect(up.entry.hash).toBe(computeSourceHash("Hi there"));
  });

  it("records original + source hash when writing a translation", () => {
    const { dispatch, lastUpsert } = makeDispatch();
    const mainEntry: LocaleEntry = {
      id: "stable-id",
      v: "Hello",
      hash: computeSourceHash("Hello"),
    };
    const prev: LocaleEntry = {
      id: "stable-id",
      v: "Hola",
      original: "Hello",
      hash: mainEntry.hash,
    };
    const ref = syncLocaleField({
      locale: "es",
      prevEntry: prev,
      defaultEntry: mainEntry,
      dispatch,
      updates: { v: "Buenas" },
    });

    const up = lastUpsert()!;
    expect(ref).toBeUndefined();
    expect(up.locale).toBe("es");
    expect(up.entry.id).toBe("stable-id");
    expect(up.entry.v).toBe("Buenas");
    expect(up.entry.original).toBe("Hello");
    // Translation records the source version it matches.
    expect(up.entry.hash).toBe(mainEntry.hash);
  });

  it("signals a cleared reference (null) without dispatching for empty main text", () => {
    const { spy, dispatch } = makeDispatch();
    const ref = syncLocaleField({
      locale: defaultLocale,
      prevEntry: { id: "x", v: "Hello" },
      defaultEntry: { id: "x", v: "Hello" },
      dispatch,
      updates: { v: null },
    });
    expect(ref).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("resolveLocaleText", () => {
  const entry = (v: string): LocaleEntry => ({ id: "id", v });

  it("returns defaultText when the key is missing", () => {
    expect(
      resolveLocaleText({
        key: null,
        primaryEntries: { id: entry("Hola") },
        defaultText: "fallback",
      }),
    ).toBe("fallback");
  });

  it("prefers the primary locale value", () => {
    expect(
      resolveLocaleText({
        key: "id",
        primaryEntries: { id: entry("Hola") },
        fallbackEntries: { id: entry("Hello") },
        defaultText: "x",
      }),
    ).toBe("Hola");
  });

  it("falls back to the fallback locale when primary lacks the key", () => {
    expect(
      resolveLocaleText({
        key: "id",
        primaryEntries: {},
        fallbackEntries: { id: entry("Hello") },
        defaultText: "x",
      }),
    ).toBe("Hello");
  });

  it("returns defaultText when neither locale has the key", () => {
    expect(
      resolveLocaleText({
        key: "id",
        primaryEntries: {},
        fallbackEntries: {},
        defaultText: "x",
      }),
    ).toBe("x");
  });
});
