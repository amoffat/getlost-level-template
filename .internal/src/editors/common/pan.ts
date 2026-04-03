import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import { Tool } from "./tooldispatch";

export class Panner implements Tool {
  private _panContainer: P.Container;
  private _onPanningStart?: VoidFunction;
  private _onPanningEnd?: (panPos: Vector2) => void;

  // Panning state
  private _panStartGlobal = { x: 0, y: 0 };
  private _panStartContainer = { x: 0, y: 0 };
  private _panning = false;

  constructor({
    panContainer,
    onPanningStart,
    onPanningEnd,
  }: {
    panContainer: P.Container;
    onPanningStart?: VoidFunction;
    onPanningEnd?: (panPos: Vector2) => void;
  }) {
    this._panContainer = panContainer;
    this._onPanningStart = onPanningStart;
    this._onPanningEnd = onPanningEnd;
  }

  public onPointerDown(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 2) return false;

    this._panStartGlobal = { x: e.global.x, y: e.global.y };
    this._panStartContainer = {
      x: this._panContainer.position.x,
      y: this._panContainer.position.y,
    };
    this._panning = true;
    this._onPanningStart?.();
    return true;
  }

  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    if (!this._panning) return false;
    const dx = e.global.x - this._panStartGlobal.x;
    const dy = e.global.y - this._panStartGlobal.y;
    const totalDx = dx;
    const totalDy = dy;

    // Use setPosition to apply the pan from the start position
    this.setPosition(
      {
        x: this._panStartContainer.x + totalDx,
        y: this._panStartContainer.y + totalDy,
      },
      false, // Don't trigger callbacks during interactive panning
    );
    return true;
  }

  public onPointerUp(_e: P.FederatedPointerEvent): boolean {
    if (!this._panning) return false;
    this._panning = false;

    // Trigger the end callback with final position
    this._onPanningEnd?.(this.getPosition());
    return true;
  }

  /** Release an active pan, e.g. when the pointer leaves the canvas. */
  public release() {
    if (!this._panning) return;
    this._panning = false;
    this._onPanningEnd?.(this.getPosition());
  }

  /**
   * Get the current pan position
   */
  public getPosition(): Vector2 {
    return {
      x: this._panContainer.position.x,
      y: this._panContainer.position.y,
    };
  }

  /**
   * Set the pan position directly
   * @param pos - The new position
   * @param triggerCallbacks - Whether to trigger onPanningEnd callback
   */
  public setPosition(pos: Vector2, triggerCallbacks = true) {
    this._panContainer.position.set(pos.x, pos.y);
    if (triggerCallbacks) {
      this._onPanningEnd?.(pos);
    }
  }

  public getCursor(_e: P.FederatedPointerEvent): string | null {
    return this._panning ? "grabbing" : null;
  }
}

export function setupPanControls({
  panContainer,
  onPanningStart,
  onPanningEnd,
}: {
  panContainer: P.Container;
  onPanningStart?: VoidFunction;
  onPanningEnd?: (panPos: Vector2) => void;
}): Panner {
  return new Panner({
    panContainer,
    onPanningStart,
    onPanningEnd,
  });
}
