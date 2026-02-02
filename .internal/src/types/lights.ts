export const lightFlickerTypes = [
  "constant",
  "campfire",
  "fluorescent",
] as const;
export type LightFlicker = (typeof lightFlickerTypes)[number];
