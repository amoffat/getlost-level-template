import { DashPosAction } from "@gl/actions/DashAction";
import { FallAction } from "@gl/actions/FallAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { SpriteChangeAction } from "@gl/actions/SpriteChangeAction";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import type { Vec2 } from "@gl/utils/vec2";

export function fall({
  char,
  dir,
  target,
  sound,
  durationMs = 1800,
}: {
  char: Character;
  dir: Vec2;
  target: Vec2;
  sound?: string;
  durationMs?: number;
}): Behavior<Character> {
  const behavior = new Behavior("hurt", char);
  behavior
    .then(new DashPosAction({ durationMs: 500, target }))
    .also(
      new SpriteChangeAction({
        action: "WalkDown",
        durationMs,
        speed: 8.0,
      }),
    )
    .also(new FallAction({ durationMs, direction: dir }));

  if (sound) {
    behavior.also(new SoundAction({ key: sound }));
  }
  return behavior;
}
