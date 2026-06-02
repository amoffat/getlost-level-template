interface Sprite {
  /** The name of the sprite. */
  name: string;
  /** The start time of the sprite in seconds. */
  start: number;
  /** The length of the sprite in seconds. */
  length: number;
}

export interface LoadOpts {
  /** The name of the sound to load from your `sounds` folder */
  name: string;
  /** Whether the sound should autoplay on loads. Good for music. */
  autoplay?: boolean;
  /** Whether the sound should loop. Also good for music. */
  loop?: boolean;
  /** The volume of the sound. */
  volume?: number;
  sprites?: Sprite[];
  offsetMs?: number;
}

export interface SoundSpec {
  assetId: number;
  spriteId?: number;
}

export interface CrossFadeSpec {
  assetAId: number;
  assetBId: number;
  duration?: number; // ms
  volumeAStart?: number;
  volumeBEnd: number;
}

export interface SoundMeta {
  durationMs: number;
}
