import {
  EdgeName,
  EdgeSig,
  EdgeSignatures,
  MatchQuery,
  matchTile,
  pickDirectionWeights,
} from "@/editor/tileset/autotile";
import { globals as appG } from "@/globals";
import { selectors as mapSelectors } from "@/slices/map";
import { actions as mapEdActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, TileGroupInstance } from "@/types/editor";
import { SpatialIndex } from "@/types/spatial";
import { ClickDragger, PointerEventData } from "../../common/drag";
import { globals as g } from "../globals";
import { Placer } from "./place";

class Painter extends Placer {
  public pointerUp(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "magic-paint") return;

    this.instantiatePlacable("overwrite");
    this.paint = false;
  }

  public pointerDown(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "magic-paint") return;

    this.paint = true;
    this.dragSessionIndex.clear();
    this.tempSpatialIndex.clear();
  }

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode !== "magic-paint") return;

    // Get all of the tiles in a 9x9 area around the cursor
    const searchBounds = {
      minX: e.localPos.x - 1.5 * g.gridSnap,
      minY: e.localPos.y - 1.5 * g.gridSnap,
      maxX: e.localPos.x + 1.5 * g.gridSnap,
      maxY: e.localPos.y + 1.5 * g.gridSnap,
    };
    // Collect all overlapping ground tile group instances, but for each (x,y) stack
    // keep only the topmost (highest z). This preserves one representative per tile position.
    const topByPos = new Map<string, TileGroupInstance>();
    for (const hit of this.spatialIndex.search(searchBounds)) {
      const obj = mapSelectors.selectById(state, hit.id);
      if (!obj) continue;
      if (obj.layer !== "ground") continue;
      if (!isTileGroupInstance(obj)) continue;
      const key = `${obj.x},${obj.y}`; // Positions are snapped when placed, so exact match is fine.
      const existing = topByPos.get(key);
      if (!existing || obj.z > existing.z) {
        topByPos.set(key, obj);
      }
    }
    // Determine the snapped center tile position from the cursor using gridSnap
    const baseX = Math.floor(e.localPos.x / g.gridSnap) * g.gridSnap;
    const baseY = Math.floor(e.localPos.y / g.gridSnap) * g.gridSnap;
    const step = g.gridSnap;

    // store.dispatch(mapEdActions.setGridPos({ x: baseX, y: baseY }));

    const resolveEdgeSig = function (
      x: number,
      y: number
    ): EdgeSignatures | undefined {
      const t = topByPos.get(`${x},${y}`);
      if (t) {
        const sigs = appG.tileEdgeSigs.get(t.tileId);
        return sigs;
      }
    };

    const topSigs = resolveEdgeSig(baseX, baseY - step);
    const bottomSigs = resolveEdgeSig(baseX, baseY + step);
    const leftSigs = resolveEdgeSig(baseX - step, baseY);
    const rightSigs = resolveEdgeSig(baseX + step, baseY);

    const dirWeights = pickDirectionWeights(e.localPos, g.gridSnap);

    // Compose the signatures that we want to match against at our position,
    // by looking at the adjacent tiles that are touching us.
    const matchSigs: Record<EdgeName, EdgeSig | null> = {
      top: topSigs ? topSigs.bottom : null,
      bottom: bottomSigs ? bottomSigs.top : null,
      left: leftSigs ? leftSigs.right : null,
      right: rightSigs ? rightSigs.left : null,
    };

    const query: MatchQuery = {
      top: { sig: matchSigs.top, weight: dirWeights.top },
      bottom: { sig: matchSigs.bottom, weight: dirWeights.bottom },
      left: { sig: matchSigs.left, weight: dirWeights.left },
      right: { sig: matchSigs.right, weight: dirWeights.right },
    };

    const underPos = topByPos.get(`${baseX},${baseY}`);

    const matches = matchTile(query, appG.tileEdgeSigs, { topN: 5 });
    const match = matches.find((m) => m.id !== underPos?.tileId);
    // const match = matches[0];
    if (match) {
      const obj = appG.tileIdToTileGroup.get(match.id);
      store.dispatch(mapEdActions.setPlace(obj ?? null));

      const z = baseY;
      g.placableOutline.position = { x: baseX, y: baseY };
      g.placableContainer.position = { x: baseX, y: baseY };
      g.placableContainer.zIndex = z;
    }
  }

  public pointerDrag(_e: PointerEventData): void {
    if (this.paint) {
      this.instantiatePlacable("overwrite");
    }
  }
}

export function setupMagicPainter({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex;
}) {
  cd.addListener(new Painter(spatialIndex));
}
