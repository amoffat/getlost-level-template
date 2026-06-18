import { Vector2 } from "@gl/types/api/vector";

interface SnowOpts {
  turbulence?: number;
  dampening?: number;
  wind?: Vector2;
}

export declare function createSnow({
  tilesetId,
  tileId,
  num,
  opts,
}: {
  tilesetId: string;
  tileId: string;
  num: number;
  opts?: SnowOpts;
}): void;
