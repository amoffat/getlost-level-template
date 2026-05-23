import { AlphaOscillateAction } from "@gl/actions/AlphaAction";
import { ColorFadeAction } from "@gl/actions/ColorAction";
import { DashAction } from "@gl/actions/DashAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { SpriteChangeAction } from "@gl/actions/SpriteChangeAction";
import { CharAction } from "@gl/types/character";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import { Easings } from "@gl/utils/easing";
import type { Vec2 } from "@gl/utils/vec2";

export function hurt(char: Character, dir: Vec2): Behavior<Character> {
  const hurtDuration = 500;
  const colorDuration = hurtDuration * 0.25;
  const alphaDuration = hurtDuration - colorDuration;

  const behavior = new Behavior("hurt", char);
  behavior
    .then(
      new SpriteChangeAction({
        action: CharAction.HurtLeft,
        duration: hurtDuration,
      }),
    )
    .also(new DashAction({ direction: dir.scaled(150) }))
    .also(new ColorFadeAction({ color: 0xff0000, duration: colorDuration }))
    .also(
      new AlphaOscillateAction({
        durationMs: alphaDuration,
        cycles: Math.round(alphaDuration / 100),
        easing: Easings.easeOutQuad,
      }),
    )
    .also(new SoundAction({ key: "gl:hurt" }));
  return behavior;
}
