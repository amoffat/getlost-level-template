import { loadSound, playSound } from "@gl/api/sound";
import { Action } from "@gl/utils/behavior";

export class SoundAction extends Action<unknown> {
  private static _loadedSounds: Map<string, Promise<number>> = new Map();
  private readonly _soundKey: string;

  constructor({ name = "sound", key }: { name?: string; key: string }) {
    super({ name, duration: 0 });
    this._soundKey = key;

    if (!SoundAction._loadedSounds.has(this._soundKey)) {
      SoundAction._loadedSounds.set(
        this._soundKey,
        loadSound({
          name: this._soundKey,
          autoplay: false,
          loop: false,
          volume: 1.0,
          sprites: [],
        }),
      );
    }
  }

  public override onStart(): void {
    const assetIdPromise = SoundAction._loadedSounds.get(this._soundKey)!;
    assetIdPromise.then((assetId) => {
      playSound({ assetId });
    });
  }
}
