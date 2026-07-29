import { Vec2 } from "@gl/utils/vec2";

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters, or setting up event handlers.
 */
export async function init(): Promise<void> {}

/**
 * This function is called when the game receives a movement event. Use it to
 * adjust the player's position *in that direction.* In other words, this
 * function does not receive an absolute position, but a direction to move the
 * player.
 *
 * @param dir The *direction* to move the player.
 */
export function movePlayer(dir: Vec2): void {
  player.setControlDirection(dir);
}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 * @param paused Whether the game is currently paused or not.
 */
export async function tick(timestep: number, paused: boolean) {}
