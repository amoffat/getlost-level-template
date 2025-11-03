import { actions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { MapObj, MapObjType, TileGroupInstance } from "@/types/map";
import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Vector } from "@/vec";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { globals as g } from "../globals";

const desiredMode: Mode = "set-gateway";

export class Gateway implements ClickDragListener {
  constructor(protected spatialIndex: SpatialIndex<MapObj>) {}

  public pointerUp(_e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== desiredMode) return;

    this.instantiatePlacable();
  }

  public pointerDown(_e: PointerEventData): void {}

  public pointerMove(e: PointerEventData): void {
    const state = store.getState();
    const mode = selectors.selectMode(state);
    if (mode !== desiredMode) return;

    if (!g.placableSprite) return;

    const gridSnap = state.mapEditor.grid.size;
    const rawPos = e.localPos;
    let finalPos: Vector = rawPos;
    const snap = state.mapEditor.grid.snap;
    if (snap) {
      finalPos = {
        x: Math.floor(rawPos.x / gridSnap) * gridSnap,
        y: Math.floor(rawPos.y / gridSnap) * gridSnap,
      };
    } else {
      finalPos = {
        x: Math.round(rawPos.x),
        y: Math.round(rawPos.y),
      };
    }

    const z = finalPos.y + g.placableSprite.height;
    g.placableOutline.position = finalPos;
    g.placableContainer.position = finalPos;
    g.placableContainer.zIndex = z;
  }

  protected instantiatePlacable(): void {
    if (!g.placableSprite) return;

    const state = store.getState();
    const ms = state.mapEditor;

    const pos = g.placableContainer.position;
    const layer = MapLayerName.Places;

    const place = ms.place;
    const obj = place.obj! as TileGroupTemplate;
    const id = crypto.randomUUID();

    const tgi: TileGroupInstance = {
      id,
      type: MapObjType.TileGroupInstance,
      x: pos.x,
      y: pos.y,
      tileId: obj.id,
      tilesetId: obj.tilesetId,
      frame: obj.pos,
      flipX: place.flipX,
      z: 0,
      layer,
    };

    store.dispatch(actions.addOne(tgi));
  }
}

export function setupGateway({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger;
  spatialIndex: SpatialIndex<MapObj>;
}) {
  cd.addListener(new Gateway(spatialIndex));
}
