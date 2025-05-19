import * as host from "@gl/api/w2h/host";

import { ColorMatrixFilter } from "@gl/filters/colormatrix";
import { String } from "@gl/types/i18n";
import { getSunEventName, SunEvent } from "@gl/types/time";
import { Periodic } from "@gl/utils/periodic";
import { Player } from "@gl/utils/player";
import { createHeatFilter, RippleFilter } from "@gl/utils/ripple";
import { isNight } from "@gl/utils/time";
import * as dialogue from "./generated/dialogue";

export { initAsyncStack } from "@gl/utils/asyncify";
export { card } from "./card";
export { exits } from "./exits";
export { choiceMadeEvent } from "./generated/dialogue";
export { grantedMarkers, usedMarkers } from "./markers";
export { pickups } from "./pickups";

const log = host.debug.log;

let tsfid!: i32;
let player!: Player;
let music!: i32;
let hearts: f32 = 3;
const overheatColor = "red";
let nighttime: bool = false;
let overheat: f32 = 0.0;
let inWater: bool = false;
const healingPool = new Periodic(200, 1000);
const heatDamage = new Periodic(5000, 0);
let heatFilter!: RippleFilter;
let colorMatrix!: ColorMatrixFilter;
let heatAmt: f32 = 0.0;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters.
 */
export function initRoom(): void {
  player = Player.default();

  heatFilter = createHeatFilter();
  colorMatrix = new ColorMatrixFilter();
  colorMatrix.hot();

  tsfid = host.filters.addTiltShift(0.06);

  heatFilter.influence = heatAmt;
  colorMatrix.influence = heatAmt;

  /**
   * You can set a fixed time for the level like this.
   * Be sure to comment out the setSunTime call in `tickRoom` if you do this.
   */
  host.time.setSunEvent(SunEvent.SolarNoon, 0);

  music = host.sound.loadSound({
    name: "Musics/17 - Fight.ogg",
    loop: true,
    autoplay: true,
    volume: 0.5,
    sprites: [],
  });

  host.ui.setRating(0, 0, hearts, 5, "heart", "red");
  host.ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
  updateHeatFilter();
}

/**
 * Sets the heat fx (ripple and color grading) based on the time of day.
 */
function updateHeatFilter(): void {
  const curSunEvent = host.time.getSunEvent();
  heatAmt = 0;
  if (curSunEvent === SunEvent.GoldenHourEnd) {
    heatAmt = host.time.getSunEventProgress();
  } else if (curSunEvent === SunEvent.GoldenHour) {
    heatAmt = 1.0 - host.time.getSunEventProgress();
  } else if (curSunEvent === SunEvent.SolarNoon) {
    heatAmt = 1.0;
  }
  heatFilter.influence = heatAmt;
  colorMatrix.influence = heatAmt;
}

/**
 * Called on level initialization to expose what strings we use in our level.
 * This is used for localization.
 *
 * @returns The strings that our level uses.
 */
export function strings(): String[] {
  const ourStrings: String[] = [
    {
      key: "overheat",
      values: [
        {
          text: "Heat exhaustion",
          lang: "en",
        },
      ],
    },
    {
      key: "take-fruit",
      values: [
        {
          text: "Steal",
          lang: "en",
        },
      ],
    },
  ];
  const dialogueStrings = dialogue.strings();
  return ourStrings.concat(dialogueStrings);
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
  if (slug === "flame" && took) {
    host.lights.toggleLight("flame", false);
    host.sensors.toggleSensor("flame", false);
    host.npc.toggleNPC("flame", false);
  } else if (slug === "fruit" && took) {
    host.markers.record("stole-fruit");
  }
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

  if (slug === "fruit-taken" && down) {
    host.pickup.offerPickup("fruit");
    host.controls.setButtons([]);
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

export function dialogClosedEvent(passageId: string): void {}

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
  if (sensorName === "flame") {
    dialogue.stage_Fire(entered);
  } else if (sensorName === "knight") {
    dialogue.stage_Knight(entered);
  } else if (sensorName === "well") {
    dialogue.stage_Well(entered);
  } else if (sensorName === "exit-east" && entered) {
    host.map.exit("east", false);
  } else if (sensorName === "exit-west" && entered) {
    host.map.exit("west", false);
  } else if (sensorName === "exit-south" && entered) {
    host.map.exit("south", false);
  } else if (sensorName === "nazar") {
    dialogue.stage_Nazar(entered);
  } else if (sensorName === "water") {
    inWater = entered;
  } else if (sensorName === "fruit") {
    if (entered) {
      host.controls.setButtons([
        {
          label: "take-fruit",
          slug: "fruit-taken",
        },
      ]);
    } else {
      host.controls.setButtons([]);
    }
  }
}

/**
 * Called when there's a time event change, for example, from Sunrise to
 * SunriseEnd
 */
export function timeChangedEvent(event: SunEvent): void {
  log(`Time changed: ${getSunEventName(event)}`);

  nighttime = isNight(event);
  host.lights.toggleLight("flame", nighttime);
  host.sensors.toggleSensor("flame", nighttime);
  host.npc.toggleNPC("flame", nighttime);

  const lights = ["nazar-light", "house-light-1"];
  for (let i = 0; i < lights.length; i++) {
    host.lights.toggleLight(lights[i], nighttime);
  }

  updateHeatFilter();
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

  if (inWater && hearts < 5 && healingPool.tick(timestep)) {
    hearts++;
    host.ui.setRating(0, 0, hearts, 5, "heart", "red");
  }

  // This syncs the time of day with the real world.
  host.time.setSunTime(Date.now());

  // Or we can advance the time of day manually, increasing the step size to
  // make the days faster.
  // host.time.advanceSunTime(timestep * 1000);

  updateHeatFilter();

  const timeSeconds: f32 = timestep / 1000;
  const heatRate: f32 = 0.02;
  if (heatAmt > 0) {
    overheat += timeSeconds * heatRate * heatAmt;
  } else {
    overheat -= timeSeconds * heatRate;
  }

  if (inWater) {
    overheat -= timeSeconds * heatRate * 5;
  }

  overheat = Math.max(0, Math.min(overheat, 1)) as f32;
  if (overheat >= 1 && heatDamage.tick(timestep)) {
    hearts--;
    host.ui.setRating(0, 0, hearts, 5, "heart", "red");
  }

  if (hearts <= 0) {
    host.map.exit("death", true);
  }

  host.ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
}
