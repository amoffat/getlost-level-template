import * as controls from "@gl/api/controls";
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
  // Warm, golden-hour feel: lift reds, soften greens, pull back blues
  colors.tint(1.05, 0.97, 0.9);
  // Slight desaturation for a painterly softness with cross-channel bleed
  colors.saturate(-0.1, true);
  // Lift shadows with a subtle atmospheric haze
  colors.overlay(0.04, 0.03, 0.04, true);

  const bloom = filters.addBloom({
    brightness: 0.5,
    threshold: 0.3,
    bloomScale: 0.55,
    blur: 5,
  });

  events.on({
    type: "collision",
    filter: { charId: "player", colliderId: "Jim", enter: true },
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
    filter: { charId: "player", colliderId: "barn", enter: true },
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

  events.on({
    type: "choice-made",
    filter: { choiceId: "8834ece0-20a2-4189-8fa8-7e136348414b" },
    callback: () => {
      console.log("CHOSE IT");
    },
  });

  events.on({
    type: "sensor",
    filter: { sensorId: "f4620bb5-9056-4fe4-9038-2c44d3f66ea9" },
    callback: ({ enter }) => {
      if (enter) {
        controls.addButton({
          labelKey: "interact",
          slug: "interact2",
          onRelease: () => {
            console.log("BOOM");
          },
        });
      } else {
        controls.removeButton("interact2");
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
