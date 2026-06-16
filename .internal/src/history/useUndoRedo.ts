import { useAppDispatch } from "@/hooks/redux";
import { trackKeyPresses } from "@/utils/keypress";
import { useEffect } from "react";
import { redo, undo } from "./thunks";

/**
 * Wire Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo) to a history channel for
 * as long as the calling component is mounted.
 *
 * Handlers are registered on `window` via the shared `trackKeyPresses` helper
 * (with `ignoreEditableTargets`, so typing in inputs is never hijacked). We use
 * window rather than a scoped element because deleting a focused node moves
 * focus back to `document.body`, which would otherwise miss container-scoped
 * key events. Only the active editor tab is mounted, so there is no cross-tab
 * conflict.
 *
 * `onApplied` runs only when a transaction was actually applied (the stack was
 * non-empty). Editors whose view is not driven by Redux (e.g. an uncontrolled
 * ReactFlow canvas) use it to re-sync the view from the restored Redux state.
 */
export function useUndoRedo(
  scope: string,
  onApplied?: (kind: "undo" | "redo") => void,
): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleUndo = (pressed: boolean) => {
      if (pressed && dispatch(undo(scope))) onApplied?.("undo");
    };
    const handleRedo = (pressed: boolean) => {
      if (pressed && dispatch(redo(scope))) onApplied?.("redo");
    };

    return trackKeyPresses({
      element: window,
      ignoreEditableTargets: true,
      handlers: {
        "Control-Z": handleUndo,
        "Meta-Z": handleUndo,
        "Control-Shift-Z": handleRedo,
        "Meta-Shift-Z": handleRedo,
      },
    });
  }, [scope, onApplied, dispatch]);
}
