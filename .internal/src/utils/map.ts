import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  ExtractProps,
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isMapObjFromTileset,
  isPickupObj,
  MapObj,
} from "@/types/map";
import { HasId } from "./misc";

export function resolveTemplateProps<
  TInstance extends MapObj,
  TProps extends ExtractProps<TInstance> = ExtractProps<TInstance> & HasId,
>(obj: TInstance): TProps | null {
  const state = store.getState();

  if (isLightInstance(obj)) {
    return state.mapEditor.templates.lights as unknown as TProps;
  } else if (isEntranceObj(obj)) {
    return state.mapEditor.templates.entryGateways as unknown as TProps;
  } else if (isExitObj(obj)) {
    return state.mapEditor.templates.exitGateways as unknown as TProps;
  } else if (isPickupObj(obj)) {
    return state.mapEditor.templates.pickups as unknown as TProps;
  } else if (isMapObjFromTileset(obj)) {
    return tsSelectors.templateFromInstanceId(
      state,
      obj.tsObjId,
    ) as unknown as TProps;
  }
  return null;
}
