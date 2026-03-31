import { WalkSound } from "@/constants";
import type { LightFlicker } from "./lights";
import type { NpcAnimationRecord } from "./npc";

type InstanceStatus = "error" | "warning";

export interface EntranceProps {
  name: string;
  tags: string[];
  exitIds: string[];
  status: InstanceStatus | null;
}

export interface ExitProps {
  name: string;
  tags: string[];
  force: boolean;
  preferredEntranceId: string | null;
  sensorRadius: number;
  status: InstanceStatus | null;
}

export interface PickupProps {
  name: string;
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
  name: string;
  tags: string[];
  flipX: boolean;
  walkSound: WalkSound;
  friction: number;
  traction: number;
  hidden: boolean;
  tint: string | null;
  groundOffset: number;
}

export interface AnimationProps {
  name: string;
  tags: string[];
  flipX: boolean;
  tint: string | null;
  loop: boolean;
  hidden: boolean;
  groundOffset: number;
}

export interface NpcProps {
  name: string;
  tags: string[];
  flipX: boolean;
  walkSpeed: number;
  tint: string | null;
  hidden: boolean;
  defaultAnimation: keyof NpcAnimationRecord;
  groundOffset: number;
  dampenWalkCollisions: number;
  status: InstanceStatus | null;
}
