import * as char from "@gl/api/w2h/char";
import * as controls from "@gl/api/w2h/controls";
import * as filters from "@gl/api/w2h/filters";
import * as lights from "@gl/api/w2h/lights";
import * as log from "@gl/api/w2h/log";
import * as map from "@gl/api/w2h/map";
import * as markers from "@gl/api/w2h/markers";
import * as pickup from "@gl/api/w2h/pickup";
import * as sensors from "@gl/api/w2h/sensors";
import * as sound from "@gl/api/w2h/sound";
import * as time from "@gl/api/w2h/time";
import * as ui from "@gl/api/w2h/ui";

import { type Vector } from "@gl/api/types/vector";
import { addTiltShift } from "@gl/api/w2h/filters";
import { ColorMatrixFilter } from "@gl/filters/colormatrix";
import { getSunEventName, SunEvent } from "@gl/types/time";
import { Character } from "@gl/utils/character";
import { Delay } from "@gl/utils/delay";
import { Vec2 } from "@gl/utils/la/vec2";
import {
  FollowPlan,
  NavPlan,
  PatrolPlan,
  PatrolRandom,
  PatrolRandomDetours,
  RandomThenAttackPlan,
  RandomWalk,
  StationaryPlan,
} from "@gl/utils/navigation";
import { Player } from "@gl/utils/player";
import { createHeatFilter, RippleFilter } from "@gl/utils/ripple";
import { loadMusic } from "@gl/utils/sound";
import { isDay, isNight, prevSunEvent } from "@gl/utils/time";
import { Waypoint } from "@gl/utils/waypoint";

export { card } from "./card";
export { entrances, exits } from "./gateways";
export { markers } from "./markers";
export { pickups } from "./pickups";

let tsfid!: number;
let player!: Player;
let dayMusic!: number;
const dayMusicVolume: number = 0.3;
let nightMusic!: number;
const nightMusicVolume: number = 0.5;
let mazeMusic!: number;
const mazeMusicVolume: number = 0.4;
let inMaze: boolean = false;
let hearts: number = 5;
let maxHearts: number = 5;
const overheatColor = "red";
let nighttime: boolean = false;
let overheat: number = 0.0;
let heatRate: number = 0.005;
let inWater: boolean = false;
const healingPool = new Delay(200, 1000, true);
const heatDamage = new Delay(3000, 0, true);
const guardAttack = new Delay(2000, 1000, true);
let guardShouldAttack: boolean = false;
let guardIsAttacking: boolean = false;
let takingDamage: boolean = false;
let damagingChar: string = "";
let heatFilter!: RippleFilter;
let colorMatrix!: ColorMatrixFilter;
let heatAmt: number = 0.0;
let defaultGuardPlan!: NavPlan;
let mainGuard!: Character;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters.
 */
