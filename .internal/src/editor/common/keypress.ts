export function trackKeyPresses({
  handlers,
  pressedKeys = {},
  element,
}: {
  handlers?: Record<string, (pressed: boolean) => void>;
  pressedKeys?: Record<string, boolean>;
  element: HTMLElement;
}): Record<string, boolean> {
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

  element.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.repeat) return; // Ignore repeats
    pressedKeys[e.key] = true;
    const single = handlers?.[e.key];
    const combo = buildComboName();
    const comboFn = combo ? handlers?.[combo] : undefined;
    if (single || comboFn) e.preventDefault();
    single?.(true);
    comboFn?.(true);
  });
  element.addEventListener("keyup", (e: KeyboardEvent) => {
    // Build combo name (including the key being released) BEFORE clearing it
    const combo = buildComboName(e.key);
    pressedKeys[e.key] = false;
    const single = handlers?.[e.key];
    const comboFn = combo ? handlers?.[combo] : undefined;
    if (single || comboFn) e.preventDefault();
    single?.(false);
    comboFn?.(false);
  });

  const clearKeys = () => {
    for (const k of Object.keys(pressedKeys)) pressedKeys[k] = false;
  };
  window.addEventListener("blur", clearKeys);
  window.addEventListener("focus", clearKeys);

  return pressedKeys;
}
