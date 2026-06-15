import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * A plain, serializable Redux action stored inside a transaction. Undo/redo
 * simply re-dispatch these, so they MUST be normal slice actions (e.g.
 * `mapEditor/updateMany`) — not thunks. Because they carry the same
 * `meta.reconcileType` as the original edit, the existing autosave and
 * editor-sync middleware react to them automatically.
 */
export type UndoableAction = {
  type: string;
  payload?: unknown;
  meta?: unknown;
};

/**
 * A single undoable unit of work. `undo` reverses the change and `redo`
 * re-applies it; each is an ordered list of actions to dispatch.
 */
export type Transaction = {
  label: string;
  undo: UndoableAction[];
  redo: UndoableAction[];
};

type Channel = {
  undoStack: Transaction[];
  redoStack: Transaction[];
};

interface HistoryState {
  // History is scoped into independent channels (one per editor, e.g. "map"),
  // so undoing in one editor never touches another.
  channels: Record<string, Channel>;
}

/** Cap per-channel undo depth to bound memory. */
const MAX_DEPTH = 100;

const initialState: HistoryState = {
  channels: {},
};

const emptyChannel = (): Channel => ({ undoStack: [], redoStack: [] });

const getChannel = (state: HistoryState, scope: string): Channel => {
  let ch = state.channels[scope];
  if (!ch) {
    ch = emptyChannel();
    state.channels[scope] = ch;
  }
  return ch;
};

export const slice = createSlice({
  name: "history",
  initialState,
  reducers: {
    record(state, action: PayloadAction<{ scope: string; tx: Transaction }>) {
      const { scope, tx } = action.payload;
      const ch = getChannel(state, scope);
      ch.undoStack.push(tx);
      // A fresh edit invalidates any redo timeline.
      ch.redoStack = [];
      if (ch.undoStack.length > MAX_DEPTH) {
        ch.undoStack.splice(0, ch.undoStack.length - MAX_DEPTH);
      }
    },
    // Internal: move the top undo transaction onto the redo stack. The thunk
    // dispatches the inverse actions; this reducer only shuffles the stacks.
    _commitUndo(state, action: PayloadAction<{ scope: string }>) {
      const ch = getChannel(state, action.payload.scope);
      const tx = ch.undoStack.pop();
      if (tx) ch.redoStack.push(tx);
    },
    _commitRedo(state, action: PayloadAction<{ scope: string }>) {
      const ch = getChannel(state, action.payload.scope);
      const tx = ch.redoStack.pop();
      if (tx) ch.undoStack.push(tx);
    },
    clearScope(state, action: PayloadAction<{ scope: string }>) {
      state.channels[action.payload.scope] = emptyChannel();
    },
  },
});

export const actions = slice.actions;

// Selectors are parameterized by scope, so they're plain functions over the
// root state rather than RTK slice selectors.
type HasHistory = { history: HistoryState };

export const canUndo = (state: HasHistory, scope: string): boolean =>
  (state.history.channels[scope]?.undoStack.length ?? 0) > 0;

export const canRedo = (state: HasHistory, scope: string): boolean =>
  (state.history.channels[scope]?.redoStack.length ?? 0) > 0;

export const peekUndoLabel = (
  state: HasHistory,
  scope: string,
): string | undefined => {
  const stack = state.history.channels[scope]?.undoStack;
  return stack && stack.length > 0 ? stack[stack.length - 1].label : undefined;
};
