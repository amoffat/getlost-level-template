import * as camera from "@gl/api/camera";
import * as filter from "@gl/api/filter";
import * as story from "@gl/api/story";
import * as time from "@gl/api/time";

import { setSunEvent } from "@gl/api/time";
import { fall } from "@gl/behaviors/fall";
import { DoNothingController } from "@gl/controllers/DoNothingController";
import { ColorMatrixFilter } from "@gl/filters/colormatrix";
import { RandomWalk } from "@gl/nav";
import { MutualAttackPlan } from "@gl/nav/MutualAttackPlan";
import { Sound } from "@gl/sound/Sound";
import { CharAction } from "@gl/types/character";
import { SunEvent } from "@gl/types/time";
import { Rating } from "@gl/ui";
import { chars } from "@gl/utils/character";
import { sampleWeighted } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";

let tiltShift!: number;
const fallThresholdX = 354;
let musicAssetId!: number;
let kickRating: Rating | null = null;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters, or setting up event handlers.
 */
export async function init(): Promise<void> {
  tiltShift = filter.addTiltShift(0.06);
  setSunEvent(SunEvent.SolarNoon, 0);

  // const tech = Character.get("e0164411-13f4-4ec8-867a-3b2aba4c2a0f")!;
  // tech.lookAt({ fn: () => player.getPos() });

  const cm = new ColorMatrixFilter();

  // Step 1: Heavily desaturate, but not to full grayscale —
  // leaves just enough chroma for the warm cast to read.
  cm.desaturate(false);
  cm.saturate(0.65, true); // partially restore (since desaturate(-1) is full gray, pull back toward -0.65 net)

  // Step 2: Push a warm bronze/amber tint over the desaturated base.
  // Slightly boosts red/green, suppresses blue — the classic "300" amber grade.
  cm.tint(1.08, 0.95, 0.78, true);

  // Step 3: Punch up contrast hard — crushed blacks, compressed mids.
  cm.contrast(0.55, true);

  // Step 4: Slight brightness pulldown to deepen shadows after the contrast boost.
  // cm.brightness(0.92, true);

  // Step 5: Tiny hue nudge toward amber/orange to kill any residual cool cast.
  cm.hue(-6, true);
  cm.saturate(-0.7, true);

  const leonidas = chars.get("dc8d07ea-de7f-43f3-877b-117476ecb16c")!;
  const wellPos = Vec2.fromVector2({ x: 143, y: 150 });
  const kickSfx = await Sound.load({
    name: "gl:strike",
  });

  const crySprites: Record<string, [number, number]> = {
    "1": [2196, 2315],
    "2": [9676, 3027],
    "3": [15434, 2374],
    "4": [19648, 2671],
    "5": [40662, 1039],
    "6": [47459, 801],
  };
  const cries = await Sound.load({
    name: "8372b9a7-8eaf-5680-96ce-8a34977b30c5",
    sprites: crySprites,
    volume: 0.5,
  });

  const cryKeys = Object.keys(crySprites);
  // Tracks the two most recently played cries so we can down-weight them:
  // [last, secondToLast]. The most recent pick is the least likely to repeat,
  // the one before it the next-least likely.
  const recentCries: string[] = [];

  const persians = chars
    .values()
    .filter((c) => c.tags.has("persian"))
    .toArray();

  const soldiers = chars
    .values()
    .filter((c) => c.tags.has("soldier"))
    .toArray();

  persians.forEach((char) => {
    char.lookAt({
      fn: () => {
        // Point away from the well
        const p = char.getPos();
        return p.subbed(wellPos).add(p);
      },
      whileMoving: true,
    });
  });

  events.on({
    type: "char-collision",
    filter({ charId, enter }) {
      return charId === "player" && enter;
    },
    callback({ otherId, direction }) {
      if (!story.isSatisfied("kick")) return;

      kickSfx.play();
      // Weight each cry equally by default, but strongly down-weight the two
      // most recent picks so the same cry rarely repeats back-to-back.
      const weights = cryKeys.map((key) => {
        if (key === recentCries[0]) return 0.1; // last played: least likely
        if (key === recentCries[1]) return 0.4; // played before that
        return 1;
      });
      const sprite = sampleWeighted(cryKeys, weights) ?? cryKeys[0]!;
      recentCries.unshift(sprite);
      recentCries.length = Math.min(recentCries.length, 2);
      cries.play({ sprite });
      const char = chars.get(otherId)!;
      char.attachController(new DoNothingController());
      const behavior = fall({
        char,
        dir: wellPos.subbed(char.getPos()),
        target: wellPos,
      });
      behavior.onBehaviorEnd(() => {
        char.setAction(CharAction.Idle);
      });
      behavior.perform();
      kickRating!.value++;

      if (kickRating!.value === persians.length) {
        story.satisfy("soldiers-defeated", true);
      }
    },
  });

  events.on({
    type: "state-change",
    filter({ state }) {
      return state === "soldiers-defeated";
    },
    callback({ satisfied }) {
      if (satisfied) {
        time.setWorldSpeed({
          speed: 1,
        });
        setTimeout(() => {
          kickRating!.destroy();
        }, 500);
      }
    },
  });

  events.on({
    type: "state-change",
    filter({ state }) {
      return state === "kick";
    },
    callback({ satisfied }) {
      if (satisfied) {
        // Kick
        setTimeout(() => {
          camera.shake({ magnitude: 10, speed: 20, durationMs: 800 });
          kickSfx.play();
        }, 400);

        // Bullet time
        setTimeout(() => {
          time.setWorldSpeed({
            speed: 0.5,
          });
        }, 750);

        persians.forEach((s) => {
          s.nav.setNavPlan(
            new MutualAttackPlan({
              self: s,
              combatants: soldiers,
              defaultPlan: new RandomWalk({
                maxDistance: 32,
              }),
              flankRadius: 32,
            }),
          );
        });

        kickRating ??= new Rating({
          col: 0,
          row: 0,
          value: 0,
          max: persians.length,
          iconClass: "skull",
          color: "red",
        });
      } else {
        kickRating?.destroy();
        kickRating = null;

        time.setWorldSpeed({
          speed: 1,
        });
      }
    },
  });
}

/**
 * This function is called when the game receives a movement event. Use it to
 * adjust the player's position *in that direction.* In other words, this
 * function does not receive an absolute position, but a direction to move the
 * player.
 *
 * @param dir The *direction* to move the player.
 */
export function movePlayer(dir: Vec2): void {
  player.setControlDirection(dir);
}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 * @param paused Whether the game is currently paused or not.
 */
export async function tick(timestep: number, paused: boolean) {
  filter.setTiltShiftY(tiltShift, player.getPos().y - 10);
}
