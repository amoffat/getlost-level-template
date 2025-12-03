import { ClickDragger } from "@/editors/common/drag";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import { subState } from "@/utils/redux";
import * as P from "pixi.js";
import { globals as g } from "../globals";

function clearZIndices() {
  g.zIndexOverlay.removeChildren();
}

function drawZIndices(objs: TilesetObjectTemplate[]) {
  clearZIndices();

  for (const obj of objs) {
    if (!isTileGroupTemplate(obj)) continue;

    // Draw connecting lines
    const lineGfx = new P.Graphics();
    obj.zIndices.forEach((zIndex, idx) => {
      const x = idx * obj.gridSize.x;
      const y = zIndex;
      if (idx === 0) {
        lineGfx.moveTo(x, y);
      } else {
        lineGfx.lineTo(x, y).stroke({
          color: 0xff0000,
          width: 1,
        });
      }
    });
    lineGfx.position.set(obj.pos.x, obj.pos.y);
    g.zIndexOverlay.addChild(lineGfx);

    // Draw each circle as a separate interactive Graphics element
    obj.zIndices.forEach((zIndex, idx) => {
      const x = idx * obj.gridSize.x;
      const y = zIndex;

      const circleGfx = new P.Graphics();
      circleGfx.circle(0, 0, 2).fill(0xff0000);
      circleGfx.position.set(obj.pos.x + x, obj.pos.y + y);
      circleGfx.eventMode = "static";
      circleGfx.cursor = "pointer";
      // Define an explicit hit area (larger than the visual circle for easier interaction)
      circleGfx.hitArea = new P.Circle(0, 0, 5);

      circleGfx.on("pointerover", () => {
        circleGfx.clear();
        circleGfx.circle(0, 0, 3).fill(0xff6666);
      });

      circleGfx.on("pointerout", () => {
        circleGfx.clear();
        circleGfx.circle(0, 0, 2).fill(0xff0000);
      });

      g.zIndexOverlay.addChild(circleGfx);
    });
  }
}

export function setupZIndexer({ cd }: { cd: ClickDragger }) {
  //   cd.addListener(new Selector(spatialIndex));
}

subState(
  [
    (state) => state.tilesetEditor.selectedTiles,
    (state) => state.tilesetEditor.selectedTool,
  ],
  (selectedObjs, selectedTool) => {
    if (selectedTool !== "z-index") {
      clearZIndices();
      return;
    }
    const objs = selectedObjs.ids.map((id) => selectedObjs.entities[id]);
    drawZIndices(objs);
  }
);
