import { LayerName } from "@/editor/collision/types/layer";
import { colliderFill } from "@/editor/common/strokes";
import { actions } from "@/slices/map";
import { selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { BoxObj } from "@/types/reconciler";
import { SpatialIndex } from "@/types/spatial";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { globals as g } from "../globals";

export class Collider implements ClickDragListener {
  protected paint = false;
  private gfx: P.Graphics;

  constructor(protected spatialIndex: SpatialIndex) {
    this.gfx = new P.Graphics();
    g.layerContainers[LayerName.Meta].addChild(this.gfx);
  }

  public pointerUp(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "add-collider") return;

    this.paint = false;

    const rect = e.hitbox;
    const pos = {
      x: rect.ul.x,
      y: rect.ul.y,
    };
    const width = rect.br.x - rect.ul.x;
    const height = rect.br.y - rect.ul.y;

    const obj: BoxObj = {
      id: crypto.randomUUID(),
      x: pos.x,
      y: pos.y,
      z: 0,
      width,
      height,
      layer: LayerName.Meta,
    };

    store.dispatch(actions.addOne(obj));
    this.gfx.clear();
  }

  public pointerDown(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "add-collider") return;

    this.paint = true;
  }

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode === "add-collider") {
      //
    }
  }

  public pointerDrag(e: PointerEventData): void {
    if (this.paint) {
      const state = store.getState();
      const ms = state.mapEditor;
      const paintMode = ms.toolOptions.paint.mode;

      this.gfx.clear();

      const width = e.hitbox.br.x - e.hitbox.ul.x;
      const height = e.hitbox.br.y - e.hitbox.ul.y;
      this.gfx
        .rect(e.hitbox.ul.x, e.hitbox.ul.y, width, height)
        .fill(colliderFill);
      // .stroke(colliderStroke);
    }
  }
}

export function setupCollider({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex;
}) {
  cd.addListener(new Collider(spatialIndex));
}
