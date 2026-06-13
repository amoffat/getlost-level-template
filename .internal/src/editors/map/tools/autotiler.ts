import {
  EdgeName,
  EdgeSig,
  EdgeSignatures,
  MatchQuery,
  matchTile,
  pickDirectionWeights,
} from "@/editors/map/utils/autotile";
import { globals as appG } from "@/globals";
import { actions as mapEdActions } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { isTileGroupInstance, MapObj, TileGroupInstance } from "@/types/map";
import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { createRafThrottled } from "@/utils/throttle";
import { Vector2 } from "@/vec";
import { MapLayerName } from "../../../types/layer";
import { ClickDragger, PointerEventData } from "../../common/drag";
import { globals as g } from "../globals";
import { Placer } from "./place";

class Painter extends Placer {
  placeDispatcher: ReturnType<typeof createRafThrottled>;
  posDispatcher: ReturnType<typeof createRafThrottled>;
  candidateDispatcher: ReturnType<typeof createRafThrottled>;

  constructor(spatialIndex: SpatialIndex<MapObj>) {
    super(spatialIndex);

    this.placeDispatcher = createRafThrottled(
      (obj: TileGroupTemplate | null) => {
        store.dispatch(mapEdActions.setPlace(obj));
      },
    );

    this.posDispatcher = createRafThrottled((pos: Vector2) => {
      store.dispatch(mapEdActions.setGridPos(pos));
    });

    this.candidateDispatcher = createRafThrottled(
      (cands: TileGroupTemplate[]) => {
        store.dispatch(
          mapEdActions.setToolOptions({
            tool: "autotiler",
            options: { candidates: cands },
          }),
        );
      },
    );
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["autotiler"]);
  }

  public pointerUp(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    this.instantiatePlacable("overwrite");
    this.paint = false;
    return true;
  }

  public pointerDown(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    this.paint = true;
    this.dragSessionIndex.clear();
    this.tempSpatialIndex.clear();
    return true;
  }

  public pointerMove(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;
    const state = store.getState();

    // Determine the snapped center tile position from the cursor using gridSnap
    const step = state.mapEditor.grid.size;
    const snappedX = Math.floor(e.localPos.x / step.x) * step.x;
    const snappedY = Math.floor(e.localPos.y / step.y) * step.y;

    const freezeCand = state.mapEditor.toolOptions["autotiler"].gridPosFreeze;
    if (freezeCand) {
      // If the candidate freeze position is set and matches our current grid pos,
      // then don't do anything more here.
      if (freezeCand.x === snappedX && freezeCand.y === snappedY) {
        return false;
      } else {
        store.dispatch(
          mapEdActions.setToolOptions({
            tool: "autotiler",
            options: { gridPosFreeze: null },
          }),
        );
      }
    }

    const curObj = state.mapEditor.place.obj;

    // Get all of the tiles in a 9x9 area around the cursor
    const searchBounds = {
      minX: e.localPos.x - 1.5 * step.x,
      minY: e.localPos.y - 1.5 * step.y,
      maxX: e.localPos.x + 1.5 * step.x,
      maxY: e.localPos.y + 1.5 * step.y,
    };
    // Collect all overlapping ground tile group instances, but for each (x,y) stack
    // keep only the topmost (highest z). This preserves one representative per tile position.
    const topByPos = new Map<string, TileGroupInstance>();
    for (const obj of this.spatialIndex.getObjects({ pos: searchBounds })) {
      if (obj.layer !== MapLayerName.Ground) continue;
      if (!isTileGroupInstance(obj)) continue;

      const key = `${obj.x},${obj.y}`;
      const existing = topByPos.get(key);
      if (!existing || obj.z > existing.z) {
        topByPos.set(key, obj);
      }
    }

    const curGridPos = state.mapEditor.grid.curPos;
    const gridChanged =
      curGridPos?.x !== snappedX || curGridPos?.y !== snappedY;
    if (gridChanged) this.posDispatcher({ x: snappedX, y: snappedY });

    const resolveEdgeSig = function (
      x: number,
      y: number,
    ): EdgeSignatures | undefined {
      const t = topByPos.get(`${x},${y}`);
      if (t) {
        const sigs = appG.tileEdgeSigs.get(t.tsObjId);
        return sigs;
      }
    };

    const topSigs = resolveEdgeSig(snappedX, snappedY - step.y);
    const bottomSigs = resolveEdgeSig(snappedX, snappedY + step.y);
    const leftSigs = resolveEdgeSig(snappedX - step.x, snappedY);
    const rightSigs = resolveEdgeSig(snappedX + step.x, snappedY);

    const hasAdjacentTiles = topSigs || bottomSigs || leftSigs || rightSigs;
    // No adjacent tiles to match against, so we can't do anything here.
    if (!hasAdjacentTiles) {
      if (curObj) this.placeDispatcher(null);
      this.candidateDispatcher([]);
      return false;
    }

    const dirWeights = pickDirectionWeights(e.localPos, step);

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

    const matches = matchTile(query, appG.tileEdgeSigs, { topN: 5 });

    // Exclude the tile currently under the cursor from consideration
    const underPos = topByPos.get(`${snappedX},${snappedY}`);
    const filtered = matches.filter((m) => m.id !== underPos?.tsObjId);
    const match = filtered[0];
    const excludedUnder = !!underPos && filtered.length !== matches.length;

    if (match) {
      const obj = tsSelectors.templateFromId(
        state,
        match.id,
      ) as TileGroupTemplate;

      let orderedCandidates: TileGroupTemplate[];
      if (excludedUnder) {
        // If we excluded the tile under the cursor, then include it at the end
        // of the candidates list
        orderedCandidates = [
          ...filtered.map((m) => m.id),
          underPos!.tsObjId,
        ].map(
          (id) => tsSelectors.templateFromId(state, id)! as TileGroupTemplate,
        );
      } else {
        orderedCandidates = matches.map(
          (m) => tsSelectors.templateFromId(state, m.id)! as TileGroupTemplate,
        );
      }
      this.candidateDispatcher(orderedCandidates);

      if (obj.id !== curObj?.id) {
        this.placeDispatcher(obj);
      }

      g.placableOutline.position = { x: snappedX, y: snappedY };
      g.placableContainer.position = { x: snappedX, y: snappedY };
    }

    return true;
  }

  public pointerDrag(_e: PointerEventData): boolean {
    if (this.paint) {
      this.instantiatePlacable("overwrite");
      return true;
    }
    return false;
  }
}

export function setupAutotiler({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Painter(spatialIndex));
}
