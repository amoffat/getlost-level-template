import type { CrossFadeSpec, LoadOpts, PlayOpts } from "@gl/types/api/sound";

/**
 * Loads a sound and returns its ID.
 *
 * @param opts Sound options.
 * @returns The *asset* ID of the loaded sound.
 */
export declare function loadSound(opts: LoadOpts): Promise<number>;
export declare function playSound(opts: PlayOpts): number;
export declare function pauseSound(
  audible: boolean,
  assetId: number,
  soundId: number,
): void;
export declare function stopSound(assetId: number, soundId: number): void;
export declare function setVolume(
  assetId: number,
  soundId: number,
  volume: number,
): void;
export declare function crossfade(opts: CrossFadeSpec): void;
