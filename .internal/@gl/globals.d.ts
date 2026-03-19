import type { EventDispatcher } from "./events";
import type { Player } from "./utils/player";
import type { StoryStateMachine } from "./utils/state";

declare global {
  var player: Player;
  var story: StoryStateMachine;
  var events: EventDispatcher;
}

export {};
