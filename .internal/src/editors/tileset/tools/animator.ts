import { selectors as tilesetSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  addAnimationFrameThunk,
  clearCandAnimFramesThunk,
} from "@/thunks/tileset";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { TemplateObject } from "@/types/tilesetobject";
import { rectToBBox } from "@/utils/spatial";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

class FrameSelector extends ClickDragListener {
  constructor(private spatialIndex: SpatialIndex<TemplateObject>) {
    super();
  }

  override pointerDown(e: PointerEventData) {
    const state = store.getState();
    const mode = tilesetSelectors.selectMode(state);
    if (mode !== "animate") return;

    const searchBounds = rectToBBox(e.hitbox);

    const hits = this.spatialIndex
      .getObjects({
        pos: searchBounds,
      })
      .filter(isTileGroupTemplate);

    if (hits.length > 0) {
      store.dispatch(addAnimationFrameThunk(hits[0]));
    } else {
      store.dispatch(clearCandAnimFramesThunk());
    }
  }
}

export function setupFrameSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<TemplateObject>;
}) {
  cd.addListener(new FrameSelector(spatialIndex));
}
