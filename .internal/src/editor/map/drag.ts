import { Rect } from "@/types/rect";
import { Vec2, Vector } from "@/vec";
import * as P from "pixi.js";

const MOVE_THRESHOLD = 10;

export interface PointerEventData {
  localPos: Vec2;
  pagePos: Vector;
  clickedTarget: P.Container | null;
  hitbox: Rect;
  over: P.Container | null;
  moved: boolean;
  globalMoveVector: Vec2;
  localMoveVector: Vec2;
}

export interface ClickDragListener {
  pointerDown: (e: PointerEventData) => void;
  pointerUp: (e: PointerEventData) => void;
  pointerDrag: (e: PointerEventData) => void;
}

export class ClickDragger {
  private readonly app: P.Application;
  public readonly container: P.Container;

  private dragStart: Vec2 | null = null;
  private dragEnd: Vec2 | null = null;
  private listeners: ClickDragListener[] = [];
  private clickedTarget: P.Container | null = null;
  private moved = false;

  constructor({
    app,
    container,
  }: {
    app: P.Application;
    container: P.Container;
  }) {
    this.app = app;
    this.container = container;

    app.stage.addEventListener("pointermove", (e) => {
      if (!this.dragStart) return;

      this.dragEnd = Vec2.fromPoint(e.getLocalPosition(container));

      if (this.globalMoveVector.magnitude < MOVE_THRESHOLD && !this.moved)
        return;
      this.moved = true;

      const ev: PointerEventData = {
        localPos: this.dragEnd,
        hitbox: this.makeHitbox(),
        over: this.hoverObject(e),
        clickedTarget: this.clickedTarget,
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      for (const listener of this.listeners) {
        listener.pointerDrag(ev);
      }
    });

    app.stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragStart = Vec2.fromPoint(e.getLocalPosition(container));
      this.dragEnd = Vec2.fromPoint(e.getLocalPosition(container));
      this.moved = false;

      const clickedTarget = this.hoverObject(e);
      this.clickedTarget = clickedTarget;

      const ev: PointerEventData = {
        localPos: Vec2.fromPoint(e.getLocalPosition(container)),
        hitbox: this.makeHitbox(),
        over: clickedTarget,
        clickedTarget,
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.listeners.forEach((listener) => listener.pointerDown(ev));
    });

    app.stage.addEventListener("pointerup", (e) => {
      const localPos = Vec2.fromPoint(e.getLocalPosition(container));
      if (!this.dragStart) {
        this.dragStart = Vec2.fromPoint(localPos);
      }
      this.dragEnd = Vec2.fromPoint(localPos);

      const ev: PointerEventData = {
        localPos,
        hitbox: this.makeHitbox(),
        over: this.hoverObject(e),
        clickedTarget: this.clickedTarget,
        moved: this.moved,
        globalMoveVector: this.globalMoveVector,
        localMoveVector: this.localMoveVector,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.listeners.forEach((listener) => listener.pointerUp(ev));
      this.moved = false;
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
    const pos = this.container.toLocal(globalPos);
    return pos;
  }

  private hoverObject(e: P.FederatedEvent) {
    const el = e.target;
    const isOverObject = el && el !== this.container && el !== this.app.stage;
    const hovering = isOverObject ? el : null;
    return hovering;
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
    const globalStart = Vec2.fromPoint(this.container.toGlobal(this.dragStart));
    const globalEnd = Vec2.fromPoint(this.container.toGlobal(this.dragEnd));
    return globalEnd.subbed(globalStart);
  }

  private makeHitbox(): Rect {
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
