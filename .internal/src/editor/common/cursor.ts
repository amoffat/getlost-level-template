import { Mode as EditorMode } from "@/types/editor";
import { Mode as TilesetMode } from "@/types/tileset";

export function getCursorForMode(mode: EditorMode | TilesetMode): string {
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
