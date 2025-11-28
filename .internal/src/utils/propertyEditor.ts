import {
  PropertyValueInfo,
  PropertyValueLevel,
} from "@/components/PropertyValue";
import { globals } from "@/globals";
import { actions as mapActions } from "@/slices/mapEditor";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { MapObj, TilesetMapObj } from "@/types/map";
import { resolveTemplate } from "./map";
import { HasId } from "./misc";

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
  TProps extends Record<string, any>,
  // TInstance must have an id, but properties can be optional
  TInstance extends HasId & Partial<TProps>,
>(
  objs: TInstance[],
  resolveTemplate: (obj: TInstance) => TProps | null,
  propertyNames: (keyof TProps)[]
): {
  [P in keyof TProps]: PropertyValueInfo<NonNullable<TInstance[P]>>[];
} {
  const collected = {} as {
    [P in keyof TProps]: PropertyValueInfo<NonNullable<TInstance[P]>>[];
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
        valuesArray.push({
          key: obj.id,
          value: templateValue,
          level: "template",
        });
      } else {
        valuesArray.push({
          key: obj.id,
          value: instanceValue,
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
  TInstance extends MapObj,
  TProps extends Partial<TInstance>,
>({
  level,
  objs,
  props,
  templateUpdate,
}: {
  level: PropertyValueLevel;
  objs: TInstance[];
  props: Partial<TInstance>;
  templateUpdate: (objs: TInstance[], props: Partial<TProps>) => void;
}): void {
  if (level === "template") {
    // Filter out undefined props before passing to templateUpdate. A value may
    // be undefined if we're switching from instance to template level.
    const definedProps = Object.entries(props).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof TProps] = value as any;
      }
      return acc;
    }, {} as Partial<TProps>);

    // Call the provided callback to update templates
    templateUpdate(objs, definedProps);

    // Now unset the instance values so they inherit from the updated templates
    const undefinedProps: Partial<TInstance> = {};
    for (const key of Object.keys(props) as (keyof TInstance)[]) {
      undefinedProps[key] = undefined;
    }

    // Now collect all template IDs from the affected objects
    const allTmplIds = new Set<string>();
    for (const obj of objs) {
      const tmpl = resolveTemplate(obj);
      if (!tmpl) continue;
      allTmplIds.add(tmpl.id);
    }

    const state = store.getState().mapEditor;
    const propsToCheck = Object.entries(props) as [keyof TInstance, any][];

    // Use the template index to efficiently find all objects using those
    // templates and trigger the correct property unsetting.
    const changes: {
      id: string;
      changes: Partial<TInstance>;
    }[] = [];
    for (const tmplId of allTmplIds) {
      const objIds = globals.templateIndex.get(tmplId);
      if (!objIds) continue;

      for (const objId of objIds) {
        const obj = state.objects.entities[objId]! as TInstance;
        const instChanges: Partial<TInstance> = {};

        // This is subtle but very carefully designed. What we need to do is
        // only do an update of an instance's property to undefined if it is
        // already undefined. This seems strange, until you realize that this
        // triggers the map reconciler to re-resolve the property from the
        // template. We don't want to trigger an update if the instance already
        // has an explicit value for that property.
        //
        // There's an extra curveball here, and that is, if the value of the
        // property is already undefined, it means we're switching from
        // instance-level to template-level editing, so we need to explicitly
        // set the instance property to undefined to trigger map reconciler, and
        // also to overwrite the existing instance value.
        for (const [prop, value] of propsToCheck) {
          if (obj[prop] === undefined || value === undefined) {
            instChanges[prop] = undefined;
          }
        }

        if (Object.keys(instChanges).length > 0) {
          changes.push({
            id: objId,
            changes: instChanges,
          });
        }
      }
    }

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
