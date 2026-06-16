import { trackKeyPresses } from "@/utils/keypress";

export const pressedKeys: Record<string, boolean> = {};

export function setupKeys(canvas: HTMLCanvasElement) {
  trackKeyPresses({
    element: canvas,
    pressedKeys,
    handlers: {},
  });
}
