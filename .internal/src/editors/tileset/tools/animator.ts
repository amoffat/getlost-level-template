import { selectors as tilesetSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  addAnimationFrameThunk,
  clearCandAnimFramesThunk,
} from "@/thunks/tileset";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import { rectToBBox } from "@/utils/spatial";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

class FrameSelector extends ClickDragListener {
  constructor(private spatialIndex: SpatialIndex<TilesetObjectTemplate>) {
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
  spatialIndex: SpatialIndex<TilesetObjectTemplate>;
}) {
  cd.addListener(new FrameSelector(spatialIndex));
}
