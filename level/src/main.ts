import * as filters from "@gl/api/w2h/filters";

import { type Vector } from "@gl/api/types/vector";
import { addTiltShift } from "@gl/api/w2h/filters";
import { setSunTime } from "@gl/api/w2h/time";
import { getSunEventName, SunEvent } from "@gl/types/time";
import type { Vec2 } from "@gl/utils/la/vec2";
import { prevSunEvent } from "@gl/utils/time";

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

  console.log(story.current);
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
 * Called when a pickup event occurs.
 *
 * @param slug The slug of the pickup that was interacted with.
 * @param took Whether the player took the pickup or not.
 */
export function pickupEvent(slug: string, took: boolean): void {
  console.log(`Pickup event: ${slug}, ${took}`);
}

/**
 * Called when a user-defined UI button is pressed or released.
 *
 * @param slug The slug of the button that was pressed.
 * @param down Whether the button was pressed down or released.
 */
export function buttonPressEvent(slug: string, down: boolean): void {
  console.log(`Button event: ${slug}, ${down}`);
}

/**
 * When a tile collision event occurs, this function is called. You can use this
 * similar to a sensor event, but it's triggered by the collision of a tile. Most
 * times you'll probably want to respond to a sensor event instead.
 *
 * @param tsTileId The tile id in the tileset that it's a part of.
 * @param gid The global tile id of the tile, unique among all tiles.
 * @param entered Whether the player entered or exited the tile.
 * @param column The column of the tile in the map.
 * @param row The row of the tile in the map.
 */
export function tileCollisionEvent(
  initiator: string,
  tsTileId: number,
  gid: number,
  entered: boolean,
  column: number,
  row: number,
): void {
  // log(`Collision event: ${tsTileId}, ${gid}, ${entered} @ ${column}, ${row}`);
}

export function spriteCollisionEvent(
  initiator: string,
  collider: string,
  direction: Vector,
  entered: boolean,
): void {
  if (initiator !== "player") {
    return;
  }
}

/**
 * Called when a the dialogue dialog is closed.
 *
 * @param passageId The id of the passage that was closed.
 */
export function dialogClosedEvent(passageId: string): void {}

/**
 * Called when a timer is completed.
 *
 * @param name The name of the timer that was completed.
 */
export function timerCompletedEvent(name: string): void {
  console.log(`Timer completed: ${name}`);
}

/**
 * Called when a sensor event occurs.
 *
 * @param initiator The name of the entity that triggered the sensor. This is
 * usually the player, but can be other entities as well.
 * @param sensorName The name of the sensor that was triggered. This is set in
 * Tiled.
 * @param entered Whether the player entered or exited the sensor.
 */
export function sensorEvent(
  initiator: string,
  sensorName: string,
  direction: Vector,
  entered: boolean,
): void {
  if (initiator !== "player") {
    return;
  }

  console.log(
    `Sensor event: '${initiator}' ${
      entered ? "entered" : "left"
    } '${sensorName}'`,
  );
}

/**
 * Called when there's a sun event change, for example, from Sunrise to
 * SunriseEnd
 */
export function sunChangedEvent(event: SunEvent): void {
  const lastEvent = prevSunEvent(event);
  console.log(
    `Sun changed: ${getSunEventName(lastEvent)} -> ${getSunEventName(event)} `,
  );
}

/**
 * Called when the game is paused, `tick` stops ticking and this function
 * starts. Use this to advance things that you want to keep moving while the
 * game is paused.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export function pauseTick(timestep: number): void {}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export async function tick(timestep: number) {
  filters.setTiltShiftY(tiltShift, player.pos.y - 10);
  setSunTime(Date.now());
}
