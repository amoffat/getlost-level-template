import * as host from "@gl/api/w2h/host";

import { getSunEventName, SunEvent } from "@gl/types/time";
import { Player } from "@gl/utils/player";
import { prevSunEvent } from "@gl/utils/time";
import * as dialogue from "./generated/dialogue";

export { initAsyncStack } from "@gl/utils/asyncify";
export { card } from "./card";
export { entrances, exits } from "./gateways";
export { choiceMadeEvent } from "./generated/dialogue";
export { markers } from "./markers";
export { pickups } from "./pickups";

const log = host.debug.log;

let player!: Player;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters.
 */
export function init(): void {
  player = Player.default();
  host.time.setSunEvent(SunEvent.SolarNoon, 0);
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
export function movePlayer(x: f32, y: f32): void {
  player.direction.x = x;
  player.direction.y = y;
}

/**
 * Called when a user-created timer is triggered.
 *
 * @param id The id of the timer created by `host.timer.start`.
 */
export function timerEvent(id: u32): void {
  log(`Timer event: ${id}`);
}

/**
 * Called when an async asset has been loaded.
 *
 * @param id The ID of the asset that was loaded.
 */
export function assetLoadedEvent(id: i32): void {}

/**
 * Called when an async event is triggered. This is usually used for things like
 * animations being finished. This is to support the fact that AS doesn't yet
 * support promises or async/await.
 *
 * @param id The async event id.
 */
export function asyncEvent(id: i32): void {}

/**
 * Called when a pickup event occurs.
 *
 * @param slug The slug of the pickup that was interacted with.
 * @param took Whether the player took the pickup or not.
 */
export function pickupEvent(slug: string, took: bool): void {
  log(`Pickup event: ${slug}, ${took}`);
}

/**
 * Called when a user-defined UI button is pressed or released.
 *
 * @param slug The slug of the button that was pressed.
 * @param down Whether the button was pressed down or released.
 */
export function buttonPressEvent(slug: string, down: bool): void {
  log(`Button event: ${slug}, ${down}`);

  // If our dialogue was staged via a `dialogue.stage_<id>` call, then the event
  // may be a press of the "interact" button. This checks for that, and if it
  // is, we'll dispatch to the correct passage.
  if (slug.startsWith("passage/") && down) {
    const passage = slug.split("/")[1];
    dialogue.dispatch(passage);
  }
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
  tsTileId: i32,
  gid: i32,
  entered: bool,
  column: i32,
  row: i32
): void {
  // log(`Collision event: ${tsTileId}, ${gid}, ${entered} @ ${column}, ${row}`);
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
  log(`Timer completed: ${name}`);
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
  entered: bool
): void {
  log(
    `Sensor event: '${initiator}' ${
      entered ? "entered" : "left"
    } '${sensorName}'`
  );

  if (initiator !== "player") {
    return;
  }
}

/**
 * Called when there's a time event change, for example, from Sunrise to
 * SunriseEnd
 */
export function timeChangedEvent(event: SunEvent): void {
  const lastEvent = prevSunEvent(event);
  log(
    `Time changed: ${getSunEventName(lastEvent)} -> ${getSunEventName(event)} `
  );
}

/**
 * Called when the game is paused, `tickRoom` stops ticking and this function
 * starts. Use this to advance things that you want to keep moving while the
 * game is paused.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export function pauseTick(timestep: f32): void {}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export function tick(timestep: f32): void {
  player.tick(timestep);
  host.player.setAction(player.action);
  host.player.setPos(player.pos.x, player.pos.y);
}
