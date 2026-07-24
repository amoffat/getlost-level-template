import { actions as dialogueActions } from "@/slices/dialogue";
import { actions as mapActions } from "@/slices/mapEditor";
import { actions as tsActions } from "@/slices/tilesetEditor";
import type { RootState } from "@/store/store";
import { isPickupObj, isSpeakableObject, type MapObj } from "@/types/map";
import { isNpcTemplate } from "@/types/npc";
import { isTileGroupTemplate } from "@/types/tilegroup";
import type { UnknownAction } from "@reduxjs/toolkit";

/**
 * A single object that references locale entry ids, paired with how to null out
 * a subset of those references atomically.
 *
 * This is the ONE place that knows where locale keys live in the app. Both
 * directions of the relationship derive from it:
 * - which entries are *live* (autosave prunes anything not referenced), via
 *   {@link collectLiveKeys};
 * - clearing *dangling* references when an entry is deleted, via
 *   {@link clearLocaleReferences}.
 *
 * Add a new place that stores a locale key in exactly one spot — here — and both
 * the liveness scan and the delete-cleanup pick it up for free.
 */
export interface LocaleReferrer {
  /** All locale entry ids this owner currently references. */
  keys: string[];
  /**
   * An action that clears exactly the ids in `remove` from this owner. Only
   * called when at least one of `keys` is in `remove`, so it always produces a
   * meaningful patch.
   */
  clear: (remove: ReadonlySet<string>) => UnknownAction;
}

/**
 * Lazily walk the whole store, yielding every object that references locale
 * keys. This is a generator so callers can short-circuit and so we never
 * materialize one referrer object per store object up front.
 *
 * Each referrer reports only the keys it *directly* owns and can clear itself:
 * a map object's own `nameKey` override lives on the instance, while an
 * inherited name lives on the tileset template — which is enumerated as its own
 * referrer. The union of all reported keys therefore equals the old
 * `collectLiveKeys` result (which resolved instance-or-template values), but
 * every key is now paired with the exact place that can null it.
 */
export function* collectLocaleReferrers(
  state: RootState,
): Generator<LocaleReferrer> {
  // Dialogue nodes: speaker/listener name keys, content key, choice text keys.
  for (const dlgId of state.dialogue.dialogues.ids) {
    const dlg = state.dialogue.dialogues.entities[dlgId as string];
    if (!dlg) continue;
    const dialogueId = dlg.id;
    for (const nodeId of dlg.nodes.ids) {
      const node = dlg.nodes.entities[nodeId as string];
      if (!node) continue;
      const { speakerNameKey, listenerNameKey, contentKey, choices } =
        node.data;

      const keys: string[] = [];
      if (speakerNameKey) keys.push(speakerNameKey);
      if (listenerNameKey) keys.push(listenerNameKey);
      if (contentKey) keys.push(contentKey);
      for (const c of choices) if (c.textKey) keys.push(c.textKey);
      if (keys.length === 0) continue;

      const id = node.id;
      yield {
        keys,
        clear: (remove) => {
          const data: Partial<typeof node.data> = {};
          if (speakerNameKey && remove.has(speakerNameKey))
            data.speakerNameKey = null;
          if (listenerNameKey && remove.has(listenerNameKey))
            data.listenerNameKey = null;
          if (contentKey && remove.has(contentKey)) data.contentKey = null;
          if (choices.some((c) => c.textKey && remove.has(c.textKey))) {
            data.choices = choices.map((c) =>
              c.textKey && remove.has(c.textKey) ? { ...c, textKey: null } : c,
            );
          }
          return dialogueActions.updateNodeData({ dialogueId, id, data });
        },
      };
    }
  }

  // Map object instances: pickup name/description, speakable name (overrides).
  for (const objId of state.mapEditor.objects.ids) {
    const obj = state.mapEditor.objects.entities[objId as string];
    if (!obj) continue;

    let nameKey: string | null | undefined;
    let descriptionKey: string | null | undefined;
    if (isPickupObj(obj)) {
      nameKey = obj.nameKey;
      descriptionKey = obj.descriptionKey;
    } else if (isSpeakableObject(obj)) {
      nameKey = obj.nameKey;
    }

    const keys: string[] = [];
    if (nameKey) keys.push(nameKey);
    if (descriptionKey) keys.push(descriptionKey);
    if (keys.length === 0) continue;

    const id = obj.id;
    yield {
      keys,
      clear: (remove) => {
        const changes: Record<string, null> = {};
        if (nameKey && remove.has(nameKey)) changes.nameKey = null;
        if (descriptionKey && remove.has(descriptionKey))
          changes.descriptionKey = null;
        return mapActions.updateOne({ id, changes: changes as Partial<MapObj> });
      },
    };
  }

  // Tileset templates (NPCs, tile groups): the inherited name key.
  for (const ts of Object.values(state.tilesetEditor.tilesets)) {
    const tsId = ts.id;
    for (const tileId of ts.tiles.ids) {
      const obj = ts.tiles.entities[tileId as string];
      if (!obj) continue;
      if (!(isNpcTemplate(obj) || isTileGroupTemplate(obj))) continue;
      if (!obj.nameKey) continue;
      yield {
        keys: [obj.nameKey],
        clear: () =>
          tsActions.updateTilesetObject({
            obj,
            changes: { nameKey: null },
            tsId,
          }),
      };
    }
  }
}

/** All locale entry ids currently referenced by live objects. */
export function collectLiveKeys(state: RootState): Set<string> {
  const keys = new Set<string>();
  for (const ref of collectLocaleReferrers(state)) {
    for (const key of ref.keys) keys.add(key);
  }
  return keys;
}

/**
 * Actions that null out every reference to the given entry ids across the whole
 * store, so deleting those entries leaves nothing dangling. Lazy: yields one
 * action per affected referrer as the store is walked.
 */
export function* clearLocaleReferences(
  state: RootState,
  remove: ReadonlySet<string>,
): Generator<UnknownAction> {
  for (const ref of collectLocaleReferrers(state)) {
    if (ref.keys.some((key) => remove.has(key))) {
      yield ref.clear(remove);
    }
  }
}
