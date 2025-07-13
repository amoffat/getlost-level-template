class Sprite {
  /** The name of the sprite. */
  name!: string;
  /** The start time of the sprite in seconds. */
  start: f32 = 0;
  /** The length of the sprite in seconds. */
  length: f32 = 0;
}

export class LoadOpts {
  /** The name of the sound to load from your `sounds` folder */
  name!: string;
  /** Whether the sound should autoplay on loads. Good for music. */
  autoplay: boolean = false;
  /** Whether the sound should loop. Also good for music. */
  loop: boolean = false;
  /** The volume of the sound. */
  volume: f32 = 1;
  sprites: Sprite[] = [];
}

export class PlayOpts {
  assetId!: i32;
  spriteId: i32 = -1;
}
