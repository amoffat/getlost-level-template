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
  /** sprite name -> spriteId (array index), built from `LoadOpts.sprites`. */
  private _spriteIds: Map<string, number>;

  private constructor(
    assetId: number,
    volume: number,
    spriteIds: Map<string, number>,
  ) {
    super(assetId, volume);
    this._spriteIds = spriteIds;
  }

  /** Load a sound from the `sounds` folder and return a ready-to-use instance. */
  static async load(opts: LoadOpts): Promise<Sound> {
    const assetId = await sound.loadSound(opts);
    const spriteIds = new Map<string, number>();
    (opts.sprites ?? []).forEach((s, i) => spriteIds.set(s.name, i));
    return new Sound(assetId, opts.volume ?? 1, spriteIds);
  }

  protected _spec(): SoundSpec {
    return { assetId: this._assetId };
  }

  /** Start a new playback; returns a handle to that specific instance. */
  play(opts: PlayOpts = {}): SoundInstance {
    let spriteId: number | undefined;
    if (opts.sprite !== undefined) {
      spriteId = this._spriteIds.get(opts.sprite);
      if (spriteId === undefined) {
        throw new Error(`Sound: unknown sprite "${opts.sprite}"`);
      }
    }
    const soundId = sound.playSound({ assetId: this._assetId, spriteId });
    return new SoundInstance(this._assetId, this._volume, soundId);
  }
}
