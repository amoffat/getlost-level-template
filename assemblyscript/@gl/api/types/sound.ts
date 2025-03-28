export class SoundOpts {
  /** The name of the sound to load from your `sounds` folder */
  name!: string;
  /** Whether the sound should autoplay on loads. Good for music. */
  autoplay: boolean = false;
  /** Whether the sound should loop. Also good for music. */
  loop: boolean = false;
  /** The volume of the sound. */
  volume: f32 = 1;
}
