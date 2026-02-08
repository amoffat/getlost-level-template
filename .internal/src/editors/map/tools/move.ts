import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { isMapObjFromTileset } from "@/types/map";
import { Vector2 } from "@/vec";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";

export class Mover extends ClickDragListener {
  private _moveEnabled = false;
  private _cd: ClickDragger;
  private startPositions: Map<string, Vector2> = new Map();

  constructor(cd: ClickDragger) {
    super();
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

  public override pointerDown(e: PointerEventData): void {
    const state = store.getState();
    const mode = mapEdSelectors.selectMode(state);
    if (!(mode === "select" || mode === "move")) return;

    const selIds = new Set(state.mapEditor.selectedIds);
    const shouldMove = e.hoverIds.some((id) => selIds.has(id));

    if (shouldMove || mode === "move") {
      this._moveEnabled = true;
    } else {
      this._moveEnabled = false;
    }
  }

  public override pointerUp(_e: PointerEventData): void {
    if (!this._moveEnabled) return;

    this._moveEnabled = false;
    store.dispatch(mapEdActions.popMode());
    this.startPositions.clear();
  }

  public override pointerDrag(e: PointerEventData): void {
    if (!this._moveEnabled) return;

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
  }
}

export function setupMover(cd: ClickDragger): Mover {
  const mover = new Mover(cd);
  cd.addListener(mover);
  return mover;
}
