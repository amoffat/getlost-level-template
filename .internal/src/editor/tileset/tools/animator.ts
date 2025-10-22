import { selectors as tilesetSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isColliderBox, isTileGroupInstance, MapObj } from "@/types/map";
import { Rect } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { TilesetObject } from "@/types/tilegroup";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { drawMaskedOutline } from "../../common/outline";
import { selectStroke } from "../../common/strokes";
import { globals as g } from "../globals";

class FrameSelector implements ClickDragListener {
  constructor(private spatialIndex: SpatialIndex<TilesetObject>) {}

  pointerDown(e: PointerEventData) {
    const state = store.getState();
    const mode = tilesetSelectors.selectMode(state);
    if (mode !== "animate") return;

    const searchBounds = {
      minX: e.hitbox.ul.x,
      minY: e.hitbox.ul.y,
      maxX: e.hitbox.br.x,
      maxY: e.hitbox.br.y,
    };

    const hits = this.spatialIndex.getObjects({
      pos: searchBounds,
    });
  }
}

export function setupFrameSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex;
}) {
  cd.addListener(new FrameSelector(spatialIndex));
}

/**
 * Draws a rectangle selection outline. Called frequently during drag.
 * @param rect Rectangle in map container space
 * @param zoom Current zoom level
 */
function drawRectSelect(rect: Rect, zoom: number) {
  clearRectSelect();
  const gfx = new P.Graphics();

  // This logic ensures that our rect select hitbox can go "negative" correctly
  const left = Math.min(rect.ul.x, rect.br.x);
  const top = Math.min(rect.ul.y, rect.br.y);
  const width = Math.abs(rect.br.x - rect.ul.x);
  const height = Math.abs(rect.br.y - rect.ul.y);

  const strokeWidth = (selectStroke.width ?? 1) * 0.5;
  gfx
    .rect(left, top, width, height)
    .stroke({ ...selectStroke, width: strokeWidth / zoom });
  g.rectSelectOutline.addChild(gfx);
}

function clearRectSelect() {
  g.rectSelectOutline.removeChildren();
}

/**
 * Outlines the given objects.
 * @param objs Objects to outline
 */
export function outlineObjects(objs: MapObj[], zoom: number) {
  clearObjectOutlines();

  const stroke = { ...selectStroke, width: (selectStroke.width ?? 1) / zoom };

  for (const obj of objs) {
    const container = new P.Container();
    g.selectionOutlines.addChild(container);
    container.position.set(obj.x, obj.y);

    if (isTileGroupInstance(obj)) {
      drawMaskedOutline({
        container,
        frame: obj.frame,
        stroke,
      });
    } else if (isColliderBox(obj)) {
      const rect = { ul: { x: 0, y: 0 }, br: { x: obj.width, y: obj.height } };
      drawMaskedOutline({
        container,
        frame: rect,
        stroke,
      });
    }
  }
}

/**
 * Clears all object outlines.
 */
export function clearObjectOutlines() {
  g.selectionOutlines.removeChildren();
}
