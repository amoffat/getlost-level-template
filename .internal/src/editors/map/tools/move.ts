import { Tool } from "@/editors/common/tooldispatch";
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
  private _cd: ClickDragger<Mode>;
  private startPositions: Map<string, Vector2> = new Map();

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
    this._cd.syncDragStart();
  }

  public override pointerDown(e: PointerEventData): boolean {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!(mode === "select" || mode === "move")) return false;

    const selIds = new Set(state.mapEditor.selectedIds);
    const shouldMove = e.hoverIds.some((id) => selIds.has(id));

    if (shouldMove || mode === "move") {
      this._moveEnabled = true;
      return true;
    } else {
      this._moveEnabled = false;
      return false;
    }
  }

  public override pointerUp(_e: PointerEventData): boolean {
    if (!this._moveEnabled) return false;

    this._moveEnabled = false;

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
    store.dispatch(mapEdActions.updateMany(updates));
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
