import { LayerName } from "@/editor/collision/types/layer";
import { colliderFill } from "@/editor/common/strokes";
import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { BoxObj, MapObj, MapObjType } from "@/types/map";
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

  constructor(protected spatialIndex: SpatialIndex<MapObj>) {
    this.gfx = new P.Graphics();
    g.layerContainers[LayerName.Meta].addChild(this.gfx);
  }

  public pointerUp(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "add-collider") return;

    this.paint = false;

    const rect = e.snappedHitbox;

    const obj: BoxObj = {
      id: crypto.randomUUID(),
      type: MapObjType.BoxCollider,
      x: rect.x,
      y: rect.y,
      z: 0,
      width: rect.width,
      height: rect.height,
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

  public pointerMove(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode === "add-collider") {
      //
    }
  }

  public pointerDrag(e: PointerEventData): void {
    if (this.paint) {
      this.gfx.clear();

      this.gfx
        .rect(e.snappedHitbox.x, e.snappedHitbox.y, e.snappedHitbox.width, e.snappedHitbox.height)
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
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Collider(spatialIndex));
}
