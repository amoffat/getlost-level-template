import * as filters from "@gl/api/w2h/filters";

import { addTiltShift } from "@gl/api/w2h/filters";
import { setSunTime } from "@gl/api/w2h/time";
import { Vec2 } from "@gl/utils/la/vec2";

export { card } from "./card";
export { entrances, exits } from "./gateways";
export { markers } from "./markers";
export { pickups } from "./pickups";

let tiltShift!: number;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters.
 */
export async function init(): Promise<void> {
  tiltShift = addTiltShift(0.06);

  // console.log(story.current);
  events.on(
    "collision",
    { character: "player", collider: "barn" },
    ({ direction }) => {
      const hurtDirection = Vec2.fromVector(direction).normalize().flip();
      player.hurt(hurtDirection);
    },
  );
}

/**
 * This function is called when the game receives a movement event. Use it to
 * adjust the player's position *in that direction.* In other words, this
 * function does not receive an absolute position, but a direction to move the
 * player.
 *
 * @param x The x *direction* to move the player.
 * @param y The y *direction* to move the player.
 */
export function movePlayer(dir: Vec2): void {
  player.direction.x = dir.x;
  player.direction.y = dir.y;
}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 * @param paused Whether the game is currently paused or not.
 */
export async function tick(timestep: number, paused: boolean) {
  filters.setTiltShiftY(tiltShift, player.pos.y - 10);
  setSunTime(Date.now());
}
