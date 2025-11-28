import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isMapObjFromTileset,
  MapObj,
  MapObjProps,
} from "@/types/map";
import { HasId } from "./misc";

export function resolveTemplate(obj: MapObj): (HasId & MapObjProps) | null {
  const state = store.getState();

  if (isLightInstance(obj)) {
    return state.mapEditor.templates.lights;
  } else if (isEntranceObj(obj)) {
    return state.mapEditor.templates.entryGateways;
  } else if (isExitObj(obj)) {
    return state.mapEditor.templates.exitGateways;
  } else if (isMapObjFromTileset(obj)) {
    return tsSelectors.templateFromInstanceId(state, obj.tsObjId);
  }
  return null;
}
