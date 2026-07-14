import { drawRectSelect } from "@/editors/common/select";
import { Tool } from "@/editors/common/tooldispatch";
import { selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { retileThunk } from "@/thunks/tileset";
import { snap } from "@/types/rect";
import { Mode } from "@/types/tileset";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { globals as g } from "../globals";

function getGridSize(): Vector2 {
  const state = store.getState();
  const ts = selectors.activeTileset(state);
  if (!ts || ts.composite) {
    return { x: 1, y: 1 };
  }
  return { ...state.tilesetEditor.grid.size };
}

class Reslicer extends ClickDragListener<Mode> implements Tool {
  constructor() {
    super((state) => selectors.selectMode(state));
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["reslice-tiles"]);
  }

  public override pointerDown(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    if (!state.tilesetEditor.activeTilesetId) return false;
    return true;
  }

  override pointerUp(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    const tsId = state.tilesetEditor.activeTilesetId;
    const gridSize = { ...state.tilesetEditor.grid.size };
    const coords = snap(e.hitbox, getGridSize());

    if (tsId && coords.width > 0 && coords.height > 0) {
      store.dispatch(retileThunk({ tsId, gridSize, bounds: coords }));
    }

    g.resliceSelGraphics.visible = false;
    g.resliceSelContainer.setSize(0);
    g.rectSelect.clear();
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    g.resliceSelGraphics.visible = true;
    const c = g.resliceSelContainer;

    const hb = snap(e.hitbox, getGridSize());
    c.position.set(hb.x, hb.y);
    c.width = hb.width;
    c.height = hb.height;

    drawRectSelect({
      gfx: g.rectSelect,
      rect: hb,
      zoom: state.tilesetEditor.activeZoomPan.zoom,
    });

    return true;
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    return "crosshair";
  }
}

export function setupReslicer({ cd }: { cd: ClickDragger<Mode> }) {
  cd.addListener(new Reslicer());
}
