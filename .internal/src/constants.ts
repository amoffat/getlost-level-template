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

export const iconTsId = "709959c8b2a2c2d74ccb807c9e19d0e67378e4b7";

export const startIcon = "36457fb369d5f1849dea54ab4aa01571e545e273";
export const exitIcon = "e57e5942a12563d0e6f90ec8ae00efe5a33baab7";
export const lightIcon = "74dbc3085545a3aebdf3226ee361515a9901e152";
export const waypointIcon = "bd704aa16ab0e8cb728e79705a195d3eb4781b87";
export const soundIcon = "c04e0c00c3efcb420f448eaaa62c199798a61938";
export const transparentIcon = "1dbfc36648dd2eb6c86b337a183baff35928c1ee";

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
