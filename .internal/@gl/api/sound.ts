import type {
  CrossFadeSpec,
  LoadOpts,
  SoundMeta,
  SoundSpec,
} from "@gl/types/api/sound";

export declare function loadSound(opts: LoadOpts): Promise<number>;
export declare function playSound(spec: SoundSpec): number;
export declare function pauseSound(opts: SoundSpec): void;
export declare function stopSound(spec: SoundSpec): void;
export declare function getSoundMeta(spec: SoundSpec): SoundMeta;
export declare function setVolume(
  opts: {
    volume: number;
  } & SoundSpec,
): void;
export declare function crossfade(opts: CrossFadeSpec): void;
export declare function fade(
  opts: {
    out?: boolean;
    durationMs: number;
  } & SoundSpec,
): void;
export declare function seek(
  opts: {
    pos: number;
  } & SoundSpec,
): void;
