import { RootState, store } from "../store";

export function subscribeToSelector<T>(
  selector: (state: RootState) => T,
  onChange: (value: T) => void
) {
  let current = selector(store.getState());

  return store.subscribe(() => {
    const next = selector(store.getState());
    if (next !== current) {
      // safe, because memoized selector only
      // returns a new ref on real changes
      current = next;
      onChange(next);
    }
  });
}
