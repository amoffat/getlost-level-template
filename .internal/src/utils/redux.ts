import { RootState, store } from "../store/store";

/**
 * Subscribe to one or more selectors and invoke a callback whenever any
 * of the selected values changes (reference equality check per value).
 *
 * Usage:
 *   subState([selA], (a, state) => { ... })
 *   subState([selA, selB], (a, b, state) => { ... })
 *   subState([selA, selB, selC], (a, b, c, state) => { ... })
 */
export function subState<T extends any[]>(
  selectors: { [K in keyof T]: (state: RootState) => T[K] },
  onChange: (...values: [...T, RootState]) => void
): () => void {
  if (!selectors.length) {
    throw new Error("subState requires at least one selector");
  }

  const getValues = (state: RootState) => selectors.map((s) => s(state));
  let currentValues = getValues(store.getState());

  return store.subscribe(() => {
    const state = store.getState();
    const nextValues = getValues(state);
    let changed = false;
    for (let i = 0; i < nextValues.length; i++) {
      if (nextValues[i] !== currentValues[i]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      currentValues = nextValues;
      onChange(...(nextValues as unknown as T), state);
    }
  });
}
