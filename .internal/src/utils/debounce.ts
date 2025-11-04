import { ObservableInput, Subject } from "rxjs";
import { concatMap, debounceTime, groupBy, mergeMap } from "rxjs/operators";

export function makeGroupedDebouncer(
  timeout = 200
): (key: string, fn: () => ObservableInput<any>) => void {
  const sub$ = new Subject<[string, () => ObservableInput<any>]>();

  sub$
    .pipe(
      // group per key
      groupBy(([, key]) => key),
      // for each group, debounce events and call the function sequently
      mergeMap((group$) =>
        group$.pipe(
          debounceTime(timeout),
          concatMap(([_, fn]) => fn())
        )
      )
    )
    .subscribe();

  const push = (key: string, fn: () => ObservableInput<any>) => {
    sub$.next([key, fn]);
  };

  return push;
}
