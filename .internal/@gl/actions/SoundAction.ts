import * as sound from "@gl/api/sound";
import { Action } from "@gl/utils/behavior";

export class SoundAction extends Action<unknown> {
  private static _loadedSounds: Map<string, Promise<number>> = new Map();
  private readonly _soundKey: string;
  private readonly _fadeOutMs: number;
  private _fading: boolean = false;
  private _volume: number;

  constructor({
    name = "sound",
    key,
    volume = 1.0,
    durationMs = 0,
    fadeOutMs = 0,
  }: {
    name?: string;
    key: string;
    volume?: number;
    durationMs?: number;
    fadeOutMs?: number;
  }) {
    super({ name, durationMs });
    this._soundKey = key;
    this._fadeOutMs = fadeOutMs;
    this._volume = volume;

    let loadPromise = SoundAction._loadedSounds.get(key);
    if (!loadPromise) {
      loadPromise = sound.loadSound({
        name: key,
        autoplay: false,
        loop: false,
        volume,
      });
      SoundAction._loadedSounds.set(key, loadPromise);
    }
  }

  public async soundId(): Promise<number> {
    return SoundAction._loadedSounds.get(this._soundKey)!;
  }

  public override onActionStart(): void {
    this.soundId().then((assetId) => {
      sound.setVolume({ assetId, volume: this._volume });
      sound.seek({ assetId, pos: 0 });
      sound.playSound({ assetId });
    });
  }

  public override tick({ elapsed }: { elapsed: number }): void {
    if (!this._fading && this._fadeOutMs > 0) {
      const startFadingAt = Math.max(0, this.durationMs - this._fadeOutMs);
      if (elapsed >= startFadingAt) {
        this._fading = true;
        this.soundId().then((assetId) => {
          sound.fade({ assetId, durationMs: this._fadeOutMs });
        });
      }
    }
  }
}
