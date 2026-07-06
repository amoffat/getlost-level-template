import * as sound from "@gl/api/sound";
import type { LoadOpts, SoundSpec } from "@gl/types/api/sound";
import { SoundControls } from "./SoundControls";
import { SoundInstance } from "./SoundInstance";

export interface PlayOpts {
  /** Name of a sprite declared in this sound's `sprites`. Omit to play the whole asset. */
  sprite?: string;
}

/**
 * A loaded sound asset (a Howl). Owns its `assetId` and wraps every `sound` API
 * call so callers work with an object (`kick.play()`, `bgm1.crossfadeTo(bgm2)`)
 * instead of threading a bare `assetId` through free functions.
 *
 * Controls inherited from {@link SoundControls} act on the whole asset — i.e.
 * all of its live playbacks. To control a single playback, use the
 * {@link SoundInstance} returned by {@link play}.
 *
 * Unlike the UI {@link Widget} classes there is no per-frame display state to
 * sync, and `loadSound` is async — so construction goes through the static
 * {@link load} factory, and every method calls the host directly.
 */
export class Sound extends SoundControls {
  private constructor(assetId: number, volume: number) {
    super(assetId, volume);
  }

  /** Load a sound from the `sounds` folder and return a ready-to-use instance. */
  static async load(opts: LoadOpts): Promise<Sound> {
    const assetId = await sound.loadSound(opts);
    return new Sound(assetId, opts.volume ?? 1);
  }

  protected _spec(): SoundSpec {
    return { assetId: this._assetId };
  }

  /** Start a new playback; returns a handle to that specific instance. */
  play(opts: PlayOpts = {}): SoundInstance {
    const soundId = sound.playSound({
      assetId: this._assetId,
      spriteId: opts.sprite,
    });
    return new SoundInstance(this._assetId, this._volume, soundId);
  }
}
