import * as constants from "@/constants";
import { Tool } from "@/editors/common/tooldispatch";
import { globals as gApp } from "@/globals";
import { selectors, actions as tsActions } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { addPaletteObjectsThunk } from "@/thunks/tileset";
import { snap } from "@/types/rect";
import { SpatialIndex } from "@/types/spatial";
import { TemplateType } from "@/types/templates";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { averageOklab } from "@/utils/color";
import { oklabHilbertIndex } from "@/utils/hilbert";
import { amountOpaquePixels, subImageData } from "@/utils/image";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import { genImageId } from "@/utils/tileset";
import { Vector2 } from "@/vec";
import { notifications } from "@mantine/notifications";
import * as P from "pixi.js";
import {
  ClickDragger,
  ClickDragListener,
  PointerEventData,
} from "../../common/drag";
import { groupStroke } from "../../common/strokes";
import { globals as g } from "../globals";
import { rectsForTemplate } from "../occurrences";
import { shouldOutline } from "../utils/outline";

function getGridSize(): Vector2 {
  const state = store.getState();
  const ts = selectors.activeTileset(state);
  if (!ts || ts.composite) {
    return { x: 1, y: 1 };
  }
  return { ...state.tilesetEditor.grid.size };
}

class Grouper extends ClickDragListener<Mode> implements Tool {
  private _spatialIndex: SpatialIndex<TemplateObject>;

  constructor(spatialIndex: SpatialIndex<TemplateObject>) {
    super((state) => selectors.selectMode(state));
    this._spatialIndex = spatialIndex;
  }

  protected override get providedModes(): Set<Mode> {
    return new Set(["add-group", "delete-group", "replace-group"]);
  }

  public override pointerDown(_e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    if (!state.tilesetEditor.activeTilesetId) return false;
    const mode = state.tilesetEditor.selectedTool;
    if (mode === "add-group") {
      store.dispatch(tsActions.setMode("add-group"));
    } else if (mode === "delete-group") {
      store.dispatch(tsActions.setMode("delete-group"));
    } else if (mode === "replace-group") {
      store.dispatch(tsActions.setMode("replace-group"));
    }
    return true;
  }

  override pointerUp(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    const state = store.getState();
    const tsState = state.tilesetEditor;
    const mode = selectors.selectMode(state);

    const coords = snap(e.hitbox, getGridSize());
    const isAdd = mode === "add-group" || mode === "replace-group";
    const isDelete = mode === "delete-group" || mode === "replace-group";

    let finishMode = false;
    if (isDelete) {
      const searchBounds = rectToBBox(coords, 1);
      const hitIds = this._spatialIndex.search(searchBounds).map((h) => h.id);

      store.dispatch(
        tsActions.deletePaletteObjects({
          ids: hitIds,
          tsId: tsState.activeTilesetId!,
        }),
      );
      finishMode = true;
    }

    if (isAdd) {
      const tsId = tsState.activeTilesetId!;
      const gridSize = tsState.grid.size;
      const tileGridSize: Vector2 = { x: gridSize.x, y: gridSize.y };

      // The tile group id is a hash of the image data for it. This way a tile
      // can appear anywhere in any tileset, which makes it easier to fix maps
      // if a tileset gets deleted or renamed.
      const tsImageData = gApp.tilesetImageDataCache.get(tsId)!;
      let imgData: ImageData | undefined;
      try {
        imgData = subImageData(tsImageData, coords);
      } catch {
        notifications.show({
          title: "Grouping error",
          message: "The selected area must only contain tiles.",
          color: "red",
        });
        finishMode = true;
      }

      if (imgData) {
        const coverage = amountOpaquePixels(imgData);
        (async () => {
          const id = genImageId(imgData);
          const avgColor = averageOklab(imgData);

          // One for the beginning and one for the end of the tile group
          // First point at far left (x=0), last point at far right (x=1)
          const zIndices: Vector2[] = structuredClone(
            constants.defaultZIndices,
          );

          const group: TileGroupTemplate = {
            id,
            type: TemplateType.TileGroup,
            pos: coords,
            gridSize: tileGridSize,
            zIndices,
            nameKey: null,
            talkable: false,
            tags: [],
            pinned: true,
            coverage,
            avgColor,
            hilbertIndex: oklabHilbertIndex(avgColor),
            walkSound: constants.defaultWalkSound,
            friction: constants.defaultFriction,
            traction: constants.defaultTraction,
            hidden: false,
            flipX: false,
            tint: null,
            groundOffset: 0,
            speakerImageId: null,
            collisions: {
              mask: null,
              shapes: [],
              simplify: 1.0,
            },
          };
          store.dispatch(addPaletteObjectsThunk({ tsId, objs: [group] }));
        })();
        finishMode = true;
      }
    }

    if (finishMode) {
      g.groupSelGraphics.visible = false;
      g.groupSelContainer.setSize(0);
    }
    return true;
  }

  public override pointerDrag(e: PointerEventData): boolean {
    if (!this.modeMatches()) return false;

    g.groupSelGraphics.visible = true;
    const c = g.groupSelContainer;

    const hb = snap(e.hitbox, getGridSize());
    c.position.set(hb.x, hb.y);
    c.width = hb.width;
    c.height = hb.height;
    return true;
  }

  public override getCursor(_e: P.FederatedPointerEvent): string | null {
    return "crosshair";
  }
}

export function setupGrouper({
  cd,
  spatialIndex,
}: {
  cd: ClickDragger<Mode>;
  spatialIndex: SpatialIndex<TemplateObject>;
}) {
  cd.addListener(new Grouper(spatialIndex));
}

function drawGroups(groups: TileGroupTemplate[], zoom: number) {
  if (!g.allGroupsOverlay) return;

  g.allGroupsOverlay.removeChildren();
  const gfx = new P.Graphics();
  const mask = new P.Graphics();
  g.allGroupsOverlay.addChild(mask);
  g.allGroupsOverlay.setMask({
    mask,
  });

  const stroke = { ...groupStroke, width: (groupStroke.width ?? 1) / zoom };

  for (const group of groups.filter(shouldOutline)) {
    // Outline every sheet position of this template, not just its canonical
    // `pos`, so identical tiles all get an overlay (see occurrences.ts).
    for (const rect of rectsForTemplate(group)) {
      gfx.rect(rect.x, rect.y, rect.width, rect.height).stroke(stroke);
      mask
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: 0x000000, alpha: 1 });
    }
  }
  g.allGroupsOverlay.addChild(gfx);
}

subState(
  [
    selectors.activeTilesetGroups,
    (state) => state.tilesetEditor.activeZoomPan.zoom,
  ],
  (groups, zoom) => {
    if (!groups) return;
    drawGroups(groups, zoom);
  },
);
