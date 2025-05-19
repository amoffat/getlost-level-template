/**
 * Manages a periodic timer. `tick` should be called every frame with the delta
 * time since the last frame. When the timer reaches the specified frequency,
 * `tick` will return true.
 */
export class Periodic {
  frequencyMs: f32;
  private accumulatedMs: f32 = 0;

  constructor(frequencyMs: f32, initialDelay: f32 = 0) {
    this.frequencyMs = frequencyMs;
    // Start with a negative delay so that the first tick is immediate
    this.accumulatedMs = -initialDelay + frequencyMs;
  }

  tick(deltaMs: f32): bool {
    this.accumulatedMs += deltaMs;

    if (this.accumulatedMs >= this.frequencyMs) {
      this.accumulatedMs -= this.frequencyMs; // Reset but keep remainder
      return true;
    }

    return false;
  }
}
