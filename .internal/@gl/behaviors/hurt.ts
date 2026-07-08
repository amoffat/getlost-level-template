import { AlphaOscillateAction } from "@gl/actions/AlphaAction";
import { ColorFadeAction } from "@gl/actions/ColorAction";
import { DashAction, DashPosAction } from "@gl/actions/DashAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { SpriteChangeAction } from "@gl/actions/SpriteChangeAction";
import { CharAction } from "@gl/types/character";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import { Easings, type EasingFunction } from "@gl/utils/easing";
import type { Vec2 } from "@gl/utils/vec2";

type HurtOpts =
  | { mode: "impulse"; dir: Vec2 }
  | { mode: "pos"; target: Vec2; easing?: EasingFunction };

export function hurt(char: Character, opts: HurtOpts): Behavior<Character> {
  const hurtDuration = 500;
  const colorDuration = hurtDuration * 0.25;
  const alphaDuration = hurtDuration - colorDuration;

  const dashAction =
    opts.mode === "pos"
      ? new DashPosAction({
          target: opts.target,
          duration: hurtDuration,
          easing: opts.easing,
        })
      : new DashAction({ direction: opts.dir });

  const behavior = new Behavior("hurt", char);
  behavior
    .then(
      new SpriteChangeAction({
        action: CharAction.HurtLeft,
        duration: hurtDuration,
      }),
    )
    .also(dashAction)
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
