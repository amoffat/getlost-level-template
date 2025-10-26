import { actions, selectors as tilesetSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { SpatialIndex } from "@/types/spatial";
import { TilesetObject } from "@/types/tilegroup";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { pressedKeys } from "../keys";

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

    if (hits.length > 0) {
      store.dispatch(actions.addManySelected(hits));
      store.dispatch(actions.addCandAnimFrame(hits[0]));
    }
  }

  private get addToSelection(): boolean {
    return pressedKeys["Control"] ?? false;
  }
}

export function setupFrameSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<TilesetObject>;
}) {
  cd.addListener(new FrameSelector(spatialIndex));
}