export async function init(): Promise<void> {
  player = new Player();
  Character.initAll();

  mainGuard = Character.get("main-guard");

  const chicken1 = Character.get("chicken1");
  chicken1.setMoveSound("chicken");
  chicken1.startWalkMomentum = 0;
  chicken1.endWalkMomentum = 0;
  chicken1.setNavPlan(new RandomWalk(32, 100, 2000));

  const chicken2 = Character.get("chicken2");
  chicken2.setMoveSound("chicken");
  chicken2.startWalkMomentum = 0;
  chicken2.endWalkMomentum = 0;
  chicken2.setNavPlan(new RandomWalk(32, 100, 2000));

  defaultGuardPlan = StationaryPlan.fromWaypoint("guard-post");

  const nazar = Character.get("nazar");
  nazar.speed = 0.3;
  nazar.setNavPlan(
    new PatrolRandom([
      Waypoint.fromName("well", 3000),
      Waypoint.fromName("nazar-house", 3000),
      Waypoint.fromName("tarek-house", 3000),
      Waypoint.fromName("city-square", 3000),
      Waypoint.fromName("gate", 3000),
      Waypoint.fromName("amina-house", 3000),
      Waypoint.fromName("omar-house", 3000),
    ])
  );

  const knight = Character.get("knight");
  knight.setMoveSound("armor", 1.3, true);
  knight.speed = 0.6;
  const knightPatrol = new PatrolPlan([
    Waypoint.fromName("city-square", 2000),
    Waypoint.fromName("exit-west", 2000),
    Waypoint.fromName("well", 2000),
    Waypoint.fromName("city-square", 2000),
    Waypoint.fromName("south-guard-post", 2000),
  ]);
  knight.setNavPlan(knightPatrol);

  const jailer = Character.get("jailer");
  jailer.setMoveSound("armor", 1.3, true);
  jailer.speed = 0.6;
  const jailerPatrol = new PatrolPlan([
    Waypoint.fromName("jail-patrol-1", 2000),
    Waypoint.fromName("jail-patrol-2", 2000),
    Waypoint.fromName("jail-patrol-3", 2000),
  ]);
  jailer.setNavPlan(jailerPatrol);

  const kidPlan = new PatrolRandomDetours(
    [
      Waypoint.fromName("oasis"),
      Waypoint.fromName("maze-entrance"),
      Waypoint.fromName("fruit-stand"),
      Waypoint.fromName("well"),
      Waypoint.fromName("city-square"),
      Waypoint.fromName("omar-house"),
    ],
    32
  );
  const kid = Character.get("omar");
  kid.setNavPlan(kidPlan);

  const dog = Character.get("dog");
  dog.setMoveSound("bark", 1.5);
  dog.speed = 1.5;
  dog.setNavPlan(new FollowPlan(kid, 10, 20, 200));

  for (let i = 1; i <= 5; i++) {
    const snake = Character.get(`snake${i}`);
    // snake.setMoveSound("snake");
    snake.speed = 2.0;
    snake.startWalkMomentum = 0;
    snake.endWalkMomentum = 0;
    const navPlan = new RandomThenAttackPlan(player, 32, 70);
    navPlan.name = snake.name;
    snake.setNavPlan(navPlan);
  }

  heatFilter = createHeatFilter();
  colorMatrix = new ColorMatrixFilter();
  colorMatrix.hot();

  tsfid = addTiltShift(0.06);

  heatFilter.influence = heatAmt;
  colorMatrix.influence = heatAmt;

  /**
   * You can set a fixed time for the level like this.
   * Be sure to comment out the setSunTime call in `tickRoom` if you do this.
   */
  // time.setSunEvent(SunEvent.SunriseEnd, 0);

  ui.setRating(0, 0, hearts, maxHearts, "heart", "red");
  ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
  updateHeatFilter();

  const hasMap = pickup.query("map");
  pickup.toggle("map", !hasMap);

  const stoleFruit = markers.query("stole-fruit", false);
  sensors.toggleSensor("fruit", !stoleFruit);

  dayMusic = await loadMusic("Musics/restricted/farm1", dayMusicVolume);
  nightMusic = await loadMusic("Musics/music-night", nightMusicVolume);
  mazeMusic = await loadMusic(
    "Musics/restricted/digital-descent",
    mazeMusicVolume
  );

  const ev = time.getSunEvent();
  sound.playSound({
    assetId: isNight(ev) ? nightMusic : dayMusic,
    spriteId: -1,
  });
}

/**
 * Sets the heat fx (ripple and color grading) based on the time of day.
 */
function updateHeatFilter(): void {
  const curSunEvent = time.getSunEvent();
  heatAmt = 0;
  if (curSunEvent === SunEvent.GoldenHourEnd) {
    heatAmt = time.getSunEventProgress();
  } else if (curSunEvent === SunEvent.GoldenHour) {
    heatAmt = 1.0 - time.getSunEventProgress();
  } else if (curSunEvent === SunEvent.SolarNoon) {
    heatAmt = 1.0;
  }
  heatFilter.influence = heatAmt;
  colorMatrix.influence = heatAmt;
}

