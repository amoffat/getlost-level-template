export function trackKeyPresses(): Record<string, boolean> {
  const pressedKeys: Record<string, boolean> = {};
  window.addEventListener("keydown", (e) => {
    pressedKeys[e.key] = true;
  });
  window.addEventListener("keyup", (e) => {
    pressedKeys[e.key] = false;
  });
  return pressedKeys;
}
