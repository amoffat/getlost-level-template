import { log } from "@/log";
import { saveStory } from "@/persist/story/api";
import { slice } from "@/slices/story";
import { type RootState } from "@/store/store";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single story
const saveRequests$ = new Subject<{ story: RootState["story"] }>();

saveRequests$
  .pipe(
    debounceTime(500), // collapse rapid bursts of actions
    concatMap(({ story }) =>
      from(saveStory(story.nodes, story.edges)).pipe(
        tap(() => {
          log.info(
            "[autosave] Story saved (nodes: %d, edges: %d)",
            story.nodes.length,
            story.edges.length,
          );
        }),
        catchError((e) => {
          log.error({ e }, "Story autosave failed");
          return EMPTY;
        }),
      ),
    ),
  )
  .subscribe();

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  predicate: (action) => action.type.startsWith(slice.name),
  effect: async (_action, { getState }) => {
    const state = getState();
    saveRequests$.next({ story: state.story });
  },
});

export default listenerMiddleware.middleware;
