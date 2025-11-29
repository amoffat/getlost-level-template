import { WalkSound } from "@/constants";
import { InstanceStatus } from "./InstanceStatus";

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

export interface LightProps {
  name: string;
  color: string;
  intensity: number;
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
}

export interface AnimationProps {
  names: string[];
  tags: string[];
  flipX: boolean;
  tint: string | null;
  loop: boolean;
}

export interface NpcProps {
  name: string;
  tags: string[];
  flipX: boolean;
  walkSpeed: number;
  tint: string | null;
}
