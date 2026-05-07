import { RootState, store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { subState } from "@/utils/redux";
import { globals as g } from "./globals";

function setLayerVisibility(layers: RootState["mapEditor"]["layers"]) {
  const lc = g.layerContainers;
  for (const [key, container] of Object.entries(lc)) {
    const layerName = Number(key) as MapLayerName;
    const isHidden = layers.hiddenLayers.includes(layerName);
    container.visible = !isHidden;
    container.alpha = 1;
    container.eventMode = isHidden ? "none" : "static";
  }
}

export function initLayerVisibility() {
  const state = store.getState();
  setLayerVisibility(state.mapEditor.layers);
}

subState([(state: RootState) => state.mapEditor.layers], (layers, _state) => {
  setLayerVisibility(layers);
});
