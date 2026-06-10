import { PropertyValueInfo } from "@/components/PropertyValue";
import { selectors as localeSelectors } from "@/slices/locale";
import { selectors as mapEditorSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import {
  ExtractProps,
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isMapObjFromTileset,
  isPickupObj,
  MapObj,
  MapObjProps,
  SpeakableMapObj,
} from "@/types/map";
import { resolveLocaleText } from "@/utils/locale";
import { HasId } from "@/utils/misc";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";

const createRootSelector = createSelector.withTypes<RootState>();

/**
 * Resolves the template props for a map object instance, looking up the
 * appropriate template from either the map editor templates or the tileset
 * editor, depending on the object type.
 *
 * Unlike `resolveTemplateProps` in utils/map.ts, this function accepts
 * explicit state and can therefore be used as a dependency inside reselect
 * selectors.
 */
export function selectTemplateProps<
  TInstance extends MapObj,
  TProps extends ExtractProps<TInstance> = ExtractProps<TInstance> & HasId,
>(state: RootState, obj: TInstance): TProps | null {
  if (isLightInstance(obj)) {
    return state.mapEditor.templates.lights as unknown as TProps;
  } else if (isEntranceObj(obj)) {
    return state.mapEditor.templates.entryGateways as unknown as TProps;
  } else if (isExitObj(obj)) {
    return state.mapEditor.templates.exitGateways as unknown as TProps;
  } else if (isPickupObj(obj)) {
    return state.mapEditor.templates.pickups as unknown as TProps;
  } else if (isMapObjFromTileset(obj)) {
    return tsSelectors.templateFromId(state, obj.tsObjId) as unknown as TProps;
  }
  return null;
}

/**
 * Resolves the effective value of a single property on a map object instance,
 * falling back to the template value if the instance has no override.
 */
export function selectPropertyValue<
  TInstance extends MapObj,
  K extends keyof ExtractProps<TInstance>,
>(state: RootState, obj: TInstance, propName: K): ExtractProps<TInstance>[K] {
  type TProps = ExtractProps<TInstance>;
  const instanceValue = obj[propName as unknown as keyof TInstance];

  if (instanceValue === undefined) {
    const tmpl = selectTemplateProps(state, obj) as MapObjProps | null;
    const templateValue = tmpl
      ? tmpl[propName as unknown as keyof MapObjProps]
      : undefined;
    return templateValue as TProps[K];
  }

  return instanceValue as unknown as TProps[K];
}

export const speakers = createRootSelector(
  [
    mapEditorSelectors.selectSpeakers,
    localeSelectors.selectDefaultEntries,
    (state: RootState) => state,
    (state: RootState) => state.mapEditor.templates,
    (state: RootState) => state.tilesetEditor,
  ],
  (potentialSpeakers, defaultEntries, state): [string, SpeakableMapObj][] => {
    return potentialSpeakers
      .filter((obj) => {
        const talkable = selectPropertyValue(state, obj, "talkable");
        return talkable;
      })
      .filter((obj) => {
        const nameKey = selectPropertyValue(state, obj, "nameKey");
        return !!nameKey;
      })
      .map((obj) => {
        const nameKey = selectPropertyValue(state, obj, "nameKey");
        const name = resolveLocaleText({
          key: nameKey,
          primaryEntries: defaultEntries,
        });
        return [name, obj];
      });
  },
);

/**
 * Collects property values from a list of instance objects and their templates.
 * Returns a mapping of property names to their values across all objects.
 *
 * The return type is narrowed to only the keys in `propertyNames`, so accessing
 * a property that was not collected is a compile-time error.
 *
 * @param objs - Array of instance objects
 * @param propertyNames - Array of property names to collect
 * @returns Object mapping property names to arrays of PropertyValueInfo
 */
export function collectPropertyValues<
  TInstance extends MapObj,
  K extends keyof (ExtractProps<TInstance> & TInstance),
>(state: RootState, objs: TInstance[], propertyNames: K[]) {
  type TProps = ExtractProps<TInstance> & TInstance;
  const collected = {} as { [P in K]: PropertyValueInfo<TProps[P]>[] };

  // Initialize arrays for each property
  for (const propName of propertyNames) {
    collected[propName] = [];
  }

  // Collect values from each object and its template
  objs.forEach((obj) => {
    const tmpl = selectTemplateProps(state, obj) as MapObjProps | null;

    for (const propName of propertyNames) {
      const valuesArray = collected[propName];
      const instanceValue = obj[propName as keyof TInstance];

      if (instanceValue === undefined) {
        const templateValue = tmpl
          ? tmpl[propName as keyof MapObjProps]
          : undefined;
        valuesArray.push({
          key: obj.id,
          value: templateValue as TProps[typeof propName],
          scope: "template",
        });
      } else {
        valuesArray.push({
          key: obj.id,
          value: instanceValue as TProps[typeof propName],
          scope: "instance",
        });
      }
    }
  });

  return collected;
}
