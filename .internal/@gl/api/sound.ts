import type {
  CrossFadeSpec,
  LoadOpts,
  SoundMeta,
  SoundSpec,
} from "@gl/types/api/sound";

export declare function loadSound(opts: LoadOpts): Promise<number>;
export declare function playSound(spec: SoundSpec): number;
export declare function pauseSound(
  opts: {
    audible: boolean;
  } & SoundSpec,
): void;
export declare function stopSound(spec: SoundSpec): void;
export declare function getSoundMeta(spec: SoundSpec): SoundMeta;
export declare function setVolume(
  opts: {
    volume: number;
  } & SoundSpec,
): void;
export declare function crossfade(opts: CrossFadeSpec): void;
export declare function fade({
  out,
  assetId,
  durationMs,
}: {
  out?: boolean;
  assetId: number;
  durationMs: number;
}): void;
export declare function seek(
  opts: {
    pos: number;
  } & SoundSpec,
): void;
