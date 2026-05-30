import { log } from "@/log";
import { saveStory } from "@/persist/story/api";
import { slice as dialogueSlice } from "@/slices/dialogue";
import { setLoading, slice as storySlice } from "@/slices/story";
import { type RootState } from "@/store/store";
import { Dialogue } from "@/types/dialogue";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single story
const saveRequests$ = new Subject<{
  story: RootState["story"];
  dialogues: Dialogue[];
}>();

saveRequests$
  .pipe(
    debounceTime(500), // collapse rapid bursts of actions
    concatMap(({ story, dialogues }) =>
      from(
        saveStory({ nodes: story.nodes, edges: story.edges, dialogues }),
      ).pipe(
        tap(() => {
          log.info(
            "[autosave] Story saved (nodes: %d, edges: %d, dialogues: %d)",
            story.nodes.length,
            story.edges.length,
            dialogues.length,
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
  predicate: (action, _currentState, previousState) => {
    const isLoadingStory =
      action.type.startsWith("story/loadStory") ||
      previousState.story.loading ||
      action.type === setLoading.type;

    const isStorySlice =
      action.type.startsWith(storySlice.name) ||
      action.type.startsWith(dialogueSlice.name);

    return isStorySlice && !isLoadingStory;
  },
  effect: async (_action, { getState }) => {
    const state = getState();
    const dialogues = state.dialogue.dialogues.ids.map(
      (id) => state.dialogue.dialogues.entities[id],
    );
    saveRequests$.next({ story: state.story, dialogues });
  },
});

export default listenerMiddleware.middleware;
