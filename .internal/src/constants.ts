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
export type WalkSound = string;

export const defaultWalkSound: WalkSound = "default";
// How long until the speed halves?
export const defaultFriction = 0.125; // seconds
export const defaultTraction = 1.0;
export const defaultTint = "ffffff";
export const defaultNpcWalkSpeed = 0.5;
export const defaultNpcDampen = 0.4;
export const defaultExitSensorRadius = 16;
export const defaultLightIntensity = 1.0;
export const defaultLightColor = "ffffff";
export const defaultLightFlicker = "constant" as const;

export const lightTemplateId = "lightsTemplate";
export const entryTemplateId = "entryGatewaysTemplate";
export const exitTemplateId = "exitGatewaysTemplate";
export const pickupTemplateId = "pickupsTemplate";

export const defaultTileSize = 16;
export const speakerImageSize = 38;
export const defaultAnimTime = 1000;
export const autosaveMapDebounce = 1000; // ms
export const autosaveTilesetDebounce = 1000; // ms
export const autosaveLocaleDebounce = 1000; // ms

export const gameUrls: Record<Env, string> = {
  local: "http://localhost:5176",
  prod: "https://getlost.gg/",
  qa: "https://qa.getlost.gg/",
};

export const maxSliceObjects = 1500;
export const defaultZIndices = [
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
];

export const minBoundsSize = 128;
export const maxBoundsArea = 1750 * 1750;

export const maxDialogueChoices = 5;
export const defaultMilestone = "default";

/**
 * Participant id used for the player in dialogues. The player has no map object,
 * so this fixed sentinel stands in for it as a speaker/listener.
 */
export const playerParticipantId = "player";

/** Fixed ReactFlow node ID for the story origin (start) node. */
export const storyOriginNodeId = defaultMilestone;
/** Human-readable milestone name displayed for the story origin node. */
export const storyOriginNodeName = "start";

export const mainLocale = "main";

/**
 * The source language assumed for a `main` entry that predates the `srcLang`
 * field. The existing content was authored in English, and this matches the
 * historical `en → main` fallback, so untagged entries resolve as English.
 */
export const defaultSourceLang = "en";

export const uuidNs = "e3ad841d-83e8-4c93-bc39-f3bf76704525";
