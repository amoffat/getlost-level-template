import { setZoom } from "@gl/api/camera";
import * as control from "@gl/api/control";
import * as filter from "@gl/api/filter";
import * as object from "@gl/api/object";
import * as sound from "@gl/api/sound";
import * as story from "@gl/api/story";
import * as zone from "@gl/api/zone";

import { setSunEvent } from "@gl/api/time";
import { showhide } from "@gl/behaviors/showhide";
import { ColorMatrixFilter } from "@gl/filters/colormatrix";
import { SunEvent } from "@gl/types/time";
import { Animator } from "@gl/utils/animation";
import { Character } from "@gl/utils/character";
import { Easings } from "@gl/utils/easing";
import { lerp } from "@gl/utils/math";
import { Vec2 } from "@gl/utils/vec2";

let tiltShift!: number;
const fallThresholdX = 354;
let musicAssetId!: number;

/**
 * This function initializes your level. It's called once when the level is
 * loaded. Use it to set up your level, like setting the time of day, or adding
 * filters, or setting up event handlers.
 */
export async function init(): Promise<void> {
  tiltShift = filter.addTiltShift(0.06);
  setSunEvent(SunEvent.SolarNoon, 0);

  const colors = new ColorMatrixFilter();
  // Warm, golden-hour feel: lift reds, soften greens, pull back blues
  colors.tint(1.05, 0.97, 0.9);
  // Slight desaturation for a painterly softness with cross-channel bleed
  colors.saturate(-0.1, true);
  // Lift shadows with a subtle atmospheric haze
  colors.overlay(0.04, 0.03, 0.04, true);

  // const bloom = filters.addBloom({
  //   brightness: 0.5,
  //   threshold: 0.3,
  //   bloomScale: 0.55,
  //   blur: 5,
  // });

  const sofia = Character.get("6b01ef44-a1a1-4021-aeca-e8b72477937c")!;
  sofia.visibility = false;
  const startZoom = 1;
  const startWind = 0.3;
  const maxWind = 1.2;

  setZoom(startZoom);

  const tech = Character.get("e0164411-13f4-4ec8-867a-3b2aba4c2a0f")!;
  tech.lookAt({ fn: () => player.getPos() });
  sofia.lookAt({ fn: () => player.getPos() });

  // music
  musicAssetId = await sound.loadSound({
    name: "4de57fdcf89087acd6cd7774810bcd6536f1bea1",
    autoplay: true,
    loop: true,
    offsetMs: 12000,
  });

  // wind
  const windAssetId = await sound.loadSound({
    name: "f5d2b9859d82ce4ff9c1676b3a9bde2568350ade",
    autoplay: true,
    loop: true,
    volume: startWind,
  });

  const deathSndId = await sound.loadSound({
    name: "gl:death",
    volume: 0.2,
  });

  const cameraZoomAnim = new Animator({
    durationMs: 5000,
    selfTick: true,
    range: { start: startZoom, end: 0.38 },
    forwardCurve: Easings.easeInOutQuad,
  });

  events.on({
    type: "state-change",
    filter: { state: "think-of-sofia" },
    callbacks: [
      ({ satisfied }) => {
        zone.toggle("849f2b2d-522f-40c0-89da-b9de32fa0de9", satisfied);
      },
      ({ satisfied }) => {
        const behavior = showhide({ char: sofia, show: satisfied });
        behavior.perform();
      },
      ({ satisfied }) => {
        if (satisfied) {
          cameraZoomAnim.addProgressCallback(({ rangeProgress, progress }) => {
            setZoom(rangeProgress!);
            sound.setVolume({
              assetId: windAssetId,
              volume: lerp(startWind, maxWind, progress),
            });
          });
          cameraZoomAnim.play();
        } else {
          sound.setVolume({
            assetId: windAssetId,
            volume: startWind,
          });
          cameraZoomAnim.reverse();
        }
      },
    ],
  });

  events.on({
    type: "sensor",
    filter: {
      sensorId: "f4620bb5-9056-4fe4-9038-2c44d3f66ea9",
      charId: "player",
    },
    callbacks: [
      ({ enter }) => {
        if (enter && story.isReady("jump")) {
          control.addButton({
            labelKey: "jump",
            onRelease: () => {
              player.jump();
            },
          });
        } else {
          control.removeButton("jump");
        }
      },
    ],
  });

  events.on({
    type: "sensor",
    filter: {
      sensorId: "d9177cc0-90ed-4e5b-a103-a89857adc643",
      charId: "player",
    },
    callback: ({ enter }) => {
      if (enter) {
        sound.playSound({ assetId: deathSndId });
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
  if (!player.getFalling()) {
    filter.setTiltShiftY(tiltShift, player.getPos().y - 10);
  }

  // Animate the clouds
  object.translate("e397031f-ec42-4a1d-8146-50dd937baf1a", {
    x: -0.02 * timestep,
    y: 0,
  });
  // setSunTime(Date.now());

  // This accounts for the player, walking on the edge, who walks over the edge
  // (instead of jumping)
  if (player.getPos().x > fallThresholdX && !player.getFalling()) {
    sound.fade({ assetId: musicAssetId, durationMs: 1000 });
    story.satisfy("jump", true);
    player.setFalling({
      enabled: true,
      startVelocity: player.getVelocity().y,
    });
  }
}
