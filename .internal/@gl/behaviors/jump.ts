import { JumpAction } from "@gl/actions/JumpAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import type { Vec2 } from "@gl/utils/vec2";

export function jump(char: Character, direction: Vec2): Behavior<Character> {
  const behavior = new Behavior("jump", char);
  behavior
    .then(new JumpAction({ direction }))
    .also(new SoundAction({ key: "gl:jump" }));
  return behavior;
}
