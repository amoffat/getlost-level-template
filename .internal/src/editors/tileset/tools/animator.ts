import { Tool } from "@/editors/common/tooldispatch";
import { selectors as tilesetSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  addAnimationFrameThunk,
  clearCandAnimFramesThunk,
} from "@/thunks/tileset";
import { SpatialIndex } from "@/types/spatial";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { rectToBBox } from "@/utils/spatial";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

class FrameSelector extends ClickDragListener<Mode> implements Tool {
  constructor(private spatialIndex: SpatialIndex<TemplateObject>) {
    super((state) => tilesetSelectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["animate"]);
  }

  override pointerDown(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

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
    return true;
  }
}

export function setupFrameSelector({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<TemplateObject>;
}) {
  cd.addListener(new FrameSelector(spatialIndex));
}
