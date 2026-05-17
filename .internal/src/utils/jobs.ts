import { fromEvent, map, Observable, take } from "rxjs";

export function jobProgress$(path: string) {
  return new Observable((subscriber) => {
    const source = new EventSource(path);

    const progressSub = fromEvent<MessageEvent>(source, "progress")
      .pipe(map((event) => JSON.parse(event.data)))
      .subscribe(subscriber);

    // When the server sends the terminal "done" event, complete the observable.
    // Completion triggers the teardown below, which closes the EventSource and
    // prevents the browser from auto-reconnecting.
    const doneSub = fromEvent<MessageEvent>(source, "done")
      .pipe(
        take(1),
        map((event) => JSON.parse(event.data)),
      )
      .subscribe({
        next(data) {
          subscriber.next(data);
          subscriber.complete();
        },
        complete: subscriber.complete,
        error: subscriber.error,
      });

    return () => {
      progressSub.unsubscribe();
      doneSub.unsubscribe();
      source.close();
    };
  });
}
