export function trackKeyPresses({
  handlers,
  pressedKeys = {},
  element,
}: {
  handlers?: Record<string, (pressed: boolean) => void>;
  pressedKeys?: Record<string, boolean>;
  element: HTMLElement;
}): Record<string, boolean> {
  element.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.repeat) return; // Ignore repeats
    pressedKeys[e.key] = true;
    handlers?.[e.key]?.(true);
  });
  element.addEventListener("keyup", (e: KeyboardEvent) => {
    pressedKeys[e.key] = false;
    handlers?.[e.key]?.(false);
  });
  return pressedKeys;
}
