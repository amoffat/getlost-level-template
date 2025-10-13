import { globals as gApp } from "@/globals";
import { store } from "@/store/store";
import { Mode } from "@/types/editors/collision";
import * as P from "pixi.js";
import { init as genericInit } from "../common/app";
import { actions, selectors } from "./state";

export async function init(): Promise<P.Application> {
  const editor = await genericInit<Mode>({
    containerId: "collision-editor",
    layers: ["main"],
    getMode: selectors.selectMode,
    pushMode: (mode: Mode) => store.dispatch(actions.pushMode(mode)),
    popMode: () => store.dispatch(actions.popMode()),
    setZoomPan: (zoomPan) => store.dispatch(actions.setZoomPan(zoomPan)),
    onRedraw: () => {},
    keyHandlers: {},
    reconciler: gApp.collisionEditorReconciler,
  });

  return editor.app;
}
