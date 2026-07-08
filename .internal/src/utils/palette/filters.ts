import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { RootState, store } from "@/store/store";
import { isAnimationTemplate } from "@/types/animation";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { TemplateObject } from "@/types/tilesetobject";

export function objectsFilter(
  obj: TemplateObject,
  filters: RootState["ui"]["paletteFilterSwitches"],
): boolean {
  if (!isTileGroupTemplate(obj)) {
    return false;
  }

  const state = store.getState();
  const tsId = state.tilesetEditor.objIdToTs[obj.id];
  const animations = tsSelectors.animations(state, tsId);

  if (filters.objects.hideAnimations) {
    for (const anim of animations) {
      for (const frame of anim.frames) {
        if (frame.tg.id === obj.id) {
          return false;
        }
      }
    }
  }

  const npcs = tsSelectors.npcs(state, tsId);
  if (filters.objects.hideNpcLeftovers) {
    for (const npc of npcs) {
      const npcTsId =
        state.tilesetEditor.objIdToTs[
          npc.animations["Idle"].animation.frames[0].tg.id
        ];
      if (npcTsId === tsId) {
        return false;
      }
    }
  }

  if (filters.objects.hideUnusedObjects) {
    // let used = false;
  }

  if (filters.objects.showOnlyTiles) {
    if (obj.coverage < 1.0) {
      return false;
    }
  }

  return true;
}

export function animationsFilter(
  obj: TemplateObject,
  filters: RootState["ui"]["paletteFilterSwitches"],
): boolean {
  if (!isAnimationTemplate(obj)) {
    return false;
  }

  const state = store.getState();
  const tsId = state.tilesetEditor.objIdToTs[obj.id];
  const npcs = tsSelectors.npcs(state, tsId);
  const objFrames = new Set();
  for (const frame of obj.frames) {
    objFrames.add(frame.tg.id);
  }

  if (filters.animations.hideNpcs) {
    for (const npc of npcs) {
      for (const anim of Object.values(npc.animations)) {
        for (const frame of anim.animation.frames) {
          if (objFrames.has(frame.tg.id)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}
