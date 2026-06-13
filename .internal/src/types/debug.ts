export const debugFlagKeys = [
  "collisions",
  "pathfinding",
  "objDetails",
  "zSorting",
] as const;

export type DebugFlagKey = (typeof debugFlagKeys)[number];

export interface DebugSchema {
  overlays: boolean;
  device: "mobile" | "desktop";
  volume: number;
  flags: Partial<Record<DebugFlagKey, boolean>>;
  buildPathgraph?: string;
  reloadCount: number;
}
