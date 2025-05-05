import { LoadAndPlaySoundOpts, LoadOpts, PlayOpts } from "../types/sound";

/**
 * Loads a sound and returns its ID.
 *
 * @param opts Sound options.
 * @returns The ID of the loaded sound.
 */
export declare function loadSound(opts: LoadOpts): i32;
export declare function playSound(opts: PlayOpts): void;
export declare function loadAndPlaySound(opts: LoadAndPlaySoundOpts): i32;
export declare function setVolume(id: i32, volume: f32): void;

export const _keep_loadSound = loadSound;
export const _keep_playSound = playSound;
export const _keep_loadAndPlaySound = loadAndPlaySound;
export const _keep_setVolume = setVolume;
