import { transparentIcon } from "@/constants/tsObjs";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "@/editors/common/drag";
import { drawRectSelect } from "@/editors/common/select";
import { fillStroke } from "@/editors/common/strokes";
import { globals as gApp } from "@/globals";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { store } from "@/store/store";
import { clearUncommittedThunk, setUncommittedObjIdsThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
import { MapObjType, TileGroupInstance } from "@/types/map";
import { Rect, snap } from "@/types/rect";
import { weightedIndex } from "@/utils/rand";
import { subState } from "@/utils/redux";
import { shallowEqual } from "react-redux";
import { concatMap, Subject, Subscription } from "rxjs";
import { globals as g } from "../globals";

class Filler extends ClickDragListener<Mode> {
  private _marquee: Rect | null = null;
  private _fillObjects$ = new Subject<void>();
  private _subscription: Subscription;

  constructor() {
    super((state) => mapSelectors.selectMode(state));

    // Set up the RxJS pipeline to serialize fillObjects calls exhaustMap will
    // drop new emissions while the previous async operation is still running
    this._subscription = this._fillObjects$
      .pipe(concatMap(() => this._fillObjects()))
      .subscribe();
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["fill"]);
  }

  destroy() {
    this._subscription.unsubscribe();
    this._fillObjects$.complete();
  }

  override pointerDown(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    this.clear();
    return true;
  }

  clear() {
    this._marquee = null;
    g.rectSelect.clear();
    store.dispatch(clearUncommittedThunk());
  }

  override pointerUp(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    store.dispatch(
      mapActions.setToolOptions({
        tool: "fill",
        options: { bounds: this._marquee },
      }),
    );
    return true;
  }

  override pointerDrag(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    const gridSize = state.mapEditor.grid.size;
    this._marquee = snap(e.hitbox, gridSize);

    this.drawMarquee();
    return true;
  }

  public drawMarquee() {
    if (!this._marquee) return;

    const state = store.getState();
    drawRectSelect({
      gfx: g.rectSelect,
      rect: this._marquee,
      zoom: state.mapEditor.zoomPan.zoom,
      stroke: fillStroke,
      fill: null,
    });
  }

  public fillObjects() {
    this._fillObjects$.next();
  }

  private async _fillObjects() {
    const bounds = this._marquee;
    if (!bounds) return;

    const state = store.getState();
    const fillOpts = state.mapEditor.toolOptions.fill;
    const cands = fillOpts.candidates;
    if (cands.length === 0) return;

    // Linearize density: sqrt makes the spacing change linearly with the slider
    // fillOpts.density ranges 0-1, we invert it for spacing (0 = sparse, 1 = dense)
    const density = Math.sqrt(1 - fillOpts.density);
    const gridSize = state.mapEditor.grid.size;
    const baseProbs = cands.map((cand) => cand.prob);
    const layer = state.mapEditor.layers.active;
    const toAdd: TileGroupInstance[] = [];

    // Track which candidate was chosen at each position for neighbor lookups
    const placedCandidates = new Map<string, number>();

    // False positive
    // eslint-disable-next-line no-useless-assignment
    let incY = gridSize.y;
    // False positive
    // eslint-disable-next-line no-useless-assignment
    let incX = gridSize.x;

    for (let y = bounds.y; y < bounds.y + bounds.height; y += incY) {
      incY = gridSize.y;
      for (let x = bounds.x; x < bounds.x + bounds.width; x += incX) {
        // A sudden deletion of a candidate with a 1.0 probability can cause
        // weightedIndex to return -1, so we clamp to 0 here.
        const idx = Math.max(weightedIndex(baseProbs), 0);

        const chosen = cands[idx];
        const tmpl = chosen.tg;

        incX = Math.max(tmpl.pos.width * density, gridSize.x);
        incY = Math.max(Math.max(incY, tmpl.pos.height) * density, gridSize.y);

        if (tmpl.id === transparentIcon) continue;

        // Skip if the chosen candidate would overflow the bounds
        if (
          x + tmpl.pos.width > bounds.x + bounds.width ||
          y + tmpl.pos.height > bounds.y + bounds.height
        ) {
          continue;
        }

        // Record this placement for neighbor influence
        const key = `${x},${y}`;
        placedCandidates.set(key, idx);

        const id = crypto.randomUUID();
        toAdd.push({
          flipX: undefined,
          friction: undefined,
          groundOffset: undefined,
          height: tmpl.pos.height,
          hidden: undefined,
          id,
          imageId: tmpl.imageId,
          layer,
          tags: undefined,
          nameKey: undefined,
          talkable: undefined,
          tilesetId: tmpl.tilesetId,
          tint: undefined,
          traction: undefined,
          tsObjId: tmpl.id,
          type: MapObjType.TileGroupInstance,
          walkSound: undefined,
          width: tmpl.pos.width,
          x,
          y,
          z: y + tmpl.pos.height,
          speakerImageId: undefined,
        } satisfies TileGroupInstance);
      }
    }

    await store.dispatch(setUncommittedObjIdsThunk(toAdd)).unwrap();

    // This is critical. Events can flood in while the async thunk is running,
    // and if the map reconciler runs before the new objects are added to the
    // store, it will throw an error since it won't be able to find the objects
    // by id. By flushing the reconciler here, we ensure that any pending
    // reconciler operations are applied before we add the new objects,
    // preventing any reconciliation errors.
    gApp.mapEditorReconciler.flush();
  }
}

export function setupFill({ cd }: { cd: ClickDragger<Mode> }) {
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
    shallowEqual,
  );

  subState([(state) => state.mapEditor.zoomPan.zoom], () => {
    fill.drawMarquee();
  });

  subState([(state) => state.mapEditor.activeTool], (tool) => {
    if (tool !== "fill") {
      fill.clear();
    }
  });
}
