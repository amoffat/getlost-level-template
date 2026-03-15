export class SetAnimationOpts {
  name!: string;
  loop: boolean = false;
  /** How long the whole animation should take. If negative, use the native
   * animation duration. */
  durationMs: number = -1;
}
