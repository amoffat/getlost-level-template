import { TileGroup } from "../types/tilegroup";

export const TILESET_VERSION = 1;

export type TilesetDocV1 = {
  version: 1;
  tsId: string; // stable id for the image, based on hash of the image
  filename: string; // e.g., "mytiles.png"
  groups: TileGroup[];
};

// (Optional) Tagged encoding if you ever store Maps/Sets/Dates
function replacer(_: string, value: any) {
  if (value instanceof Map) return { __type: "Map", value: [...value] };
  if (value instanceof Set) return { __type: "Set", value: [...value] };
  return value;
}
function reviver(_: string, value: any) {
  if (value && value.__type === "Map") return new Map(value.value);
  if (value && value.__type === "Set") return new Set(value.value);
  return value;
}

export function serialize(doc: TilesetDocV1): string {
  return JSON.stringify({ ...doc, version: TILESET_VERSION }, replacer);
}

export function deserialize(raw: string | null): TilesetDocV1 | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw, reviver) as { version: number } & Record<
    string,
    unknown
  >;
  switch (parsed.version) {
    case 1:
      return parsed as TilesetDocV1;
    default:
      return null; // or migrate
  }
}
