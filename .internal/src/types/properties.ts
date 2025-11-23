import { WalkSound } from "@/constants";
import { RgbColor } from "./color";

export interface EntranceProps {
  name: string;
  tags: string[];
  exitIds: string[];
  primary: boolean;
}

export interface ExitProps {
  name: string;
  tags: string[];
  force: boolean;
  preferredEntranceId: string | null;
}

export interface LightProps {
  name: string;
  color: RgbColor;
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
}

export interface AnimationProps {
  name: string;
  tags: string[];
  flipX: boolean;
}

export interface NpcProps {
  name: string;
  tags: string[];
  flipX: boolean;
  walkSpeed: number;
}
