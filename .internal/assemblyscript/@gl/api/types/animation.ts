export class SetAnimationOpts {
  name!: string;
  loop: bool = false;
  /** How long the whole animation should take. If negative, use the native
   * animation duration. */
  durationMs: f32 = -1;
}
