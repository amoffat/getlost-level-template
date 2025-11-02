import { ObservableInput, Subject } from "rxjs";
import { concatMap, debounceTime, groupBy, mergeMap } from "rxjs/operators";

export function makeGroupedDebouncer<T>({
  getKey,
  fn,
  timeout = 200,
}: {
  getKey: (obj: T) => string;
  fn: (obj: T) => ObservableInput<any>;
  timeout?: number;
}): (obj: T) => void {
  const saveRequests$ = new Subject<T>();

  saveRequests$
    .pipe(
      // group per key
      groupBy(getKey),
      // for each group, debounce events and call the function sequently
      mergeMap((group$) => group$.pipe(debounceTime(timeout), concatMap(fn)))
    )
    .subscribe();

  const push = (obj: T) => {
    saveRequests$.next(obj);
  };

  return push;
}
