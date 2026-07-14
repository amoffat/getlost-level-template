export const builtinWalks = {
  default: "gl:default-walk",
  ice: "gl:ice-walk",
  snow: "gl:snow-walk",
  wood: "gl:wood-walk",
  gravel: "gl:gravel-walk",
  grass: "gl:grass-walk",
  puddle: "gl:puddle-walk",
  sand: "gl:sand-walk",
  none: null,
} as const;
export type WalkSound = keyof typeof builtinWalks;
