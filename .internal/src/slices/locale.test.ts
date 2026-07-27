import { computeSourceHash } from "@/utils/locale";
import { describe, expect, it } from "vitest";
import { actions, slice } from "./locale";

const init = () => slice.reducer(undefined, { type: "@@INIT" });

/** Selectors bound to slice state (not root state), for unit testing. */
const sel = slice.getSelectors();

describe("locale slice: first write to a locale", () => {
  it("stores entries when the bucket is created for the first time", () => {
    // Regression: the entity bucket is created lazily on first write. Under
    // Immer the fresh bucket is not a draft, so the adapter op must have its
    // return value assigned back or the write is silently dropped.
    let state = init();
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "es",
        entries: [{ id: "a", v: "Hola" }],
      }),
    );
    expect(state.entries["es"]?.entities["a"]?.v).toBe("Hola");
  });

  it("stores on first upsert to a locale", () => {
    let state = init();
    state = slice.reducer(
      state,
      actions.upsertEntry({ locale: "fr", entry: { id: "b", v: "Bonjour" } }),
    );
    expect(state.entries["fr"]?.entities["b"]?.v).toBe("Bonjour");
  });
});

describe("locale slice: upsertEntry merge", () => {
  it("does not clobber existing fields with undefined", () => {
    let state = init();
    state = slice.reducer(
      state,
      actions.upsertEntry({
        locale: "main",
        entry: { id: "x", v: "Hello", ctx: "greeting", hash: "h1" },
      }),
    );
    // A plain text edit sends ctx: undefined in the partial — it must NOT wipe
    // the stored context.
    state = slice.reducer(
      state,
      actions.upsertEntry({
        locale: "main",
        entry: { id: "x", v: "Hi", ctx: undefined, hash: "h2" },
      }),
    );

    const e = state.entries.main.entities["x"];
    expect(e?.v).toBe("Hi");
    expect(e?.hash).toBe("h2");
    expect(e?.ctx).toBe("greeting"); // preserved
  });

  it("still clears a field when null is passed explicitly", () => {
    let state = init();
    state = slice.reducer(
      state,
      actions.upsertEntry({
        locale: "main",
        entry: { id: "x", v: "Hi", ctx: "greeting" },
      }),
    );
    state = slice.reducer(
      state,
      actions.upsertEntry({
        locale: "main",
        entry: { id: "x", ctx: null },
      }),
    );

    const e = state.entries.main.entities["x"];
    expect(e?.v).toBe("Hi"); // untouched
    expect(e?.ctx).toBeNull(); // intentionally cleared
  });
});

describe("locale slice: selectRowStatus", () => {
  // Seed a main ("Hello"/"World") locale plus one translation and read status
  // through the selector, exercising computeRowStatus.
  const helloHash = computeSourceHash("Hello");
  const seed = (translation: {
    v: string;
    original?: string;
    hash?: string;
  }) =>
    slice.reducer(
      init(),
      actions.setAllLocaleEntries([
        { locale: "main", entries: [{ id: "a", v: "Hello", hash: helloHash }] },
        { locale: "es", entries: [{ id: "a", ...translation }] },
      ]),
    );

  it("reports all-false for a missing entry", () => {
    const status = sel.selectRowStatus(seed({ v: "Hola" }), "es", "missing");
    expect(status).toEqual({
      isSource: false,
      untranslated: false,
      outOfDate: false,
      needsAttention: false,
    });
  });

  it("flags untranslated when the value still equals the original", () => {
    const status = sel.selectRowStatus(
      seed({ v: "Hello", original: "Hello", hash: helloHash }),
      "es",
      "a",
    );
    expect(status.untranslated).toBe(true);
    expect(status.outOfDate).toBe(false);
    expect(status.needsAttention).toBe(true);
  });

  it("flags outOfDate when the stored source hash drifted from main", () => {
    const status = sel.selectRowStatus(
      seed({ v: "Hola", original: "Hello", hash: "stale-hash" }),
      "es",
      "a",
    );
    expect(status.untranslated).toBe(false);
    expect(status.outOfDate).toBe(true);
    expect(status.needsAttention).toBe(true);
  });

  it("is clean for a fresh, genuinely-translated entry", () => {
    const status = sel.selectRowStatus(
      seed({ v: "Hola", original: "Hello", hash: helloHash }),
      "es",
      "a",
    );
    expect(status.needsAttention).toBe(false);
  });
});

describe("locale slice: needsAttentionCounts", () => {
  it("counts per-locale attention, excluding the default locale", () => {
    const state = slice.reducer(
      init(),
      actions.setAllLocaleEntries([
        {
          locale: "main",
          entries: [
            { id: "a", v: "Hello", hash: computeSourceHash("Hello") },
            { id: "b", v: "World", hash: computeSourceHash("World") },
          ],
        },
        {
          locale: "es",
          entries: [
            // translated + fresh — no attention
            {
              id: "a",
              v: "Hola",
              original: "Hello",
              hash: computeSourceHash("Hello"),
            },
            // untranslated (v === original) — needs attention
            {
              id: "b",
              v: "World",
              original: "World",
              hash: computeSourceHash("World"),
            },
          ],
        },
        {
          locale: "fr",
          entries: [
            // out of date (hash drift) — needs attention
            { id: "a", v: "Bonjour", original: "Hello", hash: "stale" },
          ],
        },
      ]),
    );

    const counts = sel.needsAttentionCounts(state);
    expect(counts).toEqual({ es: 1, fr: 1 });
    expect(counts).not.toHaveProperty("main");
  });
});

describe("locale slice: source-aware status", () => {
  // A string authored in French: source in `main` (srcLang "fr"), a native `fr`
  // row that mirrors it, and an untranslated `de` row.
  const setup = () => {
    let state = init();
    const hash = computeSourceHash("Bonjour");
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "main",
        entries: [{ id: "s1", v: "Bonjour", hash, srcLang: "fr" }],
      }),
    );
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "fr",
        entries: [{ id: "s1", v: "Bonjour", original: "Bonjour", hash }],
      }),
    );
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "de",
        entries: [{ id: "s1", v: "Bonjour", original: "Bonjour", hash }],
      }),
    );
    return state;
  };

  it("marks the source-language row as source, not needing attention", () => {
    const s = sel.selectRowStatus(setup(), "fr", "s1");
    expect(s.isSource).toBe(true);
    expect(s.needsAttention).toBe(false);
  });

  it("flags an untranslated non-source locale", () => {
    const s = sel.selectRowStatus(setup(), "de", "s1");
    expect(s.isSource).toBe(false);
    expect(s.untranslated).toBe(true);
    expect(s.needsAttention).toBe(true);
  });

  it("excludes the source-language row from needsAttentionCounts", () => {
    const counts = sel.needsAttentionCounts(setup());
    expect(counts.fr ?? 0).toBe(0);
    expect(counts.de).toBe(1);
  });

  it("treats a legacy entry with no srcLang as English", () => {
    let state = init();
    const hash = computeSourceHash("Hello");
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "main",
        entries: [{ id: "s2", v: "Hello", hash }],
      }),
    );
    state = slice.reducer(
      state,
      actions.setEntries({
        locale: "en",
        entries: [{ id: "s2", v: "Hello", original: "Hello", hash }],
      }),
    );
    const s = sel.selectRowStatus(state, "en", "s2");
    expect(s.isSource).toBe(true);
    expect(s.needsAttention).toBe(false);
  });
});
