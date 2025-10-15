import type {
  CaseReducerActions,
  EntitySelectors,
  EntityState,
  Reducer,
  SliceCaseReducers,
  SliceSelectors,
} from "@reduxjs/toolkit";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

type State<Objects> = EntityState<Objects, string>;

export function createObjectsState<Objects extends { id: string }>(
  name: string
): {
  reducer: Reducer<State<Objects>>;
  selectors: EntitySelectors<Objects, any, string>;
  actions: CaseReducerActions<SliceCaseReducers<State<Objects>>, string>;
} {
  const objects = createEntityAdapter<Objects>({
    sortComparer: (a, b) => {
      return a.id.localeCompare(b.id);
    },
  });

  const initialState = objects.getInitialState();
  type EntityState = typeof initialState;

  const slice = createSlice<
    EntityState,
    SliceCaseReducers<EntityState>,
    string,
    SliceSelectors<EntityState>
  >({
    name,
    initialState,
    reducers: {
      addOne: objects.addOne,
      addMany: objects.addMany,
      upsertMany: objects.upsertMany,
      updateOne: objects.updateOne,
      updateMany: objects.updateMany,
      removeOne: objects.removeOne,
      removeMany: objects.removeMany,
      setAll: objects.setAll,
    } as SliceCaseReducers<EntityState>,
  });

  const selectors = objects.getSelectors<{
    [name]: ReturnType<typeof slice.getInitialState>;
  }>((s) => s[name]);

  return {
    reducer: slice.reducer,
    selectors,
    actions: slice.actions,
  };
}
