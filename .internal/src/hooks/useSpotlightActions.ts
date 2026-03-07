import { SpotlightActionData } from "@mantine/spotlight";
import { useEffect, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
const actionSources = new Map<string, SpotlightActionData[]>();
let snapshot: SpotlightActionData[] = [];

function rebuildSnapshot() {
  const all: SpotlightActionData[] = [];
  for (const actions of actionSources.values()) {
    all.push(...actions);
  }
  all.sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  snapshot = all;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

/**
 * Register spotlight actions from any component. Actions are keyed by a
 * unique `sourceId` so each call-site owns its own set. When the component
 * unmounts **or `enabled` becomes `false`** the actions are removed from the
 * store.
 *
 * ```ts
 * useSpotlightActions("map-editor", mapActions, activeTab === "map-editor");
 * ```
 *
 * @param sourceId  Unique key for this set of actions.
 * @param actions   The actions to register.
 * @param enabled   Whether the actions are currently active (default `true`).
 */
export function useSpotlightActions(
  sourceId: string,
  actions: SpotlightActionData[],
  enabled = true,
) {
  useEffect(() => {
    if (enabled) {
      actionSources.set(sourceId, actions);
    } else {
      actionSources.delete(sourceId);
    }
    rebuildSnapshot();
    return () => {
      actionSources.delete(sourceId);
      rebuildSnapshot();
    };
  }, [sourceId, actions, enabled]);
}

/**
 * Read the current merged list of spotlight actions. Used by the Spotlight
 * component itself.
 */
export function useSpotlightActionsStore(): SpotlightActionData[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
