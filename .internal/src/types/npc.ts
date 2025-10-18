export type Mode = "pan" | "group" | "add";

export interface Npc {
  id: string;
  name: string;
  spritesheetId: string;
  position: { x: number; y: number };
}

export interface NpcSpritesheet {
  id: string;
  objectUrl: string;
  saved: boolean;
  // The ids of the objects in the palette, in order. This controls what is
  // actually rendered. This contains ids for single and multi-tile objects.
  paletteIds: string[];
  // All objects in the palette, keyed by id. This will always contain *ALL*
  // single-tiled objects, but multi-tiled objects may be added/removed.
  palette: Record<string, Npc>;
}
