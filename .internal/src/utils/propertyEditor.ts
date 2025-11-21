import {
  PropertyValueInfo,
  PropertyValueLevel,
} from "@/components/PropertyValue";
import { actions as mapActions } from "@/slices/mapEditor";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { TilesetMapObj } from "@/types/map";

export interface HasId {
  id: string;
}

/**
 * Collects property values from a list of instance objects and their templates.
 * Returns a mapping of property names to their values across all objects.
 *
 * @param objs - Array of instance objects
 * @param resolveTemplate - Function that resolves an instance to its template (or null)
 * @param propertyNames - Array of property names to collect
 * @returns Object mapping property names to arrays of PropertyValueInfo
 */
export function collectPropertyValues<
  K extends PropertyKey,
  TInstance extends HasId & Partial<Record<K, any>>,
  TTemplate extends Partial<HasId & Record<K, any>> | null,
>(
  objs: TInstance[],
  resolveTemplate: (obj: TInstance) => TTemplate | null,
  propertyNames: K[]
): {
  [P in K]: PropertyValueInfo<NonNullable<TInstance[P]>>[];
} {
  const collected = {} as {
    [P in K]: PropertyValueInfo<NonNullable<TInstance[P]>>[];
  };

  // Initialize arrays for each property
  for (const propName of propertyNames) {
    collected[propName] = [];
  }

  // Collect values from each object and its template
  objs.forEach((obj) => {
    const tmpl = resolveTemplate(obj);

    for (const propName of propertyNames) {
      const valuesArray = collected[propName];
      const instanceValue = obj[propName];
      const templateValue = tmpl ? (tmpl as any)[propName] : undefined;

      if (instanceValue === undefined) {
        if (templateValue !== undefined) {
          valuesArray.push({
            sourceId: tmpl!.id ?? "tmpl",
            value: templateValue as NonNullable<TInstance[typeof propName]>,
            level: "template",
          });
        }
      } else {
        valuesArray.push({
          sourceId: obj.id,
          value: instanceValue as NonNullable<TInstance[typeof propName]>,
          level: "instance",
        });
      }
    }
  });

  return collected;
}

/**
 * Updates properties on instance objects and/or their templates.
 *
 * When level is "template":
 * - Calls the templateUpdate callback to update the templates
 * - Unsets the instance values so they inherit from the updated templates
 *
 * When level is "instance":
 * - Updates the instance objects directly
 *
 * @param level - Whether to update at the template or instance level
 * @param objs - Array of instance objects to update
 * @param props - Object containing the properties to update
 * @param templateUpdate - Callback to update templates when level is "template"
 */
export function updateObjectProperties<
  K extends PropertyKey,
  TInstance extends HasId & Partial<Record<K, any>>,
  TTemplate extends Record<K, any> | null,
>(
  level: PropertyValueLevel,
  objs: TInstance[],
  props: Partial<TTemplate>,
  templateUpdate: (objs: TInstance[], props: Partial<TTemplate>) => void
): void {
  if (level === "template") {
    // Filter out undefined props before passing to templateUpdate
    const definedProps = Object.entries(props).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof TInstance] = value as any;
      }
      return acc;
    }, {} as Partial<TInstance>);

    // Call the provided callback to update templates
    templateUpdate(objs, definedProps as Partial<TTemplate>);

    // Now unset the instance values so they inherit from the updated templates
    const undefinedProps: Partial<TInstance> = {};
    for (const key of Object.keys(props) as (keyof TInstance)[]) {
      undefinedProps[key] = undefined;
    }
    const changes = objs.map((obj) => ({
      id: obj.id,
      changes: undefinedProps,
    }));
    store.dispatch(mapActions.updateMany(changes));
  } else {
    // Apply changes directly to the instances
    const changes = objs.map((obj) => ({
      id: obj.id,
      changes: props,
    }));
    store.dispatch(mapActions.updateMany(changes));
  }
}

/**
 * Template update callback for objects with tileset-based templates.
 * Groups objects by tileset and updates their templates in the tileset editor.
 */
export function updateTilesetTemplates<TTemplate extends Record<string, any>>(
  objs: TilesetMapObj[],
  props: Partial<TTemplate>
): void {
  // Object templates may come from different tilesets, so group by tileset ID
  const changesByTs = new Map<string, string[]>();
  for (const obj of objs) {
    if (!changesByTs.has(obj.tilesetId)) {
      changesByTs.set(obj.tilesetId, []);
    }
    changesByTs.get(obj.tilesetId)!.push(obj.tsObjId);
  }

  // Apply the changes to each tileset's template objects
  for (const [tsId, tsObjIds] of changesByTs.entries()) {
    const changes = tsObjIds.map((tsObjId) => ({
      id: tsObjId,
      changes: props,
    }));
    store.dispatch(tsActions.updateManyTilesetObjects({ tsId, changes }));
  }
}
