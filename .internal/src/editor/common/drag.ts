import { Rect } from "@/types/rect";
import { Vec2, Vector } from "@/vec";
import * as P from "pixi.js";

const MOVE_THRESHOLD = 10;

export interface PointerEventData {
  localPos: Vec2;
  button?: "left" | "right";
  pagePos: Vector;
  hitbox: Rect;
  hoverIds: string[];
  moved: boolean;
  globalMoveVector: Vec2;
  localMoveVector: Vec2;
}

export interface ClickDragListener {
  immediateDrag?: boolean;
  pointerDown?: (e: PointerEventData) => void;
  pointerUp?: (e: PointerEventData) => void;
  pointerDrag?: (e: PointerEventData) => void;
  pointerMove?: (e: PointerEventData) => void;
}

export class ClickDragger {
  private readonly app: P.Application;
  public readonly container: P.Container;
  private readonly coordsRelativeTo: P.Container;
  private readonly checkPointerOver?: (pos: Vector) => string[];

  private dragStart: Vec2 | null = null;
  private dragEnd: Vec2 | null = null;
  private listeners: ClickDragListener[] = [];
  private moved = false;

  constructor({
    app,
    container,
    coordsRelativeTo,
    checkPointerOver,
  }: {
    app: P.Application;
    container: P.Container;
    coordsRelativeTo?: P.Container;
    checkPointerOver?: (pos: Vector) => string[];
  }) {
    this.app = app;
    this.container = container;
    this.coordsRelativeTo = coordsRelativeTo ?? container;
    this.checkPointerOver = checkPointerOver;

    container.addEventListener("pointermove", (e) => {
      this.dragEnd = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));
      const ev: PointerEventData = {
        localPos: this.dragEnd,
        hitbox: this.makeHitbox(),
        hoverIds: this.hoverObject(e),
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };

      for (const listener of this.listeners) {
        listener.pointerMove?.(ev);
      }

      if (this.dragStart) {
        if (this.globalMoveVector.magnitude < MOVE_THRESHOLD && !this.moved) {
          for (const listener of this.listeners) {
            if (listener.immediateDrag) {
              listener.pointerDrag?.(ev);
            }
          }
          return;
        } else {
          this.moved = true;

          for (const listener of this.listeners) {
            listener.pointerDrag?.(ev);
          }
        }
      }
    });

    container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragStart = Vec2.fromPoint(
        e.getLocalPosition(this.coordsRelativeTo)
      );
      this.dragEnd = Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo));
      this.moved = false;

      const hoveredIds = this.hoverObject(e);

      const ev: PointerEventData = {
        localPos: Vec2.fromPoint(e.getLocalPosition(this.coordsRelativeTo)),
        button: e.button === 0 ? "left" : e.button === 2 ? "right" : undefined,
        hitbox: this.makeHitbox(),
        hoverIds: hoveredIds,
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.listeners.forEach((listener) => listener.pointerDown?.(ev));
    });

    container.addEventListener("pointerup", (e) => {
      const localPos = Vec2.fromPoint(
        e.getLocalPosition(this.coordsRelativeTo)
      );

      const ev: PointerEventData = {
        localPos,
        button: e.button === 0 ? "left" : e.button === 2 ? "right" : undefined,
        hitbox: this.makeHitbox(),
        hoverIds: this.hoverObject(e),
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.listeners.forEach((listener) => listener.pointerUp?.(ev));
      this.moved = false;
      this.dragStart = null;
      this.dragEnd = null;
    });
  }

  public addListener(listener: ClickDragListener) {
    this.listeners.push(listener);
  }

  public syncDragStart() {
    this.dragStart = Vec2.fromVector(this.currentPointerPos);
  }

  private get currentPointerPos(): Vector {
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
      this.coordsRelativeTo.toGlobal(this.dragStart)
    );
    const globalEnd = Vec2.fromPoint(
      this.coordsRelativeTo.toGlobal(this.dragEnd)
    );
    return globalEnd.subbed(globalStart);
  }

  public makeHitbox(): Rect {
    if (!this.dragStart || !this.dragEnd) {
      return { ul: { x: 0, y: 0 }, br: { x: 0, y: 0 } };
    }

    // This logic ensures that our rect select hitbox can go "negative" correctly
    const left = Math.min(this.dragStart.x, this.dragEnd.x);
    const top = Math.min(this.dragStart.y, this.dragEnd.y);
    const right = Math.max(this.dragStart.x, this.dragEnd.x);
    const bottom = Math.max(this.dragStart.y, this.dragEnd.y);
    const minPos = { x: left, y: top };
    const maxPos = { x: right, y: bottom };
    return { ul: minPos, br: maxPos };
  }
}
