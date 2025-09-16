import { RootState, store } from "../store/store";

export function subscribeToSelector<T>(
  selector: (state: RootState) => T,
  onChange: (value: T, state: RootState) => void
) {
  let current = selector(store.getState());

  return store.subscribe(() => {
    const state = store.getState();
    const next = selector(state);
    if (next !== current) {
      // safe, because memoized selector only
      // returns a new ref on real changes
      current = next;
      onChange(next, state);
    }
  });
}
