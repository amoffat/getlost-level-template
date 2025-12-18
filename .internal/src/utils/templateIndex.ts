import * as constants from "@/constants";
import {
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isMapObjFromTileset,
  isPickupObj,
  MapObj,
} from "@/types/map";

/**
 * Get the template ID for a map object.
 * Returns the template ID that this object uses, or null if it doesn't use a template.
 */
export function getTemplateId(obj: MapObj): string | null {
  if (isLightInstance(obj)) {
    return constants.lightTemplateId;
  } else if (isEntranceObj(obj)) {
    return constants.entryTemplateId;
  } else if (isExitObj(obj)) {
    return constants.exitTemplateId;
  } else if (isPickupObj(obj)) {
    return constants.pickupTemplateId;
  } else if (isMapObjFromTileset(obj)) {
    return obj.tsObjId;
  }
  return null;
}

/**
 * Add an object to the template index.
 */
export function addToTemplateIndex(
  index: Map<string, Set<string>>,
  obj: MapObj
): void {
  const templateId = getTemplateId(obj);
  if (templateId) {
    let objIds = index.get(templateId);
    if (!objIds) {
      objIds = new Set();
      index.set(templateId, objIds);
    }
    objIds.add(obj.id);
  }
}

/**
 * Remove an object from the template index.
 */
export function removeFromTemplateIndex(
  index: Map<string, Set<string>>,
  obj: MapObj
): void {
  const templateId = getTemplateId(obj);
  if (templateId) {
    const objIds = index.get(templateId);
    if (objIds) {
      objIds.delete(obj.id);
      if (objIds.size === 0) {
        index.delete(templateId);
      }
    }
  }
}

/**
 * Update the template index when an object's template changes.
 */
export function updateTemplateIndex(
  index: Map<string, Set<string>>,
  oldObj: MapObj,
  newObj: MapObj
): void {
  const oldTemplateId = getTemplateId(oldObj);
  const newTemplateId = getTemplateId(newObj);

  if (oldTemplateId !== newTemplateId) {
    // Remove from old template
    if (oldTemplateId) {
      const objIds = index.get(oldTemplateId);
      if (objIds) {
        objIds.delete(oldObj.id);
        if (objIds.size === 0) {
          index.delete(oldTemplateId);
        }
      }
    }
    // Add to new template
    if (newTemplateId) {
      let objIds = index.get(newTemplateId);
      if (!objIds) {
        objIds = new Set();
        index.set(newTemplateId, objIds);
      }
      objIds.add(newObj.id);
    }
  }
}

/**
 * Clear the entire template index.
 */
export function clearTemplateIndex(index: Map<string, Set<string>>): void {
  index.clear();
}
