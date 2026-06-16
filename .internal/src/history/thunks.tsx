import type { AppDispatch, RootState } from "@/store/store";
import { notifications } from "@mantine/notifications";
import { UnknownAction } from "@reduxjs/toolkit";
import { IconArrowBackUp, IconArrowForward } from "@tabler/icons-react";
import i18n from "i18next";
import { actions, Transaction } from "./slice";

type Thunk<R = void> = (
  dispatch: AppDispatch,
  getState: () => RootState,
) => R;

/** Record an undoable transaction onto a channel's history. */
export function recordTransaction(scope: string, tx: Transaction): Thunk {
  return (dispatch) => {
    dispatch(actions.record({ scope, tx }));
  };
}

/**
 * Undo the most recent transaction on the given channel. Returns `true` if a
 * transaction was applied, `false` if the stack was empty.
 *
 * The stored inverse actions are normal slice actions, so re-dispatching them
 * drives the existing autosave + reconcile middleware — visuals revert and the
 * reverted state is eventually persisted, with no special coordination needed.
 */
export function undo(scope: string): Thunk<boolean> {
  return (dispatch, getState) => {
    const stack = getState().history.channels[scope]?.undoStack;
    if (!stack || stack.length === 0) return false;
    const tx = stack[stack.length - 1];
    for (const action of tx.undo) {
      dispatch(action as UnknownAction);
    }
    dispatch(actions._commitUndo({ scope }));
    notifications.show({
      message: i18n.t("undo"),
      color: "green",
      icon: <IconArrowBackUp size={14} />,
      autoClose: 1000,
    });
    return true;
  };
}

/**
 * Redo the most recently undone transaction on the given channel. Returns
 * `true` if a transaction was applied, `false` if the stack was empty.
 */
export function redo(scope: string): Thunk<boolean> {
  return (dispatch, getState) => {
    const stack = getState().history.channels[scope]?.redoStack;
    if (!stack || stack.length === 0) return false;
    const tx = stack[stack.length - 1];
    for (const action of tx.redo) {
      dispatch(action as UnknownAction);
    }
    dispatch(actions._commitRedo({ scope }));
    notifications.show({
      message: i18n.t("redo"),
      color: "green",
      icon: <IconArrowForward size={14} />,
      autoClose: 1000,
    });
    return true;
  };
}
