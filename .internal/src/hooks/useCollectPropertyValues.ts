import { collectPropertyValues } from "@/store/selectors";
import type { RootState } from "@/store/store";
import { ExtractProps, MapObj } from "@/types/map";
import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useAppSelector } from "./redux";

/**
 * Memoized wrapper around collectPropertyValues.
 *
 * A plain inline useAppSelector call with collectPropertyValues always returns
 * a new object reference, triggering Redux's dev-mode "selector returned
 * different result" warning and causing unnecessary rerenders. Wrapping with
 * createSelector + useMemo makes the result stable when state and objs are
 * unchanged.
 */
export function useCollectPropertyValues<
  TInstance extends MapObj,
  K extends keyof (ExtractProps<TInstance> & TInstance),
>(objs: TInstance[], propertyNames: readonly K[]) {
  const selector = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state],
        (state) => collectPropertyValues(state, objs, propertyNames as K[]),
      ),
    // propertyNames is always a module-level const so it won't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objs],
  );
  return useAppSelector(selector);
}
