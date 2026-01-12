export function trackKeyPresses({
  handlers,
  pressedKeys = {},
  element,
}: {
  handlers?: Record<string, (pressed: boolean) => void>;
  pressedKeys?: Record<string, boolean>;
  element: HTMLElement;
}): VoidFunction {
  // Order we want modifier keys to appear in combo names
  const modifierOrder = ["Control", "Shift", "Alt", "Meta"];

  // Uppercase single chars, leave words alone
  const transformKey = (k: string) => (k.length === 1 ? k.toUpperCase() : k);

  /**
   * Take a set/array of key names and return canonical combo ordering:
   *  - Modifiers first (Control, Shift, Alt, Meta) in that order
   *  - Remaining keys alphabetical
   *  - Single char keys uppercased
   * Returns null if fewer than 2 keys (not a combo)
   */
  function canonicalizeKeys(keysIn: Iterable<string>): string | null {
    const seen: string[] = [];
    for (const k of keysIn) if (k) seen.push(k);
    if (seen.length === 0) return null;
    const mods: string[] = [];
    const others: string[] = [];
    for (let part of seen) {
      // Normalize modifier casing
      const partNorm = modifierOrder.find(
        (m) => m.toLowerCase() === part.toLowerCase()
      );
      if (partNorm) part = partNorm;
      if (modifierOrder.includes(part)) mods.push(part);
      else others.push(transformKey(part));
    }
    mods.sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b));
    others.sort();
    const ordered = [...mods, ...others];
    if (ordered.length <= 1) return null;
    return ordered.join("-");
  }

  /**
   * Canonicalize a raw handler combo string (already hyphen-split), or
   * return original if it's a single key.
   */
  function canonicalizeHandlerKey(raw: string): string {
    if (!raw.includes("-")) return raw; // single key
    const parts = raw.split("-").filter(Boolean);
    const combo = canonicalizeKeys(parts);
    return combo ?? raw; // fallback to raw (shouldn't happen unless 0/1 part)
  }

  function buildComboName(includeKey?: string): string | null {
    // Collect currently pressed keys (true) plus optional key being released
    const active: string[] = [];
    for (const [k, v] of Object.entries(pressedKeys)) if (v) active.push(k);
    if (includeKey) active.push(includeKey);
    return canonicalizeKeys(active);
  }

  // Normalize handler keys to canonical ordering so users can supply
  // any order like "d-Control" and we treat it as "Control-D"
  if (handlers) {
    const normalized: Record<string, (pressed: boolean) => void> = {};
    for (const [raw, fn] of Object.entries(handlers)) {
      normalized[canonicalizeHandlerKey(raw)] = fn;
    }
    handlers = normalized;
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return; // Ignore repeats

    const norm = normalizeKey(e);
    pressedKeys[norm] = true;

    // Prefer exact handler match first (user supplied), then normalized (lower), then upper
    const single =
      handlers?.[e.key] ??
      handlers?.[norm] ??
      handlers?.[norm.length === 1 ? norm.toUpperCase() : norm];

    const combo = buildComboName();
    const comboFn = combo ? handlers?.[combo] : undefined;
    if (single || comboFn) e.preventDefault();
    single?.(true);
    comboFn?.(true);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // Determine normalized key for release; events may report a different
    // shifted character than what was stored on keydown (e.g. "d" vs "D", "/"
    // vs "?", "1" vs "!").
    const norm = normalizeKey(e);

    // Build combo name (including the key being released) BEFORE clearing it
    // Use the normalized key so combo resolution is stable regardless of shift
    // timing.
    const combo = buildComboName(norm);

    // Mark the normalized key as no longer pressed. Also defensively clear any
    // variant that might exist due to legacy state (uppercase/lowercase or
    // shifted symbol).
    pressedKeys[norm] = false;
    if (norm.length === 1) {
      // in case old state used upper variant
      pressedKeys[norm.toUpperCase()] = false;
    }

    const single =
      handlers?.[e.key] ??
      handlers?.[norm] ??
      handlers?.[norm.length === 1 ? norm.toUpperCase() : norm];
    const comboFn = combo ? handlers?.[combo] : undefined;
    if (single || comboFn) e.preventDefault();
    single?.(false);
    comboFn?.(false);
  };

  const clearKeys = () => {
    for (const k of Object.keys(pressedKeys)) pressedKeys[k] = false;
  };

  element.addEventListener("keydown", handleKeyDown);
  element.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("focus", clearKeys);
  element.addEventListener("mouseleave", clearKeys);

  // Return cleanup function to remove all event listeners
  return () => {
    element.removeEventListener("keydown", handleKeyDown);
    element.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", clearKeys);
    window.removeEventListener("focus", clearKeys);
    element.removeEventListener("mouseleave", clearKeys);
  };
}

/**
 * Normalize a KeyboardEvent's key so that shifted variants map to a stable base
 * form.
 *
 * Letters -> lowercase
 * Shifted symbols (e.g. ! @ #) -> unshifted counterpart (1 2 3)
 * Modifiers and multi-char words left intact.
 */
function normalizeKey(e: KeyboardEvent): string {
  const k = e.key;
  if (k.length === 1) {
    // Alphabetic letter
    if (/[a-zA-Z]/.test(k)) return k.toLowerCase();
    const symbolMap: Record<string, string> = {
      "~": "`",
      "!": "1",
      "@": "2",
      "#": "3",
      $: "4",
      "%": "5",
      "^": "6",
      "&": "7",
      "*": "8",
      "(": "9",
      ")": "0",
      _: "-",
      "+": "=",
      "{": "[",
      "}": "]",
      "|": "\\",
      ":": ";",
      '"': "'",
      "<": ",",
      ">": ".",
      "?": "/",
    };
    if (symbolMap[k]) return symbolMap[k];
  }
  return k; // Leave words like "Shift", "Control" as-is
}
