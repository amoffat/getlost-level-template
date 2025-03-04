import * as host from "@gl/api/w2h/host";

import { Room } from "@gl/types/room";
import { Player } from "@gl/utils/player";
export { card } from "./card";
export { exits } from "./exits";
export { pickups } from "./pickups";
export { strings } from "./strings";

const log = host.debug.log;

let tsfid!: i32;
let player!: Player;
let music!: i32;

// This function initializes your level. It's called once when the level is
// loaded. Use it to set up your level, like setting the time of day, or adding
// filters.
export function initRoom(): Room {
  player = Player.default();

  const room = new Room();
  tsfid = host.filters.addTiltShift(0.06);

  // const time = Date.UTC(2025, 1, 13, 0, 0, 0, 0);
  // host.time.setSunTime(time);

  music = host.sound.loadSound({
    name: "Musics/17 - Fight.ogg",
    loop: true,
    autoplay: true,
    volume: 0.3,
  });

  return room;
}

export function movePlayer(x: f32, y: f32): void {
  player.direction.x = x;
  player.direction.y = y;
}

// Called when a timer event is triggered.
export function timerEvent(name: string, userData: i32): void {
  log(`Timer event: ${name}, ${userData}`);
}

// Called when an async asset has been loaded.
export function assetLoadedEvent(id: i32): void {}

// When a key is pressed, this function is called. The `slug` is the key that
// was pressed, and `down` is true if the key was pressed down, and false if it
// was released.
export function keyPressEvent(slug: string, down: bool): void {}

export function choiceMadeEvent(textSlug: string, choice: string): void {
  log(`Choice made for ${textSlug}: ${choice}`);
  if (textSlug === "well-body" && choice === "jump-down") {
    host.map.exit("well", true);
  }
}

// When a tile collision event occurs, this function is called. You can use this
// similar to a sensor event, but it's triggered by the collision of a tile.
// Most times you'll probably want to respond to a sensor event instead.
export function tileCollisionEvent(
  tsTileId: i32,
  gid: i32,
  entered: bool,
  column: i32,
  row: i32
): void {
  // log(`Collision event: ${tsTileId}, ${gid}, ${entered} @ ${column}, ${row}`);
}

let sawOasisSign = false;

// Called when a sensor is triggered.
export function sensorEvent(name: string, entered: bool): void {
  log(`Sensor event: ${name}, ${entered}`);
  if (name === "oasis" && entered && !sawOasisSign) {
    host.text.displaySign("oasis-entry-title", "oasis-entry-body");
    sawOasisSign = true;
  } else if (name === "well" && entered) {
    host.text.displayInteraction("well-title", "well-body", [
      "jump-down",
      "step-back",
    ]);
  } else if (name === "exit-east" && entered) {
    host.map.exit("east", false);
  } else if (name === "exit-west" && entered) {
    host.map.exit("west", false);
  } else if (name === "exit-south" && entered) {
    host.map.exit("south", false);
  }
}

// Called when the game is paused, `tickRoom` stops ticking and this function
// starts. Use this to advance things that you want to keep moving while the
// game is paused.
export function pauseTick(timestep: f32): void {}

// Called every frame. Use this to update your level in real-time. Timestep is
// in milliseconds.
export function tickRoom(timestep: f32): void {
  player.tick(timestep);
  host.player.setAction(player.action);
  host.player.setPos(player.pos.x, player.pos.y);
  host.filters.setTiltShiftY(tsfid, player.pos.y - 10);

  // Uncomment this to sync the time of day with the real world.
  // host.time.setSunTime(Date.now());
}
