import type { SoundSpec } from "@gl/types/api/sound";
import { SoundControls } from "./SoundControls";

/**
 * A single live playback, identified by its Howler sound id. Controls inherited
 * from {@link SoundControls} affect only this playback, not other instances of
 * the same asset.
 */
export class SoundInstance extends SoundControls {
  private _soundId: number;

  constructor(assetId: number, volume: number, soundId: number) {
    super(assetId, volume);
    this._soundId = soundId;
  }

  get soundId(): number {
    return this._soundId;
  }

  protected _spec(): SoundSpec {
    return { assetId: this._assetId, soundId: this._soundId };
  }
}
