import { RootState, store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { subState } from "@/utils/redux";
import { globals as g } from "./globals";

function setLayerVisibility(layers: RootState["mapEditor"]["layers"]) {
  const lc = g.layerContainers;
  if (layers.dimInactive) {
    for (const layer of Object.values(lc)) {
      layer.alpha = 0.3;
      layer.eventMode = "none";
    }
    const active = lc[layers.active as MapLayerName];
    active.alpha = 1;
    active.eventMode = "static";
  } else {
    for (const layer of Object.values(lc)) {
      layer.alpha = 1;
      layer.eventMode = "static";
    }
  }
}

export function initLayerVisibility() {
  const state = store.getState();
  setLayerVisibility(state.mapEditor.layers);
}

subState([(state: RootState) => state.mapEditor.layers], (layers, _state) => {
  setLayerVisibility(layers);
});
