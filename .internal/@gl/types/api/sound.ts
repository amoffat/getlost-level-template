export interface LoadOpts {
  /** The name of the sound to load from your `sounds` folder */
  name: string;
  /** Whether the sound should autoplay on loads. Good for music. */
  autoplay?: boolean;
  /** Whether the sound should loop. Also good for music. */
  loop?: boolean;
  /** The volume of the sound. */
  volume?: number;
  sprites?: Record<string, [number, number]>;
  offsetMs?: number;
  rateExponent?: number;
}

export interface SoundSpec {
  assetId: number;
  /** Play a named sub-region. Only meaningful for `playSound`. */
  spriteId?: string;
  /** Target one live playback (a `playSound` return). Omit to target the whole asset / all instances. */
  soundId?: number;
}

export interface CrossFadeSpec {
  assetAId: number;
  assetBId: number;
  /** Optionally target specific live playbacks instead of whole assets. */
  soundAId?: number;
  soundBId?: number;
  durationMs?: number;
  volumeAStart?: number;
  volumeBEnd: number;
}

export interface SoundMeta {
  durationMs: number;
}
