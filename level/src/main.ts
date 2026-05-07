import * as filters from "@gl/api/filters";
import * as object from "@gl/api/object";
import * as story from "@gl/api/story";

import { setSunEvent } from "@gl/api/time";
import { ColorMatrixFilter } from "@gl/filters/colormatrix";
import { SunEvent } from "@gl/types/time";
import { Vec2 } from "@gl/utils/vec2";

let tiltShift!: number;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters, or setting up event handlers.
 */
export async function init(): Promise<void> {
  tiltShift = filters.addTiltShift(0.0);
  setSunEvent(SunEvent.SolarNoon, 0);

  const colors = new ColorMatrixFilter();
  colors.matrix = [
    // R output: warm, lifted, slightly fed by green/blue
    1.08, 0.1, 0.08, 0.0, 0.035,

    // G output: softened, peach/gold support
    0.06, 0.94, 0.06, 0.0, 0.025,

    // B output: reduced contrast, lavender haze rather than pure blue
    0.1, 0.04, 0.88, 0.0, 0.04,

    // A output
    0.0, 0.0, 0.0, 1.0, 0.0,
  ];

  const bloom = filters.addBloom({
    brightness: 0.5,
    threshold: 0.3,
    bloomScale: 0.55,
    blur: 5,
  });

  events.on({
    type: "collision",
    filter: { character: "player", collider: "Jim", enter: true },
    callback: ({ direction }) => {
      const hurtDirection = Vec2.fromVector(direction).normalize().flip();
      player.hurt(hurtDirection);

      if (story.isSatisfied("talk-to-wizard")) {
        story.satisfy("destroy-portal", true);
      } else {
        story.bulkSatisfy({ "help-wizard": true, "find-spells": true });
      }
      // prepare("abcd", true);
    },
  });

  events.on({
    type: "collision",
    filter: { character: "player", collider: "barn", enter: true },
    callback: ({ direction }) => {
      if (story.isSatisfied("find-spells")) {
        const hurtDirection = Vec2.fromVector(direction).normalize().flip();
        player.hurt(hurtDirection);
        story.satisfy("talk-to-wizard", true);
      }
    },
  });

  events.on({
    type: "state-change",
    callback: ({ ready, satisfied }) => {
      //
    },
  });
}

/**
 * This function is called when the game receives a movement event. Use it to
 * adjust the player's position *in that direction.* In other words, this
 * function does not receive an absolute position, but a direction to move the
 * player.
 *
 * @param x The x *direction* to move the player.
 * @param y The y *direction* to move the player.
 */
export function movePlayer(dir: Vec2): void {
  player.direction.x = dir.x;
  player.direction.y = dir.y;
}

/**
 * Called every frame. Use this to update your level in real-time. Timestep is
 * in milliseconds.
 *
 * @param timestep The time since the last tick in milliseconds.
 * @param paused Whether the game is currently paused or not.
 */
export async function tick(timestep: number, paused: boolean) {
  filters.setTiltShiftY(tiltShift, player.pos.y - 10);
  object.translate("e397031f-ec42-4a1d-8146-50dd937baf1a", {
    x: -0.02 * timestep,
    y: 0,
  });
  // setSunTime(Date.now());
}
