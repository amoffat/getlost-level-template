import { mapSelectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { isBackgroundImageObj } from "@/types/map";
import * as P from "pixi.js";
import { globals as g } from "./globals";

/**
 * Registers a Pixi ticker that visually shifts background image containers
 * each frame to preview their parallax effect in the editor.
 *
 * The stored (x, y) position in Redux state is never mutated — only the
 * Pixi container's position is adjusted.
 *
 * Formula (per image, per frame):
 *   cameraWorldCenter = (screenCenter - mapContainer.position) / scale
 *   imageCenter       = (obj.x + obj.width/2, obj.y + obj.height/2)
 *   parallaxShift     = (cameraWorldCenter - imageCenter) * (1 - parallax)
 *   visualPosition    = obj.storedPosition + parallaxShift
 */
export function setupParallaxTicker(app: P.Application): void {
  app.ticker.add(() => {
    const backgroundLayer = g.layerContainers[MapLayerName.Background];
    if (!backgroundLayer) return;

    const state = store.getState();
    const scale = g.mapContainer.scale.x;
    const screenCenterX = app.screen.width / 2;
    const screenCenterY = app.screen.height / 2;

    // World-space position that is currently at the center of the screen.
    const cameraWorldX = (screenCenterX - g.mapContainer.position.x) / scale;
    const cameraWorldY = (screenCenterY - g.mapContainer.position.y) / scale;

    for (const child of backgroundLayer.children) {
      const obj = mapSelectors.selectById(state.mapEditor.objects, child.label);
      if (!obj || !isBackgroundImageObj(obj)) continue;

      const imageCenterX = obj.x + obj.width / 2;
      const imageCenterY = obj.y + obj.height / 2;

      // How far the camera center is from the image's own center.
      const camOffsetX = cameraWorldX - imageCenterX;
      const camOffsetY = cameraWorldY - imageCenterY;

      // A parallax of 1 means no shift (moves with the world at full speed).
      // A parallax of 0 means the image stays fixed relative to the camera.
      child.position.x = obj.x + camOffsetX * (1 - obj.parallax.x);
      child.position.y = obj.y + camOffsetY * (1 - obj.parallax.y);
    }
  });
}
