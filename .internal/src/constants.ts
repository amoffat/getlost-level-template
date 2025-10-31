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

export const startIcon = "c9b4462d-4e7c-55f6-a0ec-815ab1a723cf";
export const exitIcon = "586794d8-d094-5451-b47d-2de73e1a13ea";
export const lightIcon = "673699bc-746a-5d83-929e-9b739784cb9d";
export const waypointIcon = "082812ec-8053-5712-b782-ca1c13f23c96";
export const soundIcon = "cb83a1b7-3e73-5f92-9888-a71c8e3c3ee8";

export const texAtlasPadding = 0.001; // avoid bleeding

export const requiredNpcAnimations: NpcRequiredAnimation[] = [
  "Idle",
  "WalkUp",
  "WalkDown",
  "WalkLeft",
  "WalkRight",
];
