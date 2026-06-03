import { FadeInAction, FadeOutAction } from "@gl/actions/AlphaAction";
import { SoundAction } from "@gl/actions/SoundAction";
import { WavyAction } from "@gl/actions/WavyAction";
import { Behavior } from "@gl/utils/behavior";
import type { Character } from "@gl/utils/character";
import { Easings } from "@gl/utils/easing";

export function showhide({
  char,
  show,
  durationMs = 3000,
}: {
  char: Character;
  show: boolean;
  durationMs?: number;
}): Behavior<Character> {
  const behavior = new Behavior("showhide", char);
  behavior.then(
    new WavyAction({
      durationMs,
      params: {
        frequency: 20,
        strength: 0.05,
        speed: 0.1,
      },
    }),
  );

  if (show) {
    behavior.also(
      new FadeInAction({
        durationMs,
        easing: Easings.easeOutQuad,
      }),
    );
  } else {
    behavior.also(
      new FadeOutAction({
        durationMs,
        easing: Easings.easeOutQuad,
      }),
    );
  }

  behavior.also(
    new SoundAction({
      key: "gl:magic-noise",
      volume: 0.5,
      durationMs: durationMs - 700,
      fadeOutMs: 1000,
    }),
  );

  return behavior;
}
