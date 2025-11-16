import { Vector2 } from "@/vec";
import * as P from "pixi.js";

export class Panner {
  private stage: P.Container;
  private panContainer: P.Container;
  private onPanningStart?: VoidFunction;
  private onPanningEnd?: (panPos: Vector2) => void;

  // Panning state
  private panStartGlobal = { x: 0, y: 0 };
  private panStartContainer = { x: 0, y: 0 };
  private panning = false;

  constructor({
    stage,
    panContainer,
    onPanningStart,
    onPanningEnd,
  }: {
    stage: P.Container;
    panContainer: P.Container;
    onPanningStart?: VoidFunction;
    onPanningEnd?: (panPos: Vector2) => void;
  }) {
    this.stage = stage;
    this.panContainer = panContainer;
    this.onPanningStart = onPanningStart;
    this.onPanningEnd = onPanningEnd;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.stage.on("pointerdown", (e: P.FederatedPointerEvent) => {
      if (e.button !== 2) return;

      this.panStartGlobal = { x: e.global.x, y: e.global.y };
      this.panStartContainer = {
        x: this.panContainer.position.x,
        y: this.panContainer.position.y,
      };
      this.panning = true;
      this.onPanningStart?.();
    });

    this.stage.on("pointermove", (e: P.FederatedPointerEvent) => {
      if (!this.panning) return;
      const dx = e.global.x - this.panStartGlobal.x;
      const dy = e.global.y - this.panStartGlobal.y;
      const totalDx = dx;
      const totalDy = dy;

      // Use setPosition to apply the pan from the start position
      this.setPosition(
        {
          x: this.panStartContainer.x + totalDx,
          y: this.panStartContainer.y + totalDy,
        },
        false // Don't trigger callbacks during interactive panning
      );
    });

    const endPan = (_e: P.FederatedPointerEvent) => {
      if (!this.panning) return;
      this.panning = false;

      // Trigger the end callback with final position
      this.onPanningEnd?.(this.getPosition());
    };

    this.stage.on("pointerup", endPan);
    this.stage.on("pointerupoutside", endPan);
    this.stage.on("pointercancel", endPan);
  }

  /**
   * Get the current pan position
   */
  getPosition(): Vector2 {
    return {
      x: this.panContainer.position.x,
      y: this.panContainer.position.y,
    };
  }

  /**
   * Set the pan position directly
   * @param pos - The new position
   * @param triggerCallbacks - Whether to trigger onPanningEnd callback
   */
  setPosition(pos: Vector2, triggerCallbacks = true) {
    this.panContainer.position.set(pos.x, pos.y);
    if (triggerCallbacks) {
      this.onPanningEnd?.(pos);
    }
  }
}

export function setupPanControls({
  stage,
  panContainer,
  onPanningStart,
  onPanningEnd,
}: {
  stage: P.Container;
  panContainer: P.Container;
  onPanningStart?: VoidFunction;
  onPanningEnd?: (panPos: Vector2) => void;
}): Panner {
  return new Panner({ stage, panContainer, onPanningStart, onPanningEnd });
}
