import type { SliceCaseReducers, SliceSelectors } from "@reduxjs/toolkit";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

export function createObjectsSlice<Objects extends { id: string }>(
  name: string
) {
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
  return slice;
}
