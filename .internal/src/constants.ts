// If you're running the engine locally (only private beta testers can do this),

import { Env } from "./types/env";
import type { NpcRequiredAnimation } from "./types/npc";

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
export const defaultTint = "ffffff";
export const defaultNpcWalkSpeed = 0.5;
export const defaultExitSensorRadius = 16;
export const defaultLightIntensity = 1.0;
export const defaultLightColor = "ffffff";

export const lightTemplateId = "lightsTemplate";
export const entryTemplateId = "entryGatewaysTemplate";
export const exitTemplateId = "exitGatewaysTemplate";
export const pickupTemplateId = "pickupsTemplate";

export const defaultTileSize = 16;
export const defaultAnimTime = 1000;
export const autosaveMapDebounce = 1000; // ms
export const autosaveTilesetDebounce = 1000; // ms

export const gameUrls: Record<Env, string> = {
  local: "http://localhost:5176",
  prod: "https://getlost.gg/",
  qa: "https://qa.getlost.gg/",
};

export const maxSliceObjects = 1500;
