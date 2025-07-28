import { CrossFadeSpec, LoadOpts, PlayOpts } from "../types/sound";

/**
 * Loads a sound and returns its ID.
 *
 * @param opts Sound options.
 * @returns The *asset* ID of the loaded sound.
 */
export declare function loadSound(opts: LoadOpts): i32;
export declare function playSound(opts: PlayOpts): i32;
export declare function stopSound(assetId: i32, soundId: i32): void;
export declare function setVolume(
  assetId: i32,
  soundId: i32,
  volume: f32
): void;
export declare function crossfade(opts: CrossFadeSpec): void;

export const _keep_loadSound = loadSound;
export const _keep_playSound = playSound;
export const _keep_stopSound = stopSound;
export const _keep_setVolume = setVolume;
export const _keep_crossfade = crossfade;
