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
}

export interface ClickDragListener {
  pointerDown: (e: PointerEventData) => void;
  pointerUp: (e: PointerEventData) => void;
  pointerDrag: (e: PointerEventData) => void;
}

export class ClickDragger {
  private stage: P.Container;
  private container: P.Container;

  private dragStart: Vec2 | null = null;
  private dragEnd: Vec2 | null = null;
  private listeners: ClickDragListener[] = [];
  private clickedTarget: P.Container | null = null;
  private moved = false;

  constructor({
    stage,
    container,
  }: {
    stage: P.Container;
    container: P.Container;
  }) {
    this.stage = stage;
    this.container = container;

    stage.addEventListener("pointermove", (e) => {
      if (!this.dragStart) return;

      this.dragEnd = Vec2.fromPoint(e.getLocalPosition(container));
      const globalStart = Vec2.fromPoint(container.toGlobal(this.dragStart));
      const globalEnd = Vec2.fromPoint(container.toGlobal(this.dragEnd));

      // Important that we do this in screen space, so that zoom doesn't affect
      // the drag threshold.
      const travelDist = globalStart.distanceTo(globalEnd);
      if (travelDist < MOVE_THRESHOLD) return;
      this.moved = true;

      const ev: PointerEventData = {
        localPos: this.dragEnd,
        hitbox: this.makeHitbox(),
        over: this.hoverObject(e),
        clickedTarget: this.clickedTarget,
        moved: this.moved,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      for (const listener of this.listeners) {
        listener.pointerDrag(ev);
      }
    });

    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragStart = Vec2.fromPoint(e.getLocalPosition(container));
      this.dragEnd = null;
      this.moved = false;

      const clickedTarget = this.hoverObject(e);
      this.clickedTarget = clickedTarget;

      const ev: PointerEventData = {
        localPos: Vec2.fromPoint(e.getLocalPosition(container)),
        hitbox: { ul: { x: 0, y: 0 }, br: { x: 0, y: 0 } },
        over: clickedTarget,
        clickedTarget,
        moved: this.moved,
        pagePos: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.listeners.forEach((listener) => listener.pointerDown(ev));
    });

    stage.addEventListener("pointerup", (e) => {
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

  private hoverObject(e: P.FederatedEvent) {
    const el = e.target;
    const isOverObject = el && el !== this.container && el !== this.stage;
    const hovering = isOverObject ? el : null;
    return hovering;
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
