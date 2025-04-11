import * as host from "@gl/api/w2h/host";

import { Room } from "@gl/types/room";
import { getSunEventName, SunEvent } from "@gl/types/time";
import { Player } from "@gl/utils/player";
import { isNight } from "@gl/utils/time";
import * as dialogue from "./dialogue";

export { card } from "./card";
export { choiceMadeEvent, strings } from "./dialogue";
export { exits } from "./exits";
export { pickups } from "./pickups";

const log = host.debug.log;

let tsfid!: i32;
let player!: Player;
let music!: i32;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters.
 */
export function initRoom(): Room {
  player = Player.default();

  const room = new Room();
  tsfid = host.filters.addTiltShift(0.06);

  /**
   * You can set a fixed time for the level like this.
   * Be sure to comment out the setSunTime call in `tickRoom` if you do this.
   */
  // const time = Date.UTC(2025, 1, 13, 0, 0, 0, 0);
  // host.time.setSunTime(time);

  music = host.sound.loadSound({
    name: "Musics/17 - Fight.ogg",
    loop: true,
    autoplay: true,
    volume: 0.5,
  });

  return room;
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
 * Called when a pickup event occurs.
 *
 * @param slug The slug of the pickup that was interacted with.
 * @param took Whether the player took the pickup or not.
 */
export function pickupEvent(slug: string, took: bool): void {
  log(`Pickup event: ${slug}, ${took}`);
  if (slug === "flame" && took) {
    host.lights.toggleLight("flame", false);
    host.sensors.toggleSensor("flame", false);
    host.npc.toggleNPC("flame", false);
  }
}

/**
 * Called when a user-defined UI button is pressed or released.
 *
 * @param slug The slug of the button that was pressed.
 * @param down Whether the button was pressed down or released.
 */
export function buttonPressEvent(slug: string, down: bool): void {
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
    `Sensor event: '${initiator}' ${entered ? "entered" : "left"} '${sensorName}'`
  );
  if (initiator !== "player") {
    return;
  }
  if (sensorName === "flame") {
    dialogue.stage_c141faa8(entered);
  } else if (sensorName === "knight") {
    dialogue.stage_491e88c5(entered);
  } else if (sensorName === "well") {
    dialogue.stage_bdc7e965(entered);
  } else if (sensorName === "exit-east" && entered) {
    host.map.exit("east", false);
  } else if (sensorName === "exit-west" && entered) {
    host.map.exit("west", false);
  } else if (sensorName === "exit-south" && entered) {
    host.map.exit("south", false);
  } else if (sensorName === "nazar") {
    dialogue.stage_e1ffb1d2(entered);
  }
}

/**
 * Called when there's a time event change, for example, from Sunrise to
 * SunriseEnd
 */
export function timeChangedEvent(event: SunEvent): void {
  log(`Time changed: ${getSunEventName(event)}`);

  const night = isNight(event);
  host.lights.toggleLight("flame", night);
  host.sensors.toggleSensor("flame", night);
  host.npc.toggleNPC("flame", night);

  const lights = ["nazar-light", "house-light-1"];
  for (let i = 0; i < lights.length; i++) {
    host.lights.toggleLight(lights[i], night);
  }
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
export function tickRoom(timestep: f32): void {
  player.tick(timestep);
  host.player.setAction(player.action);
  host.player.setPos(player.pos.x, player.pos.y);
  host.filters.setTiltShiftY(tsfid, player.pos.y - 10);

  // This syncs the time of day with the real world.
  host.time.setSunTime(Date.now());

  // Or we can advance the time of day manually, increasing the step size to
  // make the days faster.
  // host.time.advanceSunTime(timestep * 1000);
}