function getDamageDir(name: string): Vec2 {
  const char = Character.get(name);
  if (!char) return Vec2.zero();
  const dir = char.pos.subbed(player.pos).normalize();
  return dir;
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
export function movePlayer(x: number, y: number): void {
  player.direction.x = x;
  player.direction.y = y;
}

/**
 * Called when a user-created timer is triggered.
 *
 * @param id The id of the timer created by `timer.start`.
 */
export function timerEvent(id: number): void {
  log.info(`Timer event: ${id}`);
}

/**
 * Called when an async asset has been loaded.
 *
 * @param id The ID of the asset that was loaded.
 */
export function assetLoadedEvent(id: number): void {}

/**
 * Called when an async event is triggered. This is usually used for things like
 * animations being finished. This is to support the fact that AS doesn't yet
 * support promises or async/await.
 *
 * @param id The async event id.
 */
export function asyncEvent(id: number): void {}

/**
 * Called when a pickup event occurs.
 *
 * @param slug The slug of the pickup that was interacted with.
 * @param took Whether the player took the pickup or not.
 */
export function pickupEvent(slug: string, took: boolean): void {
  log.info(`Pickup event: ${slug}, ${took}`);
  if (slug === "flame" && took) {
    lights.toggleLight("flame", false);
    sensors.toggleSensor("flame", false);
    char.toggle("flame", false);
  } else if (slug === "fruit" && took) {
    markers.record("stole-fruit", true);
  }
}

/**
 * Called when a user-defined UI button is pressed or released.
 *
 * @param slug The slug of the button that was pressed.
 * @param down Whether the button was pressed down or released.
 */
export function buttonPressEvent(slug: string, down: boolean): void {
  log.info(`Button event: ${slug}, ${down}`);

  // If our dialogue was staged via a `dialogue.stage_<id>` call, then the event
  // may be a press of the "interact" button. This checks for that, and if it
  // is, we'll dispatch to the correct passage.
  if (slug.startsWith("passage/") && down) {
    const passage = slug.split("/")[1]!;
    // dialogue.dispatch(passage);
  }

  if (slug === "fruit-taken" && down) {
    pickup.offerPickup("fruit");
    controls.setButtons([]);
  } else if (slug === "nap" && down) {
    map.exit("nap", false);
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
  tsTileId: number,
  gid: number,
  entered: boolean,
  column: number,
  row: number
): void {
  // log(`Collision event: ${tsTileId}, ${gid}, ${entered} @ ${column}, ${row}`);
}

export function spriteCollisionEvent(
  initiator: string,
  collider: string,
  direction: Vector,
  entered: boolean
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
  log.info(`Timer completed: ${name}`);
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
  entered: boolean
): void {
  if (initiator !== "player") {
    return;
  }

  log.info(
    `Sensor event: '${initiator}' ${
      entered ? "entered" : "left"
    } '${sensorName}'`
  );

  if (sensorName === "exit-east" && entered) {
    map.exit("east", false);
  } else if (sensorName === "exit-west" && entered) {
    map.exit("west", false);
  } else if (sensorName === "exit-south" && entered) {
    map.exit("south", false);
  } else if (sensorName === "water") {
    inWater = entered;
  } else if (sensorName === "nap") {
    if (entered) {
      controls.setButtons([
        {
          label: "nap",
          slug: "nap",
        },
      ]);
    } else {
      controls.setButtons([]);
    }
  } else if (sensorName === "fruit") {
    if (entered) {
      controls.setButtons([
        {
          label: "takeFruit",
          slug: "fruit-taken",
        },
      ]);
    } else {
      controls.setButtons([]);
    }
  } else if (sensorName === "heat-adjust") {
    heatRate = entered ? 0.06 : 0.02;
    inMaze = entered;
    const isDay = !nighttime;

    if (entered) {
      if (isDay) {
        const spec = {
          assetAId: dayMusic,
          assetBId: mazeMusic,
          volumeAStart: dayMusicVolume,
          volumeBEnd: mazeMusicVolume,
        };
        sound.crossfade(spec);
      }
    } else {
      if (isDay) {
        const spec = {
          assetAId: mazeMusic,
          assetBId: dayMusic,
          volumeAStart: mazeMusicVolume,
          volumeBEnd: dayMusicVolume,
        };
        sound.crossfade(spec);
      }
    }
  } else if (sensorName.startsWith("snake") && sensorName.endsWith("/hit")) {
    takingDamage = entered;
    if (entered) {
      damagingChar = sensorName.split("/")[0]!;
      const dir = getDamageDir(damagingChar);
      if (player.hurt(dir)) {
        hearts--;
        ui.setRating(0, 0, hearts, maxHearts, "heart", "red");
      }
    }
    // } else if (sensorName === "nazar/talk") {
    //   dialogue.stage_NazarIntro(entered);
    // } else if (sensorName === "omar/talk") {
    //   dialogue.stage_OmarIntro(entered);
    // } else if (sensorName === "tarek/talk") {
    //   dialogue.stage_TarekIntro(entered);
    // } else if (sensorName === "haddad/talk") {
    //   dialogue.stage_HaddadIntro(entered);
    // } else if (sensorName === "guard-gate") {
    //   if (entered) {
    //     dialogue.passage_GuardIntro();
    //   }
    //   if (entered) {
    //     guardShouldAttack = true;
    //     const navPlan = new DefaultThenAttackPlan(defaultGuardPlan, player, 32);
    //     mainGuard.setNavPlan(navPlan, false);
    //   } else {
    //     guardShouldAttack = false;
    //     mainGuard.setNavPlan(defaultGuardPlan);
    //   }
    // } else if (sensorName === "well" && entered) {
    //   dialogue.stage_Well(entered);
  } else if (sensorName === "main-guard/hit" && guardIsAttacking) {
    const dir = getDamageDir("main-guard");
    if (player.hurt(dir)) {
      hearts--;
      ui.setRating(0, 0, hearts, maxHearts, "heart", "red");
    }
    guardIsAttacking = false;
  }
}

/**
 * Called when there's a time event change, for example, from Sunrise to
 * SunriseEnd
 */
export function timeChangedEvent(event: SunEvent): void {
  const lastEvent = prevSunEvent(event);
  log.info(
    `Time changed: ${getSunEventName(lastEvent)} -> ${getSunEventName(event)} `
  );

  const wasDay = isDay(lastEvent);
  nighttime = isNight(event);
  lights.toggleLight("flame", nighttime);
  sensors.toggleSensor("flame", nighttime);
  char.toggle("flame", nighttime);

  for (const light of ["nazar-light", "house-light-1"]) {
    lights.toggleLight(light, nighttime);
  }

  if (nighttime) {
    ui.clearElement(1, 0);
  } else {
    ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
  }

  updateHeatFilter();

  if (event === SunEvent.SunsetStart) {
    const spec = {
      assetAId: dayMusic,
      assetBId: nightMusic,
      volumeAStart: dayMusicVolume,
      volumeBEnd: nightMusicVolume,
    };
    sound.crossfade(spec);
  } else if (event === SunEvent.Dawn) {
    const spec = {
      assetAId: nightMusic,
      assetBId: dayMusic,
      volumeAStart: nightMusicVolume,
      volumeBEnd: dayMusicVolume,
    };
    sound.crossfade(spec);
  }
}

/**
 * Called when the game is paused, `tickRoom` stops ticking and this function
 * starts. Use this to advance things that you want to keep moving while the
 * game is paused.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export function pauseTick(timestep: number): void {
  ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export function tick(timestep: number): void {
  const startHearts = hearts;
  Character.tickAll(timestep);
  filters.setTiltShiftY(tsfid, player.pos.y - 10);

  if (inWater && hearts < maxHearts && healingPool.tick(timestep)) {
    hearts++;
  }

  // This syncs the time of day with the real world.
  // time.setSunTime(Date.now());

  // Or we can advance the time of day manually, increasing the step size to
  // make the days faster.
  // time.advanceSunTime(timestep * 2000);

  updateHeatFilter();

  const timeSeconds = timestep / 1000;
  if (heatAmt > 0) {
    overheat += timeSeconds * heatRate * heatAmt;
  } else {
    overheat -= timeSeconds * heatRate;
  }

  if (inWater) {
    overheat -= timeSeconds * heatRate * 5;
  }

  overheat = Math.max(0, Math.min(overheat, 1));
  if (overheat >= 1 && heatDamage.tick(timestep)) {
    hearts--;
  }

  if (takingDamage) {
    const dir = getDamageDir(damagingChar);
    if (player.hurt(dir)) {
      hearts--;
    }
  }

  if (hearts <= 0) {
    markers.record("died-overheated", false);
    map.exit("death", true);
  }

  ui.setProgressBar(1, 0, "overheat", overheat, overheatColor);
  if (hearts !== startHearts) {
    ui.setRating(0, 0, hearts, maxHearts, "heart", "red");
  }

  if (guardShouldAttack && guardAttack.tick(timestep) && !guardIsAttacking) {
    guardIsAttacking = true;
  }
}
