import { log } from "@/log";
import { saveStory } from "@/persist/story/api";
import { slice as dialogueSlice } from "@/slices/dialogue";
import { slice as storySlice } from "@/slices/story";
import type { Dialogue } from "@/types/dialogue";
import { type RootState } from "@/store/store";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single story
const saveRequests$ = new Subject<{ story: RootState["story"]; dialogues: Dialogue[] }>();

saveRequests$
  .pipe(
    debounceTime(500), // collapse rapid bursts of actions
    concatMap(({ story, dialogues }) =>
      from(saveStory(story.nodes, story.edges, dialogues)).pipe(
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
  predicate: (action) =>
    action.type.startsWith(storySlice.name) ||
    action.type.startsWith(dialogueSlice.name),
  effect: async (_action, { getState }) => {
    const state = getState();
    const dialogues = state.dialogue.dialogues.ids
      .map((id) => state.dialogue.dialogues.entities[id])
      .filter((d): d is Dialogue => d !== undefined);
    saveRequests$.next({ story: state.story, dialogues });
  },
});

export default listenerMiddleware.middleware;
