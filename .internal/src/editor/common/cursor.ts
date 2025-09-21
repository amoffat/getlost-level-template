import { Mode } from "@/types/editor";

export function getCursorForMode(mode: Mode): string {
  let cursor = "default";
  if (mode === "pan") {
    cursor = "grabbing";
  } else if (mode === "place") {
    cursor = "crosshair";
  } else if (mode === "select") {
    cursor = "default";
  } else if (mode === "move") {
    cursor = "move";
  } else if (mode === "rect-select") {
    cursor = "crosshair";
  }
  return cursor;
}
