import {
  EdgeName,
  EdgeSig,
  EdgeSignatures,
  MatchQuery,
  matchTile,
  pickDirectionWeights,
} from "@/editor/map/utils/autotile";
import { globals as appG } from "@/globals";
import { actions as mapEdActions, selectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isTileGroupInstance, MapObj, TileGroupInstance } from "@/types/map";
import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { createRafThrottled } from "@/utils/throttle";
import { Vector } from "@/vec";
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
      }
    );

    this.posDispatcher = createRafThrottled((pos: Vector) => {
      store.dispatch(mapEdActions.setGridPos(pos));
    });

    this.candidateDispatcher = createRafThrottled(
      (cands: TileGroupTemplate[]) => {
        store.dispatch(
          mapEdActions.setToolOptions({
            tool: "autotiler",
            options: { candidates: cands },
          })
        );
      }
    );
  }
  public pointerUp(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "autotiler") return;

    this.instantiatePlacable("overwrite");
    this.paint = false;
  }

  public pointerDown(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== "autotiler") return;

    this.paint = true;
    this.dragSessionIndex.clear();
    this.tempSpatialIndex.clear();
  }

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode !== "autotiler") return;

    // Determine the snapped center tile position from the cursor using gridSnap
    const step = state.mapEditor.grid.size;
    const baseX = Math.floor(e.localPos.x / step.x) * step.x;
    const baseY = Math.floor(e.localPos.y / step.y) * step.y;

    const freezeCand = state.mapEditor.toolOptions["autotiler"].gridPosFreeze;
    if (freezeCand) {
      // If the candidate freeze position is set and matches our current grid pos,
      // then don't do anything more here.
      if (freezeCand.x === baseX && freezeCand.y === baseY) {
        return;
      } else {
        store.dispatch(
          mapEdActions.setToolOptions({
            tool: "autotiler",
            options: { gridPosFreeze: null },
          })
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
    const gridChanged = curGridPos?.x !== baseX || curGridPos?.y !== baseY;
    if (gridChanged) this.posDispatcher({ x: baseX, y: baseY });

    const resolveEdgeSig = function (
      x: number,
      y: number
    ): EdgeSignatures | undefined {
      const t = topByPos.get(`${x},${y}`);
      if (t) {
        const sigs = appG.tileEdgeSigs.get(t.tsObjId);
        return sigs;
      }
    };

    const topSigs = resolveEdgeSig(baseX, baseY - step.y);
    const bottomSigs = resolveEdgeSig(baseX, baseY + step.y);
    const leftSigs = resolveEdgeSig(baseX - step.x, baseY);
    const rightSigs = resolveEdgeSig(baseX + step.x, baseY);

    const hasAdjacentTiles = topSigs || bottomSigs || leftSigs || rightSigs;
    // No adjacent tiles to match against, so we can't do anything here.
    if (!hasAdjacentTiles) {
      if (curObj) this.placeDispatcher(null);
      this.candidateDispatcher([]);
      return;
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
    const underPos = topByPos.get(`${baseX},${baseY}`);
    const filtered = matches.filter((m) => m.id !== underPos?.tsObjId);
    const match = filtered[0];
    const excludedUnder = !!underPos && filtered.length !== matches.length;

    if (match) {
      const obj = tsSelectors.templateFromInstanceId(
        state,
        match.id
      ) as TileGroupTemplate;

      let orderedCandidates: TileGroupTemplate[] = [];
      if (excludedUnder) {
        // If we excluded the tile under the cursor, then include it at the end
        // of the candidates list
        orderedCandidates = [
          ...filtered.map((m) => m.id),
          underPos!.tsObjId,
        ].map(
          (id) =>
            tsSelectors.templateFromInstanceId(state, id)! as TileGroupTemplate
        );
      } else {
        orderedCandidates = matches.map(
          (m) =>
            tsSelectors.templateFromInstanceId(
              state,
              m.id
            )! as TileGroupTemplate
        );
      }
      this.candidateDispatcher(orderedCandidates);

      if (obj.id !== curObj?.id) {
        this.placeDispatcher(obj);
      }

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

export function setupAutotiler({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Painter(spatialIndex));
}
