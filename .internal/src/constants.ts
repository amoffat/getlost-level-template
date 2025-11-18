// If you're running the engine locally (only private beta testers can do this),

import type { NpcRequiredAnimation } from "./types/npc";

// set this to true. Otherwise, set it to false.
const localDev = true;

// This is where the Get Lost engine lives.
export const gameUrl = localDev
  ? "http://localhost:5176"
  : "https://getlost.gg/";

export const mapEditorContainerId = "map-editor-container";
export const tilesetEditorContainerId = "tileset-editor-container";

export const overlayProps = {
  backgroundOpacity: 0.55,
  blur: 3,
};

export const texAtlasPadding = 0.001; // avoid bleeding

export const requiredNpcAnimations: NpcRequiredAnimation[] = [
  "Idle",
  "WalkDown",
  "WalkLeft",
  "WalkUp",
  "WalkRight",
];

export const walkSounds = [
  "default",
  "none",
  "grass",
  "gravel",
  "ice",
  "puddle",
  "wood",
  "sand",
  "snow",
] as const;
export type WalkSound = (typeof walkSounds)[number];

export const defaultWalkSound: WalkSound = "default";
// How long until the speed halves?
export const defaultFriction = 0.125; // seconds
export const defaultTraction = 1.0;
