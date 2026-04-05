import { RootState, store } from "@/store/store";
import { Rect } from "@/types/rect";
import { Vec2, Vector2 } from "@/vec";
import * as P from "pixi.js";
import { Tool } from "./tooldispatch";

const MOVE_THRESHOLD = 10;

export interface PointerEventData {
  localPos: Vec2;
  button?: "left" | "right";
  pagePos: Vector2;
  hitbox: Rect;
  hoverIds: string[];
  moved: boolean;
  globalMoveVector: Vec2;
  localMoveVector: Vec2;
}

export abstract class ClickDragListener<ModeType extends string> {
  private _modeSelector: (state: RootState) => ModeType;

  constructor(modeSelector: (state: RootState) => ModeType) {
    this._modeSelector = modeSelector;
  }

  immediateDrag?: boolean;
  pointerDown?(e: PointerEventData): boolean;
  pointerUp?(e: PointerEventData): boolean;
  pointerDrag?(e: PointerEventData): boolean;
  pointerMove?(e: PointerEventData): boolean;
  getCursor?(e: P.FederatedPointerEvent): string | null;

  // These are modes for which the click dragger will be active, if the
  // `modeMatches` method is used.
  protected abstract get providedModes(): Set<ModeType>;

  protected modeMatches(): boolean {
    const state = store.getState();
    return this.providedModes.has(this._modeSelector(state));
  }
}

export class ClickDragger<ModeType extends string> implements Tool {
  private readonly app: P.Application;
  public readonly container: P.Container;
  private readonly coordsRelativeTo: P.Container;
  private readonly checkPointerOver?: (pos: Vector2) => string[];

  private dragStart: Vec2 | null = null;
  private dragEnd: Vec2 | null = null;
  private listeners: ClickDragListener<ModeType>[] = [];
  private moved = false;

  private _lastActiveListener: ClickDragListener<ModeType> | null = null;

  constructor({
    app,
    container,
    coordsRelativeTo,
    checkPointerOver,
  }: {
    app: P.Application;
    container: P.Container;
    coordsRelativeTo?: P.Container;
    checkPointerOver?: (pos: Vector2) => string[];
  }) {
    this.app = app;
    this.container = container;
    this.coordsRelativeTo = coordsRelativeTo ?? container;
    this.checkPointerOver = checkPointerOver;
  }

  public onPointerDown(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false;
    this.dragStart = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));
    this.dragEnd = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));
    this.moved = false;

    const hoveredIds = this.hoverObject(e);

    const ev: PointerEventData = {
      localPos: Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo)),
      button: e.button === 0 ? "left" : e.button === 2 ? "right" : undefined,
      hitbox: this.makeHitbox(this.dragStart),
      hoverIds: hoveredIds,
      moved: this.moved,
      globalMoveVector: this.globalMoveVector,
      localMoveVector: this.localMoveVector,
      pagePos: {
        x: e.pageX,
        y: e.pageY,
      },
    };

    this._lastActiveListener = null;
    for (const listener of this.listeners) {
      if (listener.pointerDown?.(ev)) {
        this._lastActiveListener = listener;
        break;
      }
    }

    return true;
  }

  public onPointerUp(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false;
    const localPos = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));

    const ev: PointerEventData = {
      localPos,
      button: e.button === 0 ? "left" : e.button === 2 ? "right" : undefined,
      hitbox: this.makeHitbox(localPos),
      hoverIds: this.hoverObject(e),
      moved: this.moved,
      globalMoveVector: this.globalMoveVector,
      localMoveVector: this.localMoveVector,
      pagePos: {
        x: e.pageX,
        y: e.pageY,
      },
    };

    this._lastActiveListener = null;
    for (const listener of this.listeners) {
      if (listener.pointerUp?.(ev)) {
        this._lastActiveListener = listener;
        break;
      }
    }
    this.moved = false;
    this.dragStart = null;
    this.dragEnd = null;
    return true;
  }

  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    this.dragEnd = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));
    const ev: PointerEventData = {
      localPos: this.dragEnd,
      hitbox: this.makeHitbox(this.dragEnd),
      hoverIds: this.hoverObject(e),
      moved: this.moved,
      globalMoveVector: this.globalMoveVector,
      localMoveVector: this.localMoveVector,
      pagePos: {
        x: e.pageX,
        y: e.pageY,
      },
    };
    let handled = false;
    this._lastActiveListener = null;

    for (const listener of this.listeners) {
      if (listener.pointerMove?.(ev)) {
        this._lastActiveListener = listener;
        handled = true;
        break;
      }
    }

    if (this.dragStart) {
      handled = false;
      this._lastActiveListener = null;

      if (this.globalMoveVector.magnitude < MOVE_THRESHOLD && !this.moved) {
        for (const listener of this.listeners) {
          if (listener.immediateDrag) {
            if (listener.pointerDrag?.(ev)) {
              this._lastActiveListener = listener;
              handled = true;
              break;
            }
          }
        }
        return true;
      } else {
        this.moved = true;

        for (const listener of this.listeners) {
          if (listener.pointerDrag?.(ev)) {
            this._lastActiveListener = listener;
            handled = true;
            break;
          }
        }
      }
    }

    return handled;
  }

  public getCursor(e: P.FederatedPointerEvent): string | null {
    if (this._lastActiveListener?.getCursor) {
      return this._lastActiveListener.getCursor(e);
    }
    return null;
  }

  public addListener(listener: ClickDragListener<ModeType>) {
    this.listeners.push(listener);
  }

  public syncDragStart() {
    this.dragStart = Vec2.fromVector(this.currentPointerPos);
  }

  private get currentPointerPos(): Vector2 {
    const globalPos = this.app.renderer.events.pointer.global;
    const pos = this.coordsRelativeTo.toLocal(globalPos);
    return pos;
  }

  private hoverObject(e: P.FederatedPointerEvent): string[] {
    if (this.checkPointerOver) {
      const localPos = e.getLocalPosition(this.coordsRelativeTo);
      return this.checkPointerOver(localPos);
    }

    const el = e.target;
    const isOverObject = el && el !== this.container && el !== this.app.stage;
    const hovering = isOverObject ? el : null;
    return hovering ? [hovering.label] : [];
  }

  private get localMoveVector(): Vec2 {
    if (!this.dragStart || !this.dragEnd) {
      return new Vec2(0, 0);
    }
    return this.dragEnd.subbed(this.dragStart);
  }

  private get globalMoveVector(): Vec2 {
    if (!this.dragStart || !this.dragEnd) {
      return new Vec2(0, 0);
    }
    // Important that we do this in screen space, so that zoom doesn't affect
    // the drag threshold.
    const globalStart = Vec2.fromPoint(
      this.coordsRelativeTo.toGlobal(this.dragStart),
    );
    const globalEnd = Vec2.fromPoint(
      this.coordsRelativeTo.toGlobal(this.dragEnd),
    );
    return globalEnd.subbed(globalStart);
  }

  public makeHitbox(defaultPos: Vec2): Rect {
    if (!this.dragStart || !this.dragEnd) {
      return { x: defaultPos.x, y: defaultPos.y, width: 0, height: 0 };
    }

    // This logic ensures that our rect select hitbox can go "negative" correctly
    const left = Math.min(this.dragStart.x, this.dragEnd.x);
    const top = Math.min(this.dragStart.y, this.dragEnd.y);
    const right = Math.max(this.dragStart.x, this.dragEnd.x);
    const bottom = Math.max(this.dragStart.y, this.dragEnd.y);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }
}
