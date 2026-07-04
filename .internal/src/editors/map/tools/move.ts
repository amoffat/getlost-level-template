import { Tool } from "@/editors/common/tooldispatch";
import { globals as gApp } from "@/globals";
import { captureEntityChanges, recordTransaction } from "@/history";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isMapObjFromTileset } from "@/types/map";
import { Vector2 } from "@/vec";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

export class Mover extends ClickDragListener<Mode> implements Tool {
  private _moveEnabled = false;
  /** True while freshly-duplicated objects are floating with the cursor,
   * awaiting a click to place them. */
  private _duplicateFloat = false;
  private _cd: ClickDragger<Mode>;
  private startPositions: Map<string, Vector2> = new Map();

  /** Stores the final changes that will be applied to the redux state on
   * pointerUp */
  private lastUpdates: Array<{
    id: string;
    changes: { x: number; y: number; z: number };
  }> = [];

  constructor(cd: ClickDragger<Mode>) {
    super((state) => mapEdSelectors.selectMode(state));
    this._cd = cd;
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["move"]);
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
    this._duplicateFloat = true;
    this._cd.syncDragStart();
  }

  public override pointerDown(e: PointerEventData): boolean {
    // A click while duplicated objects are floating places them. The float only
    // mutated reconciler nodes, so commit those positions to Redux now (which
    // updates the spatial index and selection outlines), then return to select
    // mode.
    if (this._duplicateFloat) {
      const mode = mapEdSelectors.selectMode(store.getState());
      if (mode === "duplicate" || mode === "move") {
        this._duplicateFloat = false;
        this._moveEnabled = false;
        this.commitMove();
        this.startPositions.clear();
        store.dispatch(mapEdActions.setMode("select"));
        return true;
      }
      // The float was cancelled (e.g. Escape switched modes); drop the flag and
      // handle this click as a normal pointer down.
      this._duplicateFloat = false;
    }

    // Due to some complex interactions between the select ClickDragListener and
    // this, _moveEnabled can end up true from a previous call to `pointerDown`
    // and not cleared from `pointerUp`. So let's just ensure it is reset here.
    this._moveEnabled = false;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!(mode === "select" || mode === "move")) return false;

    const selIds = new Set(state.mapEditor.selectedIds);
    const shouldMove = e.hoverIds.some((id) => selIds.has(id));

    if (shouldMove || mode === "move") {
      this._moveEnabled = true;
      this.lastUpdates = [];
      return true;
    } else {
      this._moveEnabled = false;
      return false;
    }
  }

  /**
   * Flush the accumulated drag positions to Redux and record an undoable
   * transaction. Dragging only mutates the reconciler nodes, never Redux, so
   * Redux still holds the pre-move positions here — we capture the "before"
   * from it before dispatching the move.
   */
  private commitMove(): void {
    if (this.lastUpdates.length === 0) return;

    const after = this.lastUpdates;
    const ids = after.map((u) => u.id);
    const before = captureEntityChanges(
      store.getState().mapEditor.objects.entities,
      ids,
      ["x", "y", "z"],
    );

    store.dispatch(mapEdActions.updateMany(after));
    store.dispatch(
      recordTransaction("map", {
        label: "Move",
        undo: [mapEdActions.updateMany(before)],
        redo: [mapEdActions.updateMany(after)],
      }),
    );
    this.lastUpdates = [];
  }

  public override pointerUp(_e: PointerEventData): boolean {
    if (!this._moveEnabled) return false;

    this._moveEnabled = false;

    this.commitMove();

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode === "move") {
      store.dispatch(mapEdActions.popMode());
    }

    this.startPositions.clear();
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this._moveEnabled) return false;

    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (mode !== "move") {
      store.dispatch(mapEdActions.pushMode("move"));
      store.dispatch(mapEdActions.setProposedSelection(null));
    }

    const snap = state.mapEditor.grid.snap;
    const defaultSnapSize = state.mapEditor.grid.size;

    const startOffset = e.localMoveVector;
    const updates = [];
    for (const obj of mapEdSelectors.selectedObjs(state)) {
      let startPos = this.startPositions.get(obj.id);
      if (!startPos) {
        startPos = { x: obj.x, y: obj.y };
        this.startPositions.set(obj.id, startPos);
      }

      const newPos: Vector2 = {
        x: Math.round(startPos.x + startOffset.x),
        y: Math.round(startPos.y + startOffset.y),
      };
      if (snap) {
        let gridSnap = defaultSnapSize;
        if (isMapObjFromTileset(obj)) {
          const tmpl = tsSelectors.templateFromId(state, obj.tsObjId);
          gridSnap = tmpl?.gridSize ?? defaultSnapSize;
        }
        newPos.x = Math.floor(newPos.x / gridSnap.x) * gridSnap.x;
        newPos.y = Math.floor(newPos.y / gridSnap.y) * gridSnap.y;
      }

      let z = obj.z;
      if (obj.layer === MapLayerName.Exterior) {
        z = newPos.y;
        if (isMapObjFromTileset(obj)) {
          z = newPos.y + obj.height;
        }
      }

      updates.push({
        id: obj.id,
        changes: {
          x: newPos.x,
          y: newPos.y,
          z,
        },
      });
    }

    this.lastUpdates = updates;
    for (const { id, changes } of updates) {
      const node = gApp.mapEditorReconciler.getNode(id);
      if (node) {
        node.x = changes.x;
        node.y = changes.y;
        node.zIndex = changes.z;
      }
    }
    return true;
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    return "move";
  }
}

export function setupMover(cd: ClickDragger<Mode>): Mover {
  const mover = new Mover(cd);
  cd.addListener(mover);
  return mover;
}
