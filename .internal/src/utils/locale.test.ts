import type { LocaleEntry } from "@/types/locale";
import { describe, expect, it } from "vitest";
import { resolveLocaleText } from "./locale";

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
