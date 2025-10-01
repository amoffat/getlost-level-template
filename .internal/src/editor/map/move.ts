import { actions as mapActions, selectors as mapSelectors } from "@/slices/map";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Vector } from "@/vec";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../common/drag";
import { globals as g } from "./globals";

export class Mover implements ClickDragListener {
  private _moveEnabled = false;
  private _cd: ClickDragger;

  constructor(cd: ClickDragger) {
    this._cd = cd;
  }

  /**
   * Forces the mover into "move" mode, as if the user had clicked on a
   * selected object and started dragging it. This is used when the user
   * selects "duplicate" mode, to immediately start moving the duplicated
   * objects.
   *
   * We need to synchronize the drag start position with the current mouse
   * position, so that the move offset is calculated correctly.
   */
  public startDuplicateMove(): void {
    this._moveEnabled = true;
    this._cd.syncDragStart();
  }

  public pointerDown(e: PointerEventData): void {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    const sel = state.mapEditor.selectedObjs;

    if ((sel.ids.length > 0 && e.over) || mode === "move") {
      this._moveEnabled = true;
    } else {
      this._moveEnabled = false;
    }
  }

  public pointerUp(e: PointerEventData): void {
    if (!this._moveEnabled) return;

    this._moveEnabled = false;
    const state = store.getState();
    const sel = state.mapEditor.selectedObjs;

    // Here we're finalizing the positions of all selected objects, to ensure
    // that our selectedObjs.entities data is correct and in sync with the map
    // objects from the `map` slice.
    const updates = [];
    for (const objId of sel.ids) {
      const obj = mapSelectors.selectById(state, objId);
      updates.push({
        id: objId,
        changes: { x: obj.x, y: obj.y },
      });
    }
    store.dispatch(mapEdActions.updateManySelected(updates));
    store.dispatch(mapEdActions.setMode("select"));
  }

  public pointerDrag(e: PointerEventData): void {
    if (!this._moveEnabled) return;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "move") {
      store.dispatch(mapEdActions.setMode("move"));
      store.dispatch(mapEdActions.setProposedSelection(null));
    }

    const snap = state.mapEditor.grid.snap;
    const gridSnap = g.gridSnap;

    const startOffset = e.localMoveVector;
    const sel = state.mapEditor.selectedObjs;
    const updates = [];
    for (const objId of sel.ids) {
      // It is technically wrong to use sel.entities here instead of
      // mapSelectors.selectById, because the position of `obj` is going to be
      // stale, since we're only updating the entities in the `map` slice. But
      // it works, because we're only using the starting position as a base
      // offset.
      //
      // To make the whole thing correct, we sync our selected object positions
      // on "pointerup"
      const obj = sel.entities[objId];
      const newPos: Vector = {
        x: Math.round(obj.x + startOffset.x),
        y: Math.round(obj.y + startOffset.y),
      };
      if (snap) {
        newPos.x = Math.floor(newPos.x / gridSnap) * gridSnap;
        newPos.y = Math.floor(newPos.y / gridSnap) * gridSnap;
      }
      updates.push({
        id: objId,
        changes: { x: newPos.x, y: newPos.y },
      });
    }
    store.dispatch(mapActions.updateMany(updates));
  }
}

export function setupMover(cd: ClickDragger): Mover {
  const mover = new Mover(cd);
  cd.addListener(mover);
  return mover;
}
