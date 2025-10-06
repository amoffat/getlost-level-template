import { RootState, store } from "@/store/store";
import { subscribeToSelector } from "../../utils/redux";
import { globals as g } from "./globals";

function setLayerVisibility(layers: RootState["mapEditor"]["layers"]) {
  const lc = g.layerContainers;
  if (layers.dimInactive) {
    for (const layer of Object.values(lc)) {
      layer.alpha = 0.5;
      layer.eventMode = "none";
    }
    const active = lc[layers.active];
    active.alpha = 1;
    active.interactive = true;
  } else {
    for (const layer of Object.values(lc)) {
      layer.alpha = 1;
      layer.interactive = true;
    }
  }
}

export function initLayerVisibility() {
  const state = store.getState();
  setLayerVisibility(state.mapEditor.layers);
}

subscribeToSelector(
  [(state: RootState) => state.mapEditor.layers],
  (layers, _state) => {
    setLayerVisibility(layers);
  }
);
