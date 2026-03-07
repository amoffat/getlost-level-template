import type { Player } from "./utils/player";
import type { StoryStateMachine } from "./utils/state";

declare global {
  var player: Player;
  var story: StoryStateMachine;
}

export {};
