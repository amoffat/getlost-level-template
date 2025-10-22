export function getCursorForMode(mode: string): string {
  let cursor = "default";
  if (mode === "pan") {
    cursor = "grabbing";
  } else if (mode === "paint") {
    cursor = "crosshair";
  } else if (mode === "select") {
    cursor = "default";
  } else if (mode === "move") {
    cursor = "move";
  }
  return cursor;
}
