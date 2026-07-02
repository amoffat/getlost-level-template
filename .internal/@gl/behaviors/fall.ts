import { FallAction } from "@gl/actions/FallAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { SpriteChangeAction } from "@gl/actions/SpriteChangeAction";
import { CharAction } from "@gl/types/character";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import type { Vec2 } from "@gl/utils/vec2";
import { hurt } from "./hurt";

export function fall({
  char,
  dir,
  target,
  sound,
}: {
  char: Character;
  dir: Vec2;
  target: Vec2;
  sound?: string;
}): Behavior<Character> {
  const fallDuration = 1000;

  const behavior = new Behavior("hurt", char);
  behavior
    .then(hurt(char, { mode: "pos", target }))
    .also(
      new SpriteChangeAction({
        action: CharAction.WalkDown,
        duration: fallDuration,
        speed: 8.0,
      }),
    )
    .also(new FallAction({ duration: fallDuration, direction: dir }));

  if (sound) {
    behavior.also(new SoundAction({ key: sound }));
  }
  return behavior;
}
