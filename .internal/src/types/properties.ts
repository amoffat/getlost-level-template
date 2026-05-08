import {
  defaultExitSensorRadius,
  defaultFriction,
  defaultLightColor,
  defaultLightFlicker,
  defaultLightIntensity,
  defaultNpcDampen,
  defaultNpcWalkSpeed,
  defaultTraction,
  defaultWalkSound,
  WalkSound,
} from "@/constants";
import type { LightFlicker } from "./lights";
import type { NpcAnimationRecord } from "./npc";

type InstanceStatus = "error" | "warning";

export interface EntranceProps {
  slug: string | null;
  exitIds: string[];
  status: InstanceStatus | null;
}

export interface ExitProps {
  slug: string | null;
  force: boolean;
  preferredEntranceId: string | null;
  sensorRadius: number;
  status: InstanceStatus | null;
}

export interface PickupProps {
  nameKey: string | null;
  assetId: string | null;
  tags: string[];
  status: InstanceStatus | null;
  hidden: boolean;
}

export interface LightProps {
  name: string;
  color: string;
  intensity: number;
  hidden: boolean;
  flicker: LightFlicker;
  offDuringDay: boolean;
}

export interface TileGroupProps {
  nameKey: string | null;
  talkable: boolean;
  tags: string[];
  flipX: boolean;
  walkSound: WalkSound;
  friction: number;
  traction: number;
  hidden: boolean;
  tint: string | null;
  groundOffset: number;
  speakerImageId: string | null;
}

export interface AnimationProps {
  nameKey: string | null;
  talkable: boolean;
  tags: string[];
  flipX: boolean;
  tint: string | null;
  loop: boolean;
  autoplay: boolean;
  hidden: boolean;
  groundOffset: number;
  speakerImageId: string | null;
}

export interface NpcProps {
  nameKey: string | null;
  talkable: boolean;
  tags: string[];
  flipX: boolean;
  walkSpeed: number;
  tint: string | null;
  hidden: boolean;
  defaultAnimation: keyof NpcAnimationRecord;
  groundOffset: number;
  dampenWalkCollisions: number;
  status: InstanceStatus | null;
  speakerImageId: string | null;
}

// Default values for each Props type. These are applied at load time to fill in
// any properties that are absent from persisted data, eliminating the need for
// migrations when adding or removing properties.

export const ENTRANCE_PROPS_DEFAULTS: EntranceProps = {
  slug: null,
  exitIds: [],
  status: null,
};

export const EXIT_PROPS_DEFAULTS: ExitProps = {
  slug: null,
  force: false,
  preferredEntranceId: null,
  sensorRadius: defaultExitSensorRadius,
  status: null,
};

export const PICKUP_PROPS_DEFAULTS: PickupProps = {
  nameKey: null,
  assetId: null,
  tags: [],
  status: null,
  hidden: false,
};

export const LIGHT_PROPS_DEFAULTS: LightProps = {
  name: "",
  color: defaultLightColor,
  intensity: defaultLightIntensity,
  hidden: false,
  flicker: defaultLightFlicker,
  offDuringDay: false,
};

export const TILE_GROUP_PROPS_DEFAULTS: TileGroupProps = {
  nameKey: null,
  talkable: false,
  tags: [],
  flipX: false,
  walkSound: defaultWalkSound,
  friction: defaultFriction,
  traction: defaultTraction,
  hidden: false,
  tint: null,
  groundOffset: 0,
  speakerImageId: null,
};

export const ANIMATION_PROPS_DEFAULTS: AnimationProps = {
  nameKey: null,
  talkable: false,
  tags: [],
  flipX: false,
  tint: null,
  loop: true,
  autoplay: false,
  hidden: false,
  groundOffset: 0,
  speakerImageId: null,
};

export const NPC_PROPS_DEFAULTS: NpcProps = {
  nameKey: null,
  talkable: true,
  tags: [],
  flipX: false,
  walkSpeed: defaultNpcWalkSpeed,
  tint: null,
  hidden: false,
  defaultAnimation: "Idle",
  groundOffset: 0,
  dampenWalkCollisions: defaultNpcDampen,
  status: null,
  speakerImageId: null,
};

export interface MilestoneNodeData extends Record<string, unknown> {
  permanent: boolean;
}

export const MILESTONE_NODE_DEFAULTS: MilestoneNodeData = {
  permanent: false,
};
