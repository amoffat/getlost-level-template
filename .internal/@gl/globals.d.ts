import type { Camera } from "./camera";
import type { EventDispatcher } from "./events";
import type { Player } from "./utils/player";

declare global {
  var player: Player;
  var events: EventDispatcher;
  var camera: Camera;
}

export {};
