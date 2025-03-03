import { SoundOpts } from "../types/sound";

export declare function loadSound(opts: SoundOpts): u32;
export declare function playSound(id: u32): void;
export declare function setVolume(id: u32, volume: f32): void;

export const _keep_loadSound = loadSound;
export const _keep_playSound = playSound;
export const _keep_setVolume = setVolume;
