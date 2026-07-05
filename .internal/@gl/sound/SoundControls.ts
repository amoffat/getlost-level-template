import * as sound from "@gl/api/sound";
import type { SoundMeta, SoundSpec } from "@gl/types/api/sound";

export interface CrossfadeOpts {
  duration?: number; // ms
  volumeAStart?: number;
  volumeBEnd?: number; // defaults to 1
}

/**
 * Shared playback controls for {@link Sound} (a whole asset / all its live
 * playbacks) and {@link SoundInstance} (a single live playback).
 *
 * Mirrors the UI {@link Widget} pattern: this base implements the controls once
 * against an abstract {@link _spec} hook, and each subclass fills in what the
 * controls target — the whole asset, or one instance (via `soundId`).
 */
export abstract class SoundControls {
  protected _assetId: number;
  protected _volume: number;

  constructor(assetId: number, volume: number) {
    this._assetId = assetId;
    this._volume = volume;
  }

  get assetId(): number {
    return this._assetId;
  }

  /** What these controls act on: the whole asset, or one instance (with `soundId`). */
  protected abstract _spec(): SoundSpec;

  pause(): void {
    sound.pauseSound(this._spec());
  }

  stop(): void {
    sound.stopSound(this._spec());
  }

  seek(pos: number): void {
    sound.seek({ pos, ...this._spec() });
  }

  fadeIn(durationMs: number): void {
    sound.fade({ out: false, durationMs, ...this._spec() });
  }

  fadeOut(durationMs: number): void {
    sound.fade({ out: true, durationMs, ...this._spec() });
  }

  /** Crossfade this into `other`. Works asset↔asset, instance↔instance, or mixed. */
  crossfadeTo(other: SoundControls, opts: CrossfadeOpts = {}): void {
    const a = this._spec();
    const b = other._spec();
    sound.crossfade({
      assetAId: a.assetId,
      assetBId: b.assetId,
      soundAId: a.soundId,
      soundBId: b.soundId,
      durationMs: opts.duration,
      volumeAStart: opts.volumeAStart,
      volumeBEnd: opts.volumeBEnd ?? 1,
    });
  }

  get meta(): SoundMeta {
    return sound.getSoundMeta(this._spec());
  }

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = v;
    sound.setVolume({ volume: v, ...this._spec() });
  }
}
