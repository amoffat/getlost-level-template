import { transparentIcon } from "@/constants";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "@/editor/common/drag";
import { drawRectSelect } from "@/editor/common/select";
import { fillStroke } from "@/editor/common/strokes";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { store } from "@/store/store";
import { clearUncommittedThunk, setUncommittedObjIdsThunk } from "@/thunks/map";
import { MapObjType, TileGroupInstance } from "@/types/map";
import { Rect, snap } from "@/types/rect";
import { weightedIndex } from "@/utils/rand";
import { subState } from "@/utils/redux";
import { shallowEqual } from "react-redux";
import { exhaustMap, Subject, Subscription } from "rxjs";
import { globals as g } from "../globals";

class Filler implements ClickDragListener {
  private marquee: Rect | null = null;
  private fillObjects$ = new Subject<void>();
  private subscription: Subscription;

  constructor() {
    // Set up the RxJS pipeline to serialize fillObjects calls exhaustMap will
    // drop new emissions while the previous async operation is still running
    this.subscription = this.fillObjects$
      .pipe(exhaustMap(() => this._fillObjects()))
      .subscribe();
  }

  destroy() {
    this.subscription.unsubscribe();
    this.fillObjects$.complete();
  }

  pointerDown(_e: PointerEventData) {
    this.clear();
  }

  clear() {
    this.marquee = null;
    g.rectSelect.clear();
    store.dispatch(clearUncommittedThunk());
  }

  pointerUp(_e: PointerEventData) {
    const state = store.getState();
    const mode = mapSelectors.selectMode(state);
    if (mode !== "fill") return;

    store.dispatch(
      mapActions.setToolOptions({
        tool: "fill",
        options: { bounds: this.marquee },
      })
    );
  }

  pointerDrag(e: PointerEventData) {
    const state = store.getState();
    const mode = mapSelectors.selectMode(state);
    if (mode !== "fill") return;

    const gridSize = state.mapEditor.grid.size;
    this.marquee = snap(e.hitbox, gridSize);

    this.drawMarquee();
  }

  drawMarquee() {
    if (!this.marquee) return;

    const state = store.getState();
    drawRectSelect({
      gfx: g.rectSelect,
      rect: this.marquee,
      zoom: state.mapEditor.zoomPan.zoom,
      stroke: fillStroke,
      fill: null,
    });
  }

  fillObjects() {
    this.fillObjects$.next();
  }

  private async _fillObjects() {
    const bounds = this.marquee;
    if (!bounds) return;

    const state = store.getState();
    const fillOpts = state.mapEditor.toolOptions.fill;
    const cands = fillOpts.candidates;
    if (cands.length === 0) return;

    const clumpAmt = fillOpts.clump;
    const gridSize = state.mapEditor.grid.size;
    const baseProbs = cands.map((cand) => cand.prob);
    const layer = state.mapEditor.layers.active;
    const toAdd: TileGroupInstance[] = [];

    // Track which candidate was chosen at each position for neighbor lookups
    const placedCandidates = new Map<string, number>();

    for (let y = bounds.y; y < bounds.y + bounds.height; y += gridSize.y) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += gridSize.x) {
        const adjustedProbs = this.calculateClumpedProbs(
          baseProbs,
          x,
          y,
          gridSize,
          placedCandidates,
          clumpAmt
        );

        const idx = weightedIndex(adjustedProbs);
        const cand = cands[idx];
        const tmpl = cand.tg;

        if (tmpl.id === transparentIcon) continue;

        // Record this placement for neighbor influence
        const key = `${x},${y}`;
        placedCandidates.set(key, idx);

        const id = crypto.randomUUID();
        toAdd.push({
          id,
          type: MapObjType.TileGroupInstance,
          x,
          y,
          tsObjId: tmpl.id,
          imageId: tmpl.imageId,
          tilesetId: tmpl.tilesetId,
          z: y + tmpl.pos.height,
          layer,
          width: tmpl.pos.width,
          height: tmpl.pos.height,
        });
      }
    }

    await store.dispatch(setUncommittedObjIdsThunk(toAdd)).unwrap();
  }

  private calculateClumpedProbs(
    baseProbs: number[],
    x: number,
    y: number,
    gridSize: { x: number; y: number },
    placedCandidates: Map<string, number>,
    clumpAmt: number
  ): number[] {
    if (clumpAmt === 0) return baseProbs;

    // Check neighbors (left and above)
    const neighbors: number[] = [];
    const leftKey = `${x - gridSize.x},${y}`;
    const aboveKey = `${x},${y - gridSize.y}`;

    if (placedCandidates.has(leftKey)) {
      neighbors.push(placedCandidates.get(leftKey)!);
    }
    if (placedCandidates.has(aboveKey)) {
      neighbors.push(placedCandidates.get(aboveKey)!);
    }

    if (neighbors.length === 0) return baseProbs;

    // Create adjusted probabilities that favor neighbors
    const adjustedProbs = baseProbs.map((prob, idx) => {
      const neighborBonus = neighbors.filter((n) => n === idx).length;
      // Add bonus proportional to clumpAmt and how many neighbors match
      return prob * (1 + neighborBonus * clumpAmt);
    });

    return adjustedProbs;
  }
}

export function setupFill({ cd }: { cd: ClickDragger }) {
  const fill = new Filler();
  cd.addListener(fill);

  subState(
    [(state) => state.mapEditor.toolOptions.fill],
    (fillOpts) => {
      if (fillOpts.bounds === null) {
        fill.clear();
      } else {
        fill.fillObjects();
      }
    },
    shallowEqual
  );

  subState([(state) => state.mapEditor.zoomPan.zoom], () => {
    fill.drawMarquee();
  });

  subState([(state) => state.mapEditor.selectedTool], (tool) => {
    if (tool !== "fill") {
      fill.clear();
    }
  });
}
